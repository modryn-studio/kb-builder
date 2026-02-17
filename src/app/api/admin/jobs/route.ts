import { NextRequest, NextResponse } from "next/server";
import { getAllJobs, deleteAllJobs } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admin-only endpoint to list all jobs or delete all jobs
 */
export async function GET(request: NextRequest) {
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

    const jobs = await getAllJobs();
    
    return NextResponse.json({ 
      jobs,
      total: jobs.length
    });
  } catch (err) {
    console.error("Admin get jobs error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Delete all jobs (admin only)
 */
export async function DELETE(request: NextRequest) {
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

    const count = await deleteAllJobs();
    
    console.log(`[ADMIN] Deleted all ${count} jobs`);
    
    return NextResponse.json({ 
      success: true,
      message: `Deleted ${count} jobs`,
      count
    });
  } catch (err) {
    console.error("Admin delete all jobs error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
