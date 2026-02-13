import { NextRequest, NextResponse } from "next/server";
import { addRating, getRatingsForSlug, hydrateRatings } from "@/lib/blob-persistence";
import { isValidSlug } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/manual/[slug]/rate
 * Submit a star rating (1-5) for a manual
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Invalid manual slug" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { rating, sessionId } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "'rating' must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Ensure ratings are loaded
    await hydrateRatings();

    addRating({
      slug,
      rating,
      sessionId,
      createdAt: new Date().toISOString(),
    });

    const stats = getRatingsForSlug(slug);

    return NextResponse.json({ 
      success: true,
      average: stats.average,
      count: stats.count,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/manual/[slug]/rate
 * Get rating stats for a manual
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Invalid manual slug" },
      { status: 400 }
    );
  }

  await hydrateRatings();
  const stats = getRatingsForSlug(slug);

  return NextResponse.json(stats);
}
