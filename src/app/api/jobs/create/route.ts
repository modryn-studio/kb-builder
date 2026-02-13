import { NextRequest, NextResponse } from "next/server";
import { createJob, checkJobRateLimit, getQueuePosition } from "@/lib/db";
import { getLatestManual } from "@/lib/storage";
import { sanitizeToolName, sanitizeSlug, isValidSlug } from "@/lib/utils";
import { isValidSessionId } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTool = body?.tool;
    const userApiKey = body?.apiKey;
    const sessionId = body?.sessionId;
    const forceRefresh = body?.forceRefresh ?? false;

    // ── Validate inputs ──
    if (!rawTool || typeof rawTool !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'tool' field" },
        { status: 400 }
      );
    }

    if (!userApiKey || typeof userApiKey !== "string" || !userApiKey.trim()) {
      return NextResponse.json(
        { error: "Perplexity API key is required" },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== "string" || !isValidSessionId(sessionId)) {
      return NextResponse.json(
        { error: "Valid session ID is required" },
        { status: 400 }
      );
    }

    const toolName = sanitizeToolName(rawTool);
    if (toolName.length === 0) {
      return NextResponse.json(
        { error: "Tool name is empty after sanitization" },
        { status: 400 }
      );
    }

    const slug = sanitizeSlug(toolName);
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from tool name" },
        { status: 400 }
      );
    }

    // ── Rate limit ──
    const { allowed, retryAfterMs } = checkJobRateLimit(sessionId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 jobs per minute.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60000) / 1000)) },
        }
      );
    }

    // ── Check cache (24h) ──
    if (!forceRefresh) {
      const cached = await getLatestManual(slug);
      if (cached) {
        const generatedAt = new Date(cached.generatedAt).getTime();
        const age = Date.now() - generatedAt;
        if (age < 24 * 60 * 60 * 1000) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          return NextResponse.json({
            cached: true,
            id: "cached",
            tool: toolName,
            slug,
            status: "completed",
            shareableUrl: `${baseUrl}/manual/${slug}`,
            summary: {
              features: cached.features.length,
              shortcuts: cached.shortcuts.length,
              workflows: cached.workflows.length,
              tips: cached.tips.length,
              commonMistakes: cached.commonMistakes.length,
              coverageScore: cached.coverageScore,
            },
            totalCost: cached.cost.total,
            generationTimeMs: cached.generationTimeMs,
          });
        }
      }
    }

    // ── Create job ──
    const job = createJob({
      toolName,
      slug,
      sessionId,
      apiKey: userApiKey.trim(),
    });

    const position = getQueuePosition(job.id);

    // ── Fire-and-forget: trigger processing ──
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const processUrl = `${baseUrl}/api/jobs/${job.id}/process`;

    // Use fetch with no await = fire-and-forget
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET || "dev-secret",
      },
    }).catch((err) => {
      console.error(`Failed to trigger job processing for ${job.id}:`, err);
    });

    return NextResponse.json(
      {
        id: job.id,
        tool: job.toolName,
        slug: job.slug,
        status: job.status,
        createdAt: job.createdAt,
        position,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
