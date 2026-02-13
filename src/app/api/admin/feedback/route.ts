import { NextResponse } from "next/server";
import { feedbackStore, getFeedbackStats } from "@/lib/feedback-store";
import { getMessages, getAllRatings } from "@/lib/blob-persistence";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedback
 * 
 * Protected admin endpoint. Requires ?key=ADMIN_SECRET query param.
 * 
 * Query params:
 * - key: Admin secret (required, matches ADMIN_SECRET env var)
 * - slug: Filter by manual slug (optional)
 * - format: 'json' (default) or 'csv'
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // ── Auth check ──
  const key = searchParams.get("key");
  const expectedKey = process.env.ADMIN_SECRET || process.env.CRON_SECRET || "dev-secret";
  if (key !== expectedKey) {
    return NextResponse.json(
      { error: "Unauthorized. Use ?key=YOUR_ADMIN_SECRET" },
      { status: 401 }
    );
  }

  const slugFilter = searchParams.get("slug");
  const format = searchParams.get("format") || "json";

  // Get all feedback entries
  let feedback = [...feedbackStore];
  
  // Filter by slug if requested
  if (slugFilter) {
    feedback = feedback.filter(f => f.slug === slugFilter);
  }

  // Strip IP addresses from response (privacy)
  const safeFeedback = feedback.map(({ ip: _, ...rest }) => rest);

  // Return as CSV
  if (format === "csv") {
    const csv = [
      "slug,helpful,sectionType,sectionId,createdAt",
      ...safeFeedback.map(f => 
        `"${f.slug}",${f.helpful},"${f.sectionType || ""}","${f.sectionId || ""}","${f.createdAt}"`
      )
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=feedback-${Date.now()}.csv`
      }
    });
  }

  // Return as JSON with stats, messages, and ratings
  const stats = await getFeedbackStats();
  const messages = getMessages();
  const ratings = getAllRatings();
  
  return NextResponse.json({
    stats,
    ratings,
    messages: messages.slice().reverse(),
    feedback: safeFeedback.slice().reverse(),
    note: "Data persisted to Vercel Blob."
  });
}

/**
 * DELETE /api/admin/feedback
 * 
 * Clear all feedback entries (requires admin key)
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const expectedKey = process.env.ADMIN_SECRET || process.env.CRON_SECRET || "dev-secret";
  if (key !== expectedKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const count = feedbackStore.length;
  feedbackStore.length = 0;
  
  return NextResponse.json({
    success: true,
    message: `Cleared ${count} feedback entries`
  });
}
