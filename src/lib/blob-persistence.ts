/**
 * Blob Persistence Layer
 * 
 * Persists jobs and feedback to Vercel Blob so they survive server restarts.
 * Uses a lazy-load pattern: hydrate from Blob on first access, write on changes.
 */

import { put, list } from "@vercel/blob";

const JOBS_KEY = "_internal/jobs.json";
const FEEDBACK_KEY = "_internal/feedback.json";
const RATINGS_KEY = "_internal/ratings.json";
const MESSAGES_KEY = "_internal/messages.json";

// ──────────────────────────────────────────────
// Generic read/write helpers
// ──────────────────────────────────────────────

async function readBlobJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix: key });
    if (blobs.length === 0) return fallback;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return fallback;

    return (await response.json()) as T;
  } catch (err) {
    console.warn(`[BlobPersistence] Failed to read ${key}:`, err);
    return fallback;
  }
}

async function writeBlobJson(key: string, data: unknown): Promise<void> {
  try {
    await put(key, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true, // Allow updates to existing files
    });
  } catch (err) {
    console.error(`[BlobPersistence] Failed to write ${key}:`, err);
  }
}

// ──────────────────────────────────────────────
// Debounced writes (batch rapid changes)
// ──────────────────────────────────────────────

const pendingWrites = new Map<string, NodeJS.Timeout>();

function debouncedWrite(key: string, getData: () => unknown, delayMs = 2000): void {
  const existing = pendingWrites.get(key);
  if (existing) clearTimeout(existing);

  pendingWrites.set(
    key,
    setTimeout(async () => {
      pendingWrites.delete(key);
      await writeBlobJson(key, getData());
    }, delayMs)
  );
}

// ──────────────────────────────────────────────
// Jobs persistence
// ──────────────────────────────────────────────

import type { GenerationJob } from "./db";

let jobsHydrated = false;

export async function hydrateJobs(): Promise<GenerationJob[]> {
  if (jobsHydrated) return [];
  jobsHydrated = true;
  
  const saved = await readBlobJson<GenerationJob[]>(JOBS_KEY, []);
  console.log(`[BlobPersistence] Hydrated ${saved.length} jobs from Blob`);
  return saved;
}

export function persistJobs(jobs: GenerationJob[]): void {
  debouncedWrite(JOBS_KEY, () => jobs);
}

// ──────────────────────────────────────────────
// Feedback persistence (thumbs up/down)
// ──────────────────────────────────────────────

import type { FeedbackEntry } from "./feedback-store";

let feedbackHydrated = false;

export async function hydrateFeedback(): Promise<FeedbackEntry[]> {
  if (feedbackHydrated) return [];
  feedbackHydrated = true;

  const saved = await readBlobJson<FeedbackEntry[]>(FEEDBACK_KEY, []);
  console.log(`[BlobPersistence] Hydrated ${saved.length} feedback entries from Blob`);
  return saved;
}

export function persistFeedback(entries: FeedbackEntry[]): void {
  debouncedWrite(FEEDBACK_KEY, () => entries);
}

// ──────────────────────────────────────────────
// Star ratings persistence
// ──────────────────────────────────────────────

export interface StarRating {
  slug: string;
  rating: number; // 1-5
  sessionId: string;
  createdAt: string;
}

let ratingsHydrated = false;
let ratingsCache: StarRating[] = [];

export async function hydrateRatings(): Promise<StarRating[]> {
  if (ratingsHydrated) return ratingsCache;
  ratingsHydrated = true;

  ratingsCache = await readBlobJson<StarRating[]>(RATINGS_KEY, []);
  console.log(`[BlobPersistence] Hydrated ${ratingsCache.length} ratings from Blob`);
  return ratingsCache;
}

export function addRating(rating: StarRating): void {
  // Deduplicate: one rating per session per slug
  ratingsCache = ratingsCache.filter(
    (r) => !(r.slug === rating.slug && r.sessionId === rating.sessionId)
  );
  ratingsCache.push(rating);
  debouncedWrite(RATINGS_KEY, () => ratingsCache);
}

export function getRatingsForSlug(slug: string): { average: number; count: number } {
  const slugRatings = ratingsCache.filter((r) => r.slug === slug);
  if (slugRatings.length === 0) return { average: 0, count: 0 };
  const sum = slugRatings.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Math.round((sum / slugRatings.length) * 10) / 10,
    count: slugRatings.length,
  };
}

export function getAllRatings(): Record<string, { average: number; count: number }> {
  const bySlug: Record<string, number[]> = {};
  for (const r of ratingsCache) {
    if (!bySlug[r.slug]) bySlug[r.slug] = [];
    bySlug[r.slug].push(r.rating);
  }
  const result: Record<string, { average: number; count: number }> = {};
  for (const [slug, ratings] of Object.entries(bySlug)) {
    const sum = ratings.reduce((a, b) => a + b, 0);
    result[slug] = {
      average: Math.round((sum / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  }
  return result;
}

// ──────────────────────────────────────────────
// User messages persistence
// ──────────────────────────────────────────────

export interface UserMessage {
  id: string;
  slug?: string;
  type: "feature-request" | "bug-report" | "general" | "manual-feedback";
  message: string;
  email?: string;
  sessionId?: string;
  createdAt: string;
}

let messagesHydrated = false;
let messagesCache: UserMessage[] = [];

export async function hydrateMessages(): Promise<UserMessage[]> {
  if (messagesHydrated) return messagesCache;
  messagesHydrated = true;

  messagesCache = await readBlobJson<UserMessage[]>(MESSAGES_KEY, []);
  console.log(`[BlobPersistence] Hydrated ${messagesCache.length} messages from Blob`);
  return messagesCache;
}

export function addMessage(msg: UserMessage): void {
  messagesCache.push(msg);
  // Keep max 5000 messages
  if (messagesCache.length > 5000) {
    messagesCache = messagesCache.slice(-5000);
  }
  debouncedWrite(MESSAGES_KEY, () => messagesCache);
}

export function getMessages(): UserMessage[] {
  return messagesCache;
}
