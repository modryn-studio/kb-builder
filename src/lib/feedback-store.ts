/**
 * Shared feedback store — in-memory + Blob persistence
 */

import { hydrateFeedback, persistFeedback } from "./blob-persistence";

export interface FeedbackEntry {
  slug: string;
  helpful: boolean;
  sectionType?: string;
  sectionId?: string;
  ip: string;
  createdAt: string;
}

// In-memory storage (hydrated from Blob on first access)
export const feedbackStore: FeedbackEntry[] = [];

// Maximum entries to keep
export const MAX_FEEDBACK_ENTRIES = 5000;

let hydrated = false;

async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const saved = await hydrateFeedback();
  feedbackStore.push(...saved);
}

// Helper to add feedback and maintain size limit
export async function addFeedback(entry: FeedbackEntry) {
  await ensureHydrated();
  feedbackStore.push(entry);
  
  // Keep only last N entries
  while (feedbackStore.length > MAX_FEEDBACK_ENTRIES) {
    feedbackStore.shift();
  }
  
  // Persist to Blob
  persistFeedback(feedbackStore);

  // Log to console for terminal monitoring
  console.log("[Feedback]", JSON.stringify({ 
    slug: entry.slug, 
    helpful: entry.helpful,
    sectionType: entry.sectionType,
    timestamp: entry.createdAt
  }));
}

// Helper to get feedback stats
export async function getFeedbackStats() {
  await ensureHydrated();
  const total = feedbackStore.length;
  const helpful = feedbackStore.filter(f => f.helpful).length;
  const notHelpful = total - helpful;
  
  const bySlug: Record<string, { helpful: number; notHelpful: number }> = {};
  feedbackStore.forEach(entry => {
    if (!bySlug[entry.slug]) {
      bySlug[entry.slug] = { helpful: 0, notHelpful: 0 };
    }
    if (entry.helpful) {
      bySlug[entry.slug].helpful++;
    } else {
      bySlug[entry.slug].notHelpful++;
    }
  });
  
  return {
    total,
    helpful,
    notHelpful,
    bySlug,
    entries: feedbackStore.length
  };
}
