// ──────────────────────────────────────────────
// Session ID management (no auth — localStorage on client)
// ──────────────────────────────────────────────

const SESSION_ID_REGEX = /^[a-f0-9-]{36}$/;

/** Validate a session ID (must be a UUID). */
export function isValidSessionId(id: string): boolean {
  return SESSION_ID_REGEX.test(id);
}
