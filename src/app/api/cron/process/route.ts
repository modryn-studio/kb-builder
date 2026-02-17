import { NextRequest, NextResponse } from "next/server";
import { findNextJob, updateJob, cleanupOldJobs } from "@/lib/db";
import { generateManual } from "@/lib/generate";
import { storeManual } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──
    const cronSecret = request.headers.get("x-cron-secret")
      || request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      console.error("CRON_SECRET is not configured in environment variables");
      return NextResponse.json(
        { error: "Server misconfiguration: CRON_SECRET not set" },
        { status: 500 }
      );
    }
    
    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── Cleanup old jobs first ──
    await cleanupOldJobs();

    // ── Find next job ──
    const job = await findNextJob();
    if (!job) {
      return NextResponse.json({ message: "No jobs to process" });
    }

    console.log(`[CRON] Processing job ${job.id}: "${job.toolName}"`);

    // ── Mark as processing ──
    await updateJob(job.id, {
      status: "processing",
      startedAt: new Date().toISOString(),
    });

    const startTime = Date.now();

    try {
      const manual = await generateManual(
        job.toolName,
        (stage, message) => {
          console.log(`[CRON ${job.id}] ${stage}: ${message}`);
        }
      );

      const result = await storeManual(manual);

      await updateJob(job.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        manualUrl: result.blobUrl,
        shareableUrl: result.shareableUrl,
        inputTokens: (manual as unknown as Record<string, number>).inputTokens || 0,
        outputTokens: (manual as unknown as Record<string, number>).outputTokens || 0,
        modelCost: manual.cost.model,
        searchCost: manual.cost.search,
        totalCost: manual.cost.total,
        modelUsed: "anthropic/claude-opus-4-6",
        citationCount: manual.citations.length,
        generationTimeMs: Date.now() - startTime,
        featureCount: manual.features.length,
        shortcutCount: manual.shortcuts.length,
        workflowCount: manual.workflows.length,
        tipCount: manual.tips.length,
      });

      console.log(`[CRON ${job.id}] ✅ Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

      return NextResponse.json({
        processed: true,
        jobId: job.id,
        status: "completed",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[CRON ${job.id}] ❌ Failed:`, errorMessage);

      await updateJob(job.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage,
        generationTimeMs: Date.now() - startTime,
      });

      return NextResponse.json({
        processed: true,
        jobId: job.id,
        status: "failed",
        error: errorMessage,
      });
    }
  } catch (err) {
    console.error("Cron process error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
