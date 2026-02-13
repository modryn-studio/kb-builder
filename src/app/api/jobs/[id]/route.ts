import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
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

    // Add elapsed time for in-progress jobs
    const response: Record<string, unknown> = { ...job };
    if (job.status === "processing" && job.startedAt) {
      response.elapsedMs = Date.now() - new Date(job.startedAt).getTime();
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("Get job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
