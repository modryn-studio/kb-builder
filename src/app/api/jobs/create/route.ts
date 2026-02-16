import { NextRequest, NextResponse } from "next/server";
import { createJob, checkJobRateLimit, getQueuePosition } from "@/lib/db";
import { getLatestManual } from "@/lib/storage";
import { sanitizeToolName, sanitizeSlug, isValidSlug } from "@/lib/utils";
import { isValidSessionId } from "@/lib/session";
import { validateToolName } from "@/lib/validate-tool";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTool = body?.tool;
    const sessionId = body?.sessionId;
    const forceRefresh = body?.forceRefresh ?? false;

    // ── Validate inputs ──
    if (!rawTool || typeof rawTool !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'tool' field" },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== "string" || !isValidSessionId(sessionId)) {
      return NextResponse.json(
        { error: "Valid session ID is required" },
        { status: 400 }
      );
    }

    // ── Check server API key ──
    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: "Service unavailable — API key not configured" },
        { status: 503 }
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

    // ── Pre-validate tool name (cheap sonar call ~$0.001) ──
    const validation = await validateToolName(toolName);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: `"${toolName}" doesn't appear to be a recognized software tool or website.`,
          code: "INVALID_TOOL",
          reason: validation.reason,
        },
        { status: 422 }
      );
    }

    // Use the normalized name if the validator improved it
    const finalToolName = validation.normalizedName || toolName;
    const finalSlug = sanitizeSlug(finalToolName);
    const effectiveSlug = isValidSlug(finalSlug) ? finalSlug : slug;

    // ── Rate limit ──
    const { allowed, retryAfterMs } = await checkJobRateLimit(sessionId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 jobs per minute.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60000) / 1000)) },
        }
      );
    }

    // ── Check cache (30 days) ──
    if (!forceRefresh) {
      const cached = await getLatestManual(effectiveSlug);
      if (cached) {
        const generatedAt = new Date(cached.generatedAt).getTime();
        const age = Date.now() - generatedAt;
        if (age < 30 * 24 * 60 * 60 * 1000) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          return NextResponse.json({
            cached: true,
            id: "cached",
            tool: finalToolName,
            slug: effectiveSlug,
            status: "completed",
            shareableUrl: `${baseUrl}/manual/${effectiveSlug}`,
            summary: {
              features: cached.features.length,
              shortcuts: cached.shortcuts.length,
              workflows: cached.workflows.length,
              tips: cached.tips.length,
              commonMistakes: cached.commonMistakes.length,
            },
            totalCost: cached.cost.total,
            generationTimeMs: cached.generationTimeMs,
          });
        }
      }
    }

    // ── Create job ──
    const job = await createJob({
      toolName: finalToolName,
      slug: effectiveSlug,
      sessionId,
    });

    const position = await getQueuePosition(job.id);

    // ── Fire-and-forget: trigger processing with retry ──
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const processUrl = `${baseUrl}/api/jobs/${job.id}/process`;

    const triggerProcessing = async (attempt = 1): Promise<void> => {
      let timeout: NodeJS.Timeout | undefined;
      let response: Response | null = null;
      let fetchError: unknown = null;

      try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        response = await fetch(processUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": process.env.CRON_SECRET || "dev-secret",
          },
          signal: controller.signal,
        });
      } catch (err) {
        fetchError = err;
      } finally {
        // Ensure timeout is always cleared
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
      }

      // Handle fetch error (network, timeout, etc.)
      if (fetchError) {
        // AbortError = timeout, which is expected for long-running jobs
        // The job is already processing, so no need to retry
        if ((fetchError as Error).name === "AbortError") {
          console.log(`Job ${job.id} trigger timed out (expected for long jobs)`);
          return;
        }

        // Retry on real network errors
        if (attempt < 3) {
          console.warn(`Job ${job.id} trigger error (attempt ${attempt}), retrying...`, fetchError);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          return triggerProcessing(attempt + 1);
        }
        console.error(`Job ${job.id} trigger failed after ${attempt} attempts:`, fetchError);
        return;
      }

      // Handle non-ok response
      if (response && !response.ok) {
        if (attempt < 3) {
          console.warn(`Job ${job.id} trigger failed (attempt ${attempt}), retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          return triggerProcessing(attempt + 1);
        }
        console.error(`Job ${job.id} trigger failed after ${attempt} attempts`);
      }
    };

    // Fire-and-forget with retry
    triggerProcessing().catch((err) => {
      console.error(`Unexpected error triggering job ${job.id}:`, err);
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
