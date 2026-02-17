import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Manually trigger processing for a stuck queued job
 * Useful for jobs where the initial fire-and-forget trigger failed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await getJob(id);
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

    // Construct the process URL from the incoming request
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";
    const processUrl = `${baseUrl}/api/jobs/${id}/process`;

    // Construct cron processor URL (not individual job URL)
    const cronUrl = `${baseUrl}/api/cron/process`;
    console.log(`[TRIGGER ${id}] Manually triggering queue processor at: ${cronUrl}`);

    // Trigger the queue processor which will pick up this job
    try {
      const response = await fetch(cronUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": process.env.CRON_SECRET || "dev-secret",
        },
        signal: AbortSignal.timeout(8000), // 8s timeout
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[TRIGGER ${id}] Processor failed: ${response.status} - ${text}`);
        return NextResponse.json(
          { error: "Failed to trigger processor", details: text },
          { status: 500 }
        );
      }

      const result = await response.json();
      console.log(`[TRIGGER ${id}] Processor triggered:`, result);
      return NextResponse.json({ 
        success: true,
        message: "Queue processor triggered successfully",
        result
      });
    } catch (err) {
      // Timeout is expected - processor continues in background
      if ((err as Error).name === "AbortError") {
        console.log(`[TRIGGER ${id}] Processor started (timed out as expected)`);
        return NextResponse.json({ 
          success: true,
          message: "Queue processor started (processing in background)"
        });
      }

      throw err;
    }
  } catch (err) {
    console.error("Manual trigger error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
