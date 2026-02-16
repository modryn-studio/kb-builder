/**
 * Reusable in-memory rate limiter.
 *
 * Same pattern as /api/generate, extracted for reuse.
 * Bounded at 10 000 entries with LRU eviction.
 */

const MAX_ENTRIES = 10_000;

const store = new Map<string, { count: number; resetAt: number }>();

function cleanup() {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, value] of store) {
    if (value.resetAt <= now) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    const sorted = Array.from(store.entries()).sort(
      (a, b) => a[1].resetAt - b[1].resetAt
    );
    for (const [key] of sorted.slice(0, store.size - MAX_ENTRIES)) {
      store.delete(key);
    }
  }
}

/**
 * Check whether a key (IP, sessionId, etc.) is within its rate window.
 *
 * @param key        Unique identifier to rate-limit
 * @param max        Maximum requests allowed in the window
 * @param windowMs   Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  cleanup();
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}
