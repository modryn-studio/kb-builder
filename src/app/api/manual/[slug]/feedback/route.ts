import { NextRequest, NextResponse } from "next/server";
import { isValidSlug } from "@/lib/utils";
import { addFeedback, type FeedbackEntry } from "@/lib/feedback-store";

// ──────────────────────────────────────────────
// Rate limiting
// ──────────────────────────────────────────────

const MAX_FEEDBACK_RATE_ENTRIES = 10_000;

const feedbackRateMap = new Map<
  string,
  { count: number; resetAt: number }
>();

function cleanupFeedbackRateMap() {
  if (feedbackRateMap.size <= MAX_FEEDBACK_RATE_ENTRIES) return;
  const now = Date.now();
  for (const [key, value] of feedbackRateMap) {
    if (value.resetAt <= now) {
      feedbackRateMap.delete(key);
    }
  }
  if (feedbackRateMap.size > MAX_FEEDBACK_RATE_ENTRIES) {
    const entries = Array.from(feedbackRateMap.entries()).sort(
      (a, b) => a[1].resetAt - b[1].resetAt
    );
    const toRemove = entries.slice(
      0,
      feedbackRateMap.size - MAX_FEEDBACK_RATE_ENTRIES
    );
    for (const [key] of toRemove) {
      feedbackRateMap.delete(key);
    }
  }
}

function checkFeedbackRate(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  cleanupFeedbackRateMap();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 10;

  const entry = feedbackRateMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    feedbackRateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

// ──────────────────────────────────────────────
// POST handler
// ──────────────────────────────────────────────

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

    // Validate required field
    if (typeof body.helpful !== "boolean") {
      return NextResponse.json(
        { error: "'helpful' must be a boolean" },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.sectionType && typeof body.sectionType !== "string") {
      return NextResponse.json(
        { error: "'sectionType' must be a string" },
        { status: 400 }
      );
    }
    if (body.sectionId && typeof body.sectionId !== "string") {
      return NextResponse.json(
        { error: "'sectionId' must be a string" },
        { status: 400 }
      );
    }
    if (body.comment !== undefined) {
      if (typeof body.comment !== "string" || body.comment.length > 500) {
        return NextResponse.json(
          { error: "'comment' must be a string (max 500 chars)" },
          { status: 400 }
        );
      }
    }

    // Rate limit
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { allowed, retryAfter } = checkFeedbackRate(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Feedback rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const entry: FeedbackEntry = {
      slug,
      helpful: body.helpful,
      sectionType: body.sectionType,
      sectionId: body.sectionId,
      ip,
      createdAt: new Date().toISOString(),
    };

    await addFeedback(entry);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
