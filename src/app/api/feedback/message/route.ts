import { NextRequest, NextResponse } from "next/server";
import { addMessage, hydrateMessages } from "@/lib/blob-persistence";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/feedback/message
 * Submit a user message (feature request, bug report, general feedback)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, type, message, email, sessionId } = body;

    // Validate type
    const validTypes = ["feature-request", "bug-report", "general", "manual-feedback"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `'type' must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "'message' is required and must be non-empty" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be under 5000 characters" },
        { status: 400 }
      );
    }

    // Optional email validation
    if (email && typeof email === "string" && !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Optional slug validation (for manual-specific feedback)
    if (slug && typeof slug !== "string") {
      return NextResponse.json(
        { error: "'slug' must be a string" },
        { status: 400 }
      );
    }

    await hydrateMessages();

    addMessage({
      id: randomUUID(),
      slug: slug || undefined,
      type,
      message: message.trim(),
      email: email || undefined,
      sessionId: sessionId || undefined,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
