import { NextRequest, NextResponse } from "next/server";
import { createJob, checkJobRateLimit, getQueuePosition, findExistingJob } from "@/lib/db";
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

    // ── Check for existing queued/processing job (deduplication) ──
    const existingJob = await findExistingJob(effectiveSlug);
    if (existingJob) {
      console.log(`[JOB] Returning existing job ${existingJob.id} for ${finalToolName} (status: ${existingJob.status})`);
      const position = await getQueuePosition(existingJob.id);
      return NextResponse.json({
        id: existingJob.id,
        tool: existingJob.toolName,
        slug: existingJob.slug,
        status: existingJob.status,
        createdAt: existingJob.createdAt,
        position,
        deduplicated: true,
      });
    }

    // ── Create job ──
    const job = await createJob({
      toolName: finalToolName,
      slug: effectiveSlug,
      sessionId,
    });

    const position = await getQueuePosition(job.id);

    // ── Trigger queue processor (reliable queue-based approach) ──
    // Instead of calling individual job endpoints, trigger the cron processor
    // which picks the next job from the queue and processes it reliably.
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
    const cronUrl = `${baseUrl}/api/cron/process`;

    console.log(`[JOB ${job.id}] Created and queued. Triggering processor at: ${cronUrl}`);

    // Trigger the queue processor asynchronously
    // The processor will pick up this job (or the next queued job)
    // This is more reliable than fire-and-forget to individual endpoints
    const triggerProcessor = async (): Promise<void> => {
      try {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
          console.error("[JOB CREATE] CRON_SECRET not configured - job will wait for cron");
          // Job is created but won't auto-process (will wait for cron or manual trigger)
          return;
        }
        
        const response = await fetch(cronUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": cronSecret,
          },
          signal: AbortSignal.timeout(8000), // 8s timeout (processor will continue in background)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[JOB ${job.id}] Processor triggered:`, result);
        } else {
          console.warn(`[JOB ${job.id}] Processor trigger returned ${response.status}`);
        }
      } catch (err) {
        // Timeout is expected for long-running jobs - the processor continues working
        if ((err as Error).name === "AbortError") {
          console.log(`[JOB ${job.id}] Processor trigger timed out (job is processing in background)`);
        } else {
          console.error(`[JOB ${job.id}] Processor trigger failed:`, err);
        }
      }
    };

    // Trigger asynchronously without blocking response
    triggerProcessor();

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
