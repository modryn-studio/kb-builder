import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ──────────────────────────────────────────────
// POST /api/stripe/checkout
// Creates a Stripe Checkout session for a one-time donation.
// Body: { amount: number, sessionId?: string }
// Returns: { url: string }
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Rate limit (5 per 10 min per IP) ──
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = checkRateLimit(`stripe:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // ── Parse body ──
  let body: { amount?: number; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const amount = body.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "Amount must be a number", code: "INVALID_AMOUNT" },
      { status: 400 }
    );
  }

  // Server-side validation: $1 – $500
  if (amount < 1 || amount > 500) {
    return NextResponse.json(
      { error: "Amount must be between $1 and $500", code: "INVALID_AMOUNT" },
      { status: 400 }
    );
  }

  // Round to cents
  const amountCents = Math.round(amount * 100);

  // ── Create Checkout Session ──
  try {
    const origin = request.headers.get("origin") || request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Support KB Builder",
              description: `One-time $${amount.toFixed(2)} donation`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          kbSessionId: body.sessionId || "",
        },
      },
      metadata: {
        kbSessionId: body.sessionId || "",
      },
      success_url: `${origin}/support/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/support`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout] Failed:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session", code: "STRIPE_ERROR" },
      { status: 500 }
    );
  }
}
