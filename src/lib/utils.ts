// ──────────────────────────────────────────────
// Slug validation and sanitization
// ──────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Sanitize a raw string into a valid slug.
 * Returns empty string if nothing remains after sanitization.
 */
export function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "") // strip leading/trailing dashes
    .replace(/-{2,}/g, "-"); // collapse consecutive dashes
}

/**
 * Check if a slug is valid (at least 2 chars, starts with alphanumeric).
 */
export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && SLUG_REGEX.test(slug);
}

// ──────────────────────────────────────────────
// Input sanitization
// ──────────────────────────────────────────────

/**
 * Sanitize user-provided tool name:
 * - Strip control characters
 * - Collapse whitespace
 * - Trim to max length
 */
export function sanitizeToolName(raw: string, maxLength = 100): string {
  return raw
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control chars
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
    .slice(0, maxLength);
}
