import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Delete a job from the queue
 * Used for cleaning up stuck or unwanted jobs
 */
export async function DELETE(
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

    // Only allow deletion of queued or failed jobs
    if (job.status === "processing") {
      return NextResponse.json(
        { error: "Cannot delete a job that is currently processing" },
        { status: 409 }
      );
    }

    // Import deleteJob function
    const { deleteJob } = await import("@/lib/db");
    await deleteJob(id);

    console.log(`[DELETE ${id}] Job deleted: "${job.toolName}" (status: ${job.status})`);

    return NextResponse.json({ 
      success: true,
      message: "Job deleted successfully"
    });
  } catch (err) {
    console.error("Delete job error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
