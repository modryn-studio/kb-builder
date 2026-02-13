import { NextResponse } from "next/server";
import { feedbackStore, getFeedbackStats } from "@/lib/feedback-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedback
 * 
 * Admin endpoint to view all feedback collected in the current session.
 * Access this in your browser while testing.
 * 
 * Query params:
 * - slug: Filter by manual slug (optional)
 * - format: 'json' (default) or 'csv'
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugFilter = searchParams.get("slug");
  const format = searchParams.get("format") || "json";

  // Get all feedback entries
  let feedback = feedbackStore;
  
  // Filter by slug if requested
  if (slugFilter) {
    feedback = feedback.filter(f => f.slug === slugFilter);
  }

  // Return as CSV
  if (format === "csv") {
    const csv = [
      "slug,helpful,sectionType,sectionId,ip,createdAt",
      ...feedback.map(f => 
        `"${f.slug}",${f.helpful},"${f.sectionType || ""}","${f.sectionId || ""}","${f.ip}","${f.createdAt}"`
      )
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=feedback-${Date.now()}.csv`
      }
    });
  }

  // Return as JSON with stats
  const stats = getFeedbackStats();
  
  return NextResponse.json({
    stats,
    feedback: feedback.slice().reverse(), // Most recent first
    note: "Data stored in-memory. Resets on server restart."
  });
}

/**
 * DELETE /api/admin/feedback
 * 
 * Clear all feedback entries (useful for testing)
 */
export async function DELETE() {
  const count = feedbackStore.length;
  feedbackStore.length = 0; // Clear array
  
  return NextResponse.json({
    success: true,
    message: `Cleared ${count} feedback entries`
  });
}
