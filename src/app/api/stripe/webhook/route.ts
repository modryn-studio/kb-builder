import { NextResponse } from "next/server";
import Stripe from "stripe";
import { addDonation, isEventProcessed, markEventProcessed } from "@/lib/donation-store";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ──────────────────────────────────────────────
// POST /api/stripe/webhook
// Receives Stripe webhook events. Verifies signature,
// logs completed donations to Blob storage.
// ──────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // SECURITY: Always require webhook secret in production
  if (!webhookSecret) {
    console.error("[Stripe Webhook] CRITICAL: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // ── Idempotency: Check if event already processed ──
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) {
    console.log(`[Stripe Webhook] Duplicate event skipped: ${event.id}`);
    return NextResponse.json({ received: true });
  }

  // ── Handle checkout completion ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      console.error("[Stripe Webhook] Missing payment_intent in session:", session.id);
      // Still mark as processed and acknowledge to prevent retries
      await markEventProcessed(event.id);
      return NextResponse.json({ received: true });
    }

    const amount = (session.amount_total || 0) / 100;

    try {
      await addDonation({
        id: crypto.randomUUID(),
        stripePaymentId: paymentIntentId,
        amount,
        currency: session.currency || "usd",
        email: session.customer_details?.email || undefined,
        sessionId: session.metadata?.kbSessionId || undefined,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[Stripe Webhook] Failed to record donation:", err);
      // Still return 200 to prevent Stripe retries (log error for investigation)
    }
  }

  // Mark event as processed
  await markEventProcessed(event.id);

  // Always acknowledge receipt (Stripe retries on non-200 responses)
  return NextResponse.json({ received: true });
}
