import { NextRequest, NextResponse } from "next/server";
import { getJob, forceDeleteJob } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admin-only endpoint to force delete any job (including processing ones)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const adminKey = request.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_SECRET;
    
    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const job = await getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Force delete (no status check)
    await forceDeleteJob(id);

    console.log(`[ADMIN DELETE] Job ${id} deleted: "${job.toolName}" (status: ${job.status})`);

    return NextResponse.json({ 
      success: true,
      message: "Job deleted successfully"
    });
  } catch (err) {
    console.error("Admin delete job error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
