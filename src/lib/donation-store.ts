/**
 * Donation store — in-memory + Blob persistence
 *
 * Stores completed Stripe donations. Writes immediately (no debounce)
 * because donations are infrequent and critical to track.
 */

import { put, list } from "@vercel/blob";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface Donation {
  id: string;
  stripePaymentId: string;
  amount: number; // dollars (e.g. 10.00)
  currency: string;
  email?: string;
  sessionId?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// In-memory store
// ──────────────────────────────────────────────

const BLOB_KEY = "_internal/donations.json";
const EVENTS_BLOB_KEY = "_internal/processed_events.json";
const MAX_DONATIONS = 10_000;
const MAX_EVENTS = 1_000;

let donations: Donation[] = [];
let processedEventIds = new Set<string>();
let hydrated = false;
let eventsHydrated = false;

async function readBlob(): Promise<Donation[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    if (!res.ok) return [];
    return (await res.json()) as Donation[];
  } catch (err) {
    console.warn("[DonationStore] Failed to read blob:", err);
    return [];
  }
}

async function writeBlob(): Promise<void> {
  try {
    await put(BLOB_KEY, JSON.stringify(donations), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
  } catch (err) {
    console.error("[DonationStore] Failed to write blob:", err);
  }
}

async function readEventsBlob(): Promise<string[]> {
  try {
    const { blobs } = await list({ prefix: EVENTS_BLOB_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    if (!res.ok) return [];
    return (await res.json()) as string[];
  } catch (err) {
    console.warn("[DonationStore] Failed to read events blob:", err);
    return [];
  }
}

async function writeEventsBlob(): Promise<void> {
  try {
    const eventArray = Array.from(processedEventIds).slice(-MAX_EVENTS);
    await put(EVENTS_BLOB_KEY, JSON.stringify(eventArray), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
  } catch (err) {
    console.error("[DonationStore] Failed to write events blob:", err);
  }
}

async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await readBlob();
  donations.push(...saved);
  console.log(`[DonationStore] Hydrated ${saved.length} donations from Blob`);
}

async function ensureEventsHydrated(): Promise<void> {
  if (eventsHydrated) return;
  eventsHydrated = true;
  const saved = await readEventsBlob();
  processedEventIds = new Set(saved);
  console.log(`[DonationStore] Hydrated ${saved.length} processed events from Blob`);
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/** Add a donation and immediately persist to Blob. */
export async function addDonation(donation: Donation): Promise<void> {
  await ensureHydrated();

  // Idempotency — skip if already recorded
  if (donations.some((d) => d.stripePaymentId === donation.stripePaymentId)) {
    console.log("[DonationStore] Duplicate skipped:", donation.stripePaymentId);
    return;
  }

  donations.push(donation);

  // Trim oldest if over limit
  if (donations.length > MAX_DONATIONS) {
    donations = donations.slice(-MAX_DONATIONS);
  }

  // Write immediately — donations are critical
  await writeBlob();

  console.log(
    `[Donation] $${donation.amount} ${donation.currency} from ${donation.email || "anonymous"}`
  );
}

/** Check if a Stripe payment has already been recorded. */
export async function donationExists(stripePaymentId: string): Promise<boolean> {
  await ensureHydrated();
  return donations.some((d) => d.stripePaymentId === stripePaymentId);
}

/** Get aggregate donation stats. */
export async function getDonationStats(): Promise<{
  totalAmount: number;
  totalCount: number;
  recentDonations: Donation[];
}> {
  await ensureHydrated();
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCount: donations.length,
    recentDonations: donations.slice(-20).reverse(),
  };
}

/** Get all donations (admin only). */
export async function getAllDonations(): Promise<Donation[]> {
  await ensureHydrated();
  return [...donations].reverse(); // newest first
}

/** Check if a Stripe webhook event has already been processed. */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  await ensureEventsHydrated();
  return processedEventIds.has(eventId);
}

/** Mark a Stripe webhook event as processed. */
export async function markEventProcessed(eventId: string): Promise<void> {
  await ensureEventsHydrated();
  processedEventIds.add(eventId);
  
  // Trim to last N events
  if (processedEventIds.size > MAX_EVENTS) {
    const arr = Array.from(processedEventIds);
    processedEventIds = new Set(arr.slice(-MAX_EVENTS));
  }
  
  await writeEventsBlob();
}
