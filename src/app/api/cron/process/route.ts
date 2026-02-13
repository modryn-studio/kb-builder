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
    const expectedSecret = process.env.CRON_SECRET || "dev-secret";
    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── Cleanup old jobs first ──
    cleanupOldJobs();

    // ── Find next job ──
    const job = findNextJob();
    if (!job) {
      return NextResponse.json({ message: "No jobs to process" });
    }

    console.log(`[CRON] Processing job ${job.id}: "${job.toolName}"`);

    // ── Mark as processing ──
    updateJob(job.id, {
      status: "processing",
      startedAt: new Date().toISOString(),
    });

    const startTime = Date.now();

    try {
      const manual = await generateManual(
        job.toolName,
        (stage, message) => {
          console.log(`[CRON ${job.id}] ${stage}: ${message}`);
        },
        job.apiKey
      );

      const result = await storeManual(manual);

      updateJob(job.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        manualUrl: result.blobUrl,
        shareableUrl: result.shareableUrl,
        inputTokens: (manual as any).inputTokens || 0,
        outputTokens: (manual as any).outputTokens || 0,
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
        coverageScore: manual.coverageScore,
        apiKey: undefined,
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

      updateJob(job.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage,
        generationTimeMs: Date.now() - startTime,
        apiKey: undefined,
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
