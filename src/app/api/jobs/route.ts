import { NextRequest, NextResponse } from "next/server";
import { listJobs, type JobStatus } from "@/lib/db";
import { isValidSessionId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const statusFilter = searchParams.get("status");

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json(
        { error: "Valid sessionId query parameter is required" },
        { status: 400 }
      );
    }

    let statuses: JobStatus[] | undefined;
    if (statusFilter) {
      statuses = statusFilter.split(",").filter(
        (s): s is JobStatus => ["queued", "processing", "completed", "failed"].includes(s)
      );
    }

    const jobs = listJobs(sessionId, statuses);

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("List jobs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
