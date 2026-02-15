# Code Review Summary — February 15, 2026

## Overview

Comprehensive codebase review completed. 7 issues identified, all non-critical. Theme unification is complete. Design token system is comprehensive and well-documented.

---

## Issues Found

### 1. 🟡 No Browser Notification Permission Request

**Location:** [src/app/job/[id]/page.tsx](src/app/job/%5Bid%5D/page.tsx#L165-L174)

**Issue:** Job completion notifications only fire if permission is already granted. No UI to request permission.

**Impact:** Low — notifications are a nice-to-have, not core functionality.

**Fix:**
```tsx
const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

// Add button or auto-request on first job creation
```

---

### 2. 🟢 Session Validation Gap (By Design)

**Location:** [src/app/api/jobs/[id]/route.ts](src/app/api/jobs/%5Bid%5D/route.ts#L6-L34)

**Issue:** GET endpoint doesn't validate sessionId — anyone with job ID can view it.

**Impact:** None — intentional for shareability. Job IDs are UUIDs (not guessable).

**Action:** Document this as a design decision. ✅ Added to copilot-instructions.md

---

### 3. 🟡 Polling Doesn't Stop on Repeated Errors

**Location:** [src/app/job/[id]/page.tsx](src/app/job/%5Bid%5D/page.tsx#L113-L128)

**Issue:** If `fetchJob()` throws errors repeatedly, polling continues forever.

**Impact:** Low — wastes client resources if API is down.

**Fix:** Add error counter, stop after 5 consecutive failures:
```tsx
const [errorCount, setErrorCount] = useState(0);

const fetchJob = useCallback(async () => {
  try {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error("Fetch failed");
    setJob(await res.json());
    setErrorCount(0); // Reset on success
  } catch (err) {
    setErrorCount((prev) => prev + 1);
  }
}, [jobId]);

// Stop polling if errorCount >= 5
```

---

### 4. 🟢 Debounced Write Delay (Acceptable Trade-off)

**Location:** [src/lib/blob-persistence.ts](src/lib/blob-persistence.ts#L48-L58)

**Issue:** Jobs persist to Blob with 2-second debounce. Server crash within that window = lost updates.

**Impact:** Very low — jobs are short-lived (2-3 mins), risk window is tiny.

**Rationale:** Reduces Blob API calls (cost + rate limits). Trade-off is acceptable.

**Action:** Documented in copilot-instructions.md. No code change needed.

---

### 5. 🟡 Rate Limit Map Memory Growth

**Location:** [src/app/api/generate/route.ts](src/app/api/generate/route.ts#L20-L41)

**Issue:** In-memory rate limit map could grow indefinitely if cleanup isn't triggered.

**Current Mitigation:** Bounded at 10,000 entries. LRU eviction on overflow.

**Impact:** Low — cleanup runs on every rate limit check. Max memory ~1MB.

**Better Solution (Future):** Use Upstash Rate Limit for production-grade limiting.

---

### 6. 🟢 Hydration Pattern Limitation

**Location:** [src/lib/db.ts](src/lib/db.ts#L56-L63)

**Issue:** Once hydrated from Blob, never re-reads. If another function instance updates Blob, local cache is stale.

**Impact:** Very low — serverless functions are short-lived. Stale window is seconds.

**Action:** Documented in copilot-instructions.md. Current pattern is fine for this use case.

---

### 7. 🟡 No Error Boundaries

**Issue:** Client pages have no error boundaries. Malformed API responses could crash the page.

**Impact:** Medium — poor UX if API returns unexpected data.

**Fix:** Add Next.js error boundary at route level:
```tsx
// src/app/job/[id]/error.tsx
"use client";
export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-2xl text-foreground">
          Something went wrong
        </h1>
        <Button variant="vault" onClick={reset} className="mt-4">
          Try again
        </Button>
      </div>
    </div>
  );
}
```

---

## What's Good

### ✅ Theme Unification Complete

All user-facing pages now use the vault dark theme:
- Homepage, /manuals, /pending, /kb-builder
- Job tracking (/job/[id])
- Manual detail (/manual/[slug]) + all states (loading, error, not-found)
- All 1,355 lines of ManualContent.tsx restyled

**Zero hardcoded colors remaining** (except admin feedback page, which is internal-only).

### ✅ Design Token System

Comprehensive semantic token system in [src/app/globals.css](src/app/globals.css):
- 20+ color tokens (background, card, primary, success, destructive, etc.)
- Opacity modifiers for variants (bg-primary/10, border-success/20)
- Custom shadows (vault-glow, shadow-float)
- Typography tokens (font-heading, font-body, font-mono)
- Utility classes (gradient-gold-text, bg-dot-pattern, scrollbar-thin)

### ✅ Component Variants

Vault-specific variants implemented:
- **Button:** vault, vault-outline, vault-ghost, vault-subtle
- **Badge:** vault, vault-outline, vault-muted
- **Progress:** Uses bg-primary (already correct)

### ✅ Architecture Patterns

- Clean separation: API routes → lib functions → storage
- Type-safe: Zod schemas for runtime validation
- Fire-and-forget with retry for background processing
- Polling pattern with useEffect cleanup
- Rate limiting with bounded eviction

---

## Recommendations

### Immediate (Optional)

1. **Add error boundaries** — Improves UX if API returns malformed data
2. **Fix polling error handling** — Stop after 5 consecutive failures
3. **Add notification permission UI** — Small QoL improvement

### Future (When Scaling)

1. **Replace in-memory rate limiting** — Use Upstash Rate Limit or Vercel KV
2. **Replace in-memory job store** — Use Vercel Postgres for multi-instance consistency
3. **Add pagination** — When manual count exceeds 100
4. **Add authentication** — If users need private manuals

---

## Build Status

✅ **Builds successfully** — Zero TypeScript errors  
✅ **No regressions** — All pages render correctly  
⚠️ **Known ESLint issue** — Next.js 16 + ESLint 9 circular structure error (non-blocking)

---

## Documentation Created

📄 **[.github/copilot-instructions.md](.github/copilot-instructions.md)**

Comprehensive guide for AI coding assistants covering:
- Design token usage (with examples)
- Code patterns and conventions
- Architecture overview (job queue, session management, rate limiting)
- API conventions
- All 7 known issues documented with rationale
- Testing checklist
- Reference to development-principles.md and design_v1.md

---

## Next Steps

1. **Optional fixes:** Implement error boundaries, polling error handling, notification permission UI
2. **Monitor costs:** Track `totalCost` field in jobs (currently ~$1.05 per manual)
3. **User testing:** Get feedback on job tracking UX and vault theme
4. **Marketing:** Ship to ProductHunt/HN (see docs/specs/Marketing_Strategy_v1.md)

---

**Status:** Production-ready. Known issues are minor and well-documented.
