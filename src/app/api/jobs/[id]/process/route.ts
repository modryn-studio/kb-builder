import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/db";
import { generateManual } from "@/lib/generate";
import { storeManual } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — enough for web search generation

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth check ──
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET || "dev-secret";
    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const job = getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status !== "queued") {
      return NextResponse.json(
        { error: `Job is already ${job.status}` },
        { status: 409 }
      );
    }

    // ── Mark as processing ──
    updateJob(id, {
      status: "processing",
      startedAt: new Date().toISOString(),
    });

    console.log(`[JOB ${id}] Processing: "${job.toolName}" (slug: ${job.slug})`);
    const startTime = Date.now();

    try {
      // ── Generate manual ──
      const manual = await generateManual(
        job.toolName,
        (stage, message) => {
          console.log(`[JOB ${id}] ${stage}: ${message}`);
        },
        job.apiKey
      );

      // ── Store in Blob ──
      const result = await storeManual(manual);

      // ── Update job with results ──
      updateJob(id, {
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
        // Clear API key after processing
        apiKey: undefined,
      });

      console.log(`[JOB ${id}] ✅ Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s — ${manual.features.length} features, $${manual.cost.total.toFixed(4)}`);

      return NextResponse.json({ 
        status: "completed",
        shareableUrl: result.shareableUrl,
        generationTimeMs: Date.now() - startTime,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[JOB ${id}] ❌ Failed:`, errorMessage);

      updateJob(id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage,
        generationTimeMs: Date.now() - startTime,
        // Clear API key after processing
        apiKey: undefined,
      });

      return NextResponse.json({
        status: "failed",
        error: errorMessage,
      });
    }
  } catch (err) {
    console.error("Process job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
