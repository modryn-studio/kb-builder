// ──────────────────────────────────────────────
// Session ID management (no auth — localStorage on client)
// ──────────────────────────────────────────────

const SESSION_ID_REGEX = /^[a-f0-9-]{36}$/i;  // Case-insensitive for robustness
const SESSION_KEY = "kb_session_id";

/** Validate a session ID (must be a UUID). */
export function isValidSessionId(id: string): boolean {
  return SESSION_ID_REGEX.test(id);
}

/**
 * Get or create a session ID for the current browser.
 * Stored in localStorage, generated once per browser using crypto.randomUUID().
 * Client-side only - do not use in server components.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateSessionId can only be called in the browser");
  }

  let id = localStorage.getItem(SESSION_KEY);
  
  if (!id || !isValidSessionId(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  
  return id;
}
