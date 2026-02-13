/**
 * Shared in-memory feedback store
 * Both the submission endpoint and admin viewer use this
 */

export interface FeedbackEntry {
  slug: string;
  helpful: boolean;
  sectionType?: string;
  sectionId?: string;
  ip: string;
  createdAt: string;
}

// In-memory storage (resets on server restart)
export const feedbackStore: FeedbackEntry[] = [];

// Maximum entries to keep in memory
export const MAX_FEEDBACK_ENTRIES = 1000;

// Helper to add feedback and maintain size limit
export function addFeedback(entry: FeedbackEntry) {
  feedbackStore.push(entry);
  
  // Keep only last N entries
  if (feedbackStore.length > MAX_FEEDBACK_ENTRIES) {
    feedbackStore.shift();
  }
  
  // Log to console for terminal monitoring (backwards compatible)
  console.log("[Feedback]", JSON.stringify({ 
    slug: entry.slug, 
    helpful: entry.helpful,
    sectionType: entry.sectionType,
    timestamp: entry.createdAt
  }));
}

// Helper to get feedback stats
export function getFeedbackStats() {
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
