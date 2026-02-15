# GitHub Copilot Instructions — KB Builder

**Last Updated:** February 15, 2026  
**Project:** Knowledge Base Builder (kb-builder)  
**Owner:** Modryn Studio

---

## Purpose

This document provides context for AI coding assistants (GitHub Copilot, Cursor, etc.) to maintain consistency when modifying the KB Builder codebase. It covers design tokens, coding practices, architectural patterns, and known constraints.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Design System](#design-system)
3. [Code Patterns](#code-patterns)
4. [Architecture](#architecture)
5. [API Conventions](#api-conventions)
6. [Known Issues & Constraints](#known-issues--constraints)
7. [Testing & Validation](#testing--validation)
8. [Reference Documents](#reference-documents)

---

## Core Philosophy

Follow principles from `docs/development-principles.md`:

- **Ship fast, iterate faster** — Days to MVP, not weeks. Ugly is acceptable, broken is not.
- **Action first, explanation later** — The homepage should let users "do the thing" (design_v1.md).
- **AI-first development** — Use Claude + web search for content generation, instrument everything for the data flywheel.
- **Micro-to-multi-niche expansion** — Start with obsessed users in one niche (developer tools), expand to adjacent markets.

---

## Design System

### Theme: "Knowledge Vault" — Dark Library Aesthetic

All user-facing pages use a unified dark theme. See `src/app/globals.css` for full token definitions.

### Design Tokens (Tailwind CSS v4)

**ALWAYS use semantic tokens instead of hardcoded colors.**

#### Color Tokens

| Token | Usage | HSL Value |
|-------|-------|-----------|
| `bg-background` | Page background | `hsl(228 20% 5%)` |
| `bg-card` | Cards, modals, elevated surfaces | `hsl(228 16% 8%)` |
| `bg-secondary` | Subtle backgrounds (badges, muted areas) | `hsl(228 12% 13%)` |
| `bg-muted` | Disabled states, very subtle backgrounds | `hsl(228 10% 11%)` |
| `bg-primary` | Primary action backgrounds (gold) | `hsl(38 58% 50%)` |
| `bg-success` | Success states (green) | `hsl(152 35% 42%)` |
| `bg-destructive` | Error states (red) | `hsl(0 62% 50%)` |
| `text-foreground` | Primary text | `hsl(40 18% 88%)` |
| `text-muted-foreground` | Secondary text, descriptions | `hsl(225 8% 50%)` |
| `text-primary` | Gold accent text (links, highlights) | `hsl(38 58% 50%)` |
| `text-success` | Success message text | `hsl(152 35% 42%)` |
| `text-destructive` | Error message text | `hsl(0 62% 50%)` |
| `border-border` | Default borders | `hsl(228 10% 15%)` |

#### Opacity Modifiers

Use opacity to create variants without defining new colors:

```tsx
// ✅ Correct
<div className="bg-primary/10 border-primary/20">  // 10% and 20% opacity
<div className="bg-success/15 text-success">        // Success badge style
<div className="bg-destructive/10 text-destructive"> // Error alert style

// ❌ Wrong
<div className="bg-blue-50 border-blue-200">        // Hardcoded color
<div className="bg-green-100 text-green-700">       // Not semantic
```

### Component Variants

#### Button

Use vault-specific variants from `src/components/ui/button.tsx`:

- `vault` — Primary gold button (replaces generic "default")
- `vault-outline` — Outlined gold button
- `vault-ghost` — Ghost button with gold hover
- `vault-subtle` — Minimal button with subtle gold accent
- `destructive` — For delete/cancel actions

```tsx
// ✅ Correct
<Button variant="vault">Generate Manual</Button>
<Button variant="vault-outline">Cancel</Button>

// ❌ Wrong
<Button className="bg-blue-600 text-white">Generate</Button>
```

#### Badge

Use vault-specific variants from `src/components/ui/badge.tsx`:

- `vault` — Solid gold badge
- `vault-outline` — Outlined gold badge
- `vault-muted` — Subtle gray badge (for counts, categories)

```tsx
// ✅ Correct
<Badge variant="vault-muted">{count} features</Badge>

// ❌ Wrong
<Badge className="bg-slate-100 text-slate-700">{count}</Badge>
```

#### Progress

The `Progress` component uses `bg-primary` for the fill (already correct). No customization needed.

### Typography

- **Headings:** Use `font-heading` class → Cormorant Garamond (serif)
- **Body:** Use `font-body` class (or default) → IBM Plex Sans
- **Code/Mono:** Use `font-mono` class → IBM Plex Mono

```tsx
// ✅ Correct
<h1 className="font-heading text-3xl font-bold text-foreground">Title</h1>
<p className="text-muted-foreground">Body text uses font-body by default</p>

// ❌ Wrong
<h1 className="font-sans text-slate-900">Title</h1>
```

### Shadows & Effects

Custom shadows from globals.css:

- `vault-glow` — Gold glow effect (60px blur)
- `vault-glow-sm` — Subtle gold glow (30px blur)
- `shadow-vault` — Card shadow with gold tint
- `shadow-float` — Deep elevated shadow

```tsx
// ✅ Used for emphasis
<div className="bg-card vault-glow-sm">Highlighted card</div>

// Use sparingly — not on every element
```

### Utility Classes

- `gradient-gold-text` — Gold gradient text effect (for hero headlines)
- `gradient-vault-bg` — Vertical gradient background
- `bg-dot-pattern` — Subtle dot grid background
- `scrollbar-thin` — Custom thin scrollbar

---

## Code Patterns

### File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Homepage (hero + manual browser)
│   ├── about/              # Static pages
│   ├── job/[id]/           # Job tracking pages
│   ├── manual/[slug]/      # Manual detail pages
│   ├── api/                # API routes
│   └── globals.css         # Design tokens (@theme block)
├── components/             # Reusable UI
│   ├── ui/                 # shadcn components (Button, Badge, Progress, etc.)
│   └── *.tsx               # Page-level components (Navbar, Footer, etc.)
├── lib/                    # Business logic
│   ├── generate.ts         # Perplexity Agent API calls
│   ├── schema.ts           # Zod schemas for manual structure
│   ├── db.ts               # In-memory job queue
│   ├── storage.ts          # Vercel Blob wrappers
│   ├── blob-persistence.ts # Persist jobs/feedback to Blob
│   └── session.ts          # localStorage-based session IDs
└── data/                   # Static datasets (manual seeds)
```

### Component Style

**Use server components by default.** Only add `"use client"` when needed for:
- `useState`, `useEffect`, event handlers
- `useRouter`, `useSearchParams`
- Browser APIs (localStorage, Notification API)

```tsx
// ✅ Server component (default)
export default async function ManualsPage() {
  const manuals = await getAllManuals();
  return <ManualGrid manuals={manuals} />;
}

// ✅ Client component (when needed)
"use client";
export default function JobPage() {
  const [status, setStatus] = useState("queued");
  // ...
}
```

### State Management

**No Redux, Zustand, or global state libraries.** Use:
- Server components for data fetching
- `useState` for local UI state
- URL params for shareable state
- localStorage for session/preferences

```tsx
// ✅ Correct
const searchParams = useSearchParams();
const filter = searchParams.get("category") || "all";

// ❌ Overkill
const filter = useSelector((state) => state.manuals.filter);
```

### Error Handling

**Always return structured errors from API routes:**

```tsx
// ✅ Correct
return NextResponse.json(
  { error: "Job not found", code: "NOT_FOUND" },
  { status: 404 }
);

// ❌ Wrong
throw new Error("Not found"); // Leaks stack traces
```

**Client-side: Show user-friendly messages, log details to console.**

```tsx
// ✅ Correct
try {
  const res = await fetch("/api/generate");
  if (!res.ok) {
    const { error } = await res.json();
    setErrorMessage(error || "Something went wrong");
  }
} catch (err) {
  console.error("Generation failed:", err);
  setErrorMessage("Network error — please try again");
}
```

### Async Patterns

**Fire-and-forget with retry:**

Used in `/api/jobs/create/route.ts` to trigger background processing:

```tsx
const triggerProcessing = async (attempt = 1): Promise<void> => {
  try {
    const response = await fetch(processUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    if (!response.ok && attempt < 3) {
      setTimeout(() => triggerProcessing(attempt + 1), 2000);
    }
  } catch (err) {
    if (attempt < 3) setTimeout(() => triggerProcessing(attempt + 1), 2000);
  }
};
triggerProcessing(); // Don't await
```

**Polling pattern:**

Used in `/app/job/[id]/page.tsx` for real-time updates:

```tsx
useEffect(() => {
  if (!job || job.status === "completed") return;
  const interval = setInterval(fetchJob, 3000); // Poll every 3s
  return () => clearInterval(interval);
}, [job?.status, fetchJob]);
```

---

## Architecture

### Job Queue Pattern

**Problem:** Perplexity API with `web_search` takes 130-160s, exceeding Vercel's default timeout UX tolerance.

**Solution:** Async job queue with status polling (Sora-style UX).

#### Flow

1. User submits tool name → `POST /api/jobs/create`
2. Job created with status: `queued` → returns `{ id }`
3. Client redirects to `/job/[id]`
4. Server fires background request to `POST /api/jobs/[id]/process` (fire-and-forget with retry)
5. Processing updates job status: `queued` → `processing` → `completed` or `failed`
6. Client polls `GET /api/jobs/[id]` every 3s, showing progress
7. On completion, auto-redirect to `/manual/[slug]`

#### Storage

- **In-memory Map:** `src/lib/db.ts` — fast CRUD, lost on restart
- **Vercel Blob:** Persists jobs every 2s (debounced) to `_internal/jobs.json`
- **Hydration:** On first access, load saved jobs from Blob into memory

### Session Management

**No authentication.** Use anonymous session IDs stored in `localStorage`:

```tsx
// Client-side only
import { getOrCreateSessionId } from "@/lib/session";
const sessionId = getOrCreateSessionId(); // Generates UUID once per browser
```

**Session validation:**
- `/api/jobs?sessionId=xxx` — List user's jobs (requires valid UUID)
- `/api/jobs/[id]` — Get single job (NO session check — public by ID)

This allows users to share job status links.

### Rate Limiting

**In-memory, IP-based** (resets on deploy):

- `POST /api/generate` — 5 requests per minute per IP
- `POST /api/jobs/create` — 5 jobs per minute per session ID

Bounded map size: 10,000 entries. Eviction on overflow or expiry check.

### Cost Tracking

**Token usage from Perplexity API:**

```tsx
const usage = response.usage;
const cost = {
  input: (usage.input_tokens || 0) * COST_PER_INPUT_TOKEN,
  output: (usage.output_tokens || 0) * COST_PER_OUTPUT_TOKEN,
  search: SEARCH_COST_ESTIMATE, // $0.005 per query
  total: inputCost + outputCost + searchCost,
};
```

**Known issue:** `response.usage` is sometimes undefined when `web_search` is disabled. Fallback to token estimation if missing.

---

## API Conventions

### Routes

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/jobs/create` | POST | Create new generation job | sessionId required |
| `/api/jobs` | GET | List session's jobs | sessionId query param |
| `/api/jobs/[id]` | GET | Get single job status | None (public by ID) |
| `/api/jobs/[id]/process` | POST | Trigger processing (internal) | CRON_SECRET header |
| `/api/generate` | POST | Legacy synchronous generate | IP rate limit |
| `/api/manuals` | GET | List all public manuals | None |
| `/api/manual/[slug]` | GET | Get manual JSON | None |
| `/api/manual/[slug]/rate` | POST | Submit rating (thumbs up/down) | sessionId in body |
| `/api/manual/[slug]/feedback` | POST | Submit section feedback | sessionId in body |
| `/api/feedback/message` | POST | User messages (bugs, features) | None |

### Request/Response Format

**Always use JSON:**

```tsx
// Request
Content-Type: application/json
{ "tool": "VS Code", "sessionId": "..." }

// Success
{ "id": "...", "status": "queued", ... }

// Error
{ "error": "Descriptive message", "code": "ERROR_CODE" }
```

### Pagination

**Not yet implemented.** When needed:

```tsx
// Query params
?page=1&limit=20

// Response
{ 
  data: [...], 
  pagination: { page: 1, limit: 20, total: 143, hasNext: true } 
}
```

---

## Known Issues & Constraints

### 1. Session Validation Gap

**Issue:** `/api/jobs/[id]` GET endpoint doesn't validate sessionId, allowing anyone with a job ID to view it.

**Rationale:** Intentional for shareability. Job IDs are UUIDs (not guessable), and job status links are designed to be shareable.

**Future:** Add optional authentication for "private" jobs if needed.

### 2. No Browser Notification Permission Request

**Issue:** `/app/job/[id]/page.tsx` sends browser notifications on completion, but only if permission is already granted. No UI to request permission.

**Fix:** Add a "Notify me" button that requests permission, or auto-request on first job creation.

```tsx
// Example
const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};
```

### 3. Debounced Write Delay (Acceptable Trade-off)

**Issue:** Jobs are persisted to Vercel Blob with a 2-second debounce. If the server crashes within that window, recent updates are lost.

**Rationale:** Reduces Blob API calls (costs + rate limits). Jobs are short-lived (2-3 mins), so the risk window is small.

**Mitigation:** If persistence is critical, reduce debounce to 500ms or write immediately for `completed`/`failed` status.

### 4. Polling Error Handling

**Issue:** `/app/job/[id]/page.tsx` polling continues indefinitely even if `fetchJob()` throws errors repeatedly.

**Fix:** Add failure counter, stop polling after 5 consecutive errors:

```tsx
const [errorCount, setErrorCount] = useState(0);

const fetchJob = useCallback(async () => {
  try {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    setJob(data);
    setErrorCount(0); // Reset on success
  } catch (err) {
    setErrorCount((prev) => prev + 1);
    if (errorCount >= 5) {
      console.error("Polling stopped after 5 failures");
      // Show error message to user
    }
  }
}, [jobId, errorCount]);
```

### 5. Rate Limit Map Memory Growth

**Issue:** In-memory rate limit map in `/api/generate/route.ts` could grow indefinitely if cleanup isn't triggered.

**Current:** Bounded at 10,000 entries. Cleanup runs on every rate limit check (LRU eviction).

**Better approach:** Use Redis or Upstash Rate Limit for production-grade limiting.

### 6. Hydration Pattern Limitation

**Issue:** Once `src/lib/db.ts` hydrates from Blob, it never re-reads. If Blob is updated by another serverless function instance, local cache is stale.

**Rationale:** Next.js serverless functions are short-lived (request duration). Stale data window is seconds, not minutes.

**If multi-instance consistency is needed:** Use Vercel KV or Postgres instead of in-memory Map.

### 7. No Error Boundaries

**Issue:** Client pages (`/job/[id]`, `/manual/[slug]`) have no error boundaries. Malformed API responses could crash the page.

**Fix:** Wrap pages in React error boundary:

```tsx
// src/app/error.tsx (Next.js convention)
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-2xl text-foreground">Something went wrong</h1>
        <Button variant="vault" onClick={reset} className="mt-4">Try again</Button>
      </div>
    </div>
  );
}
```

---

## Testing & Validation

### Manual Testing Checklist

Before deploying changes:

1. **Generate a manual** — Test full flow from homepage to `/manual/[slug]`
2. **Test job tracking** — Submit job, verify polling updates, auto-redirect works
3. **Rate limiting** — Generate 6 manuals in <1 min, verify rate limit error
4. **Session persistence** — Generate manual, close tab, reopen `/pending` → jobs should persist
5. **Dark theme consistency** — Check all pages (homepage, manuals, job tracking, manual detail) use vault theme

### Build Validation

```bash
npm run build
```

Should complete with **zero TypeScript errors**. Warnings are acceptable if documented.

**Known ESLint issue:** Next.js 16 + ESLint 9 circular structure error. Non-blocking. Skip lint on build if needed:

```bash
npm run build -- --no-lint
```

### Cost Estimation

Per manual generation (Claude Opus 4.6 + web search):
- Input: ~8,000 tokens × $15/M = **$0.12**
- Output: ~12,000 tokens × $75/M = **$0.90**
- Search: 5 queries × $0.005 = **$0.025**
- **Total: ~$1.05 per manual**

Monitor `totalCost` field in jobs to track spend.

---

## Reference Documents

Read these for full context:

1. **`docs/development-principles.md`** — Core philosophy, market strategy, AI-first approach
2. **`docs/design_v1.md`** — Homepage design patterns, "action first" philosophy
3. **`docs/specs/Component_1_Spec_v5.0.md`** — Full technical spec for job queue architecture
4. **`src/app/globals.css`** — Complete design token definitions (@theme block)

### Key Sections to Reference:

- **Design tokens:** `src/app/globals.css` (lines 1-100)
- **Job queue logic:** `src/lib/db.ts`
- **Generation logic:** `src/lib/generate.ts`
- **Schema definition:** `src/lib/schema.ts`
- **Manual storage:** `src/lib/storage.ts`
- **Session management:** `src/lib/session.ts`

---

## Copilot-Specific Guidelines

When generating or modifying code:

1. **Always use semantic design tokens** — Never hardcode `bg-blue-600`, `text-slate-900`, etc.
2. **Prefer server components** — Only use `"use client"` when necessary
3. **Follow existing patterns** — Match the style of adjacent files
4. **Return structured errors** — `{ error: string, code?: string }` from API routes
5. **Document trade-offs** — If you make a performance/safety trade-off, add a comment
6. **Test vault theme consistency** — After UI changes, verify colors match the dark theme
7. **Keep functions small** — <100 lines per function. Extract helpers when logic grows.
8. **Type everything** — No `any` types. Use Zod schemas for runtime validation.

### When in Doubt

- **Design decisions:** See `docs/design_v1.md`
- **Architecture questions:** See `docs/specs/Component_1_Spec_v5.0.md`
- **Color choices:** See `src/app/globals.css` @theme block
- **Component variants:** See `src/components/ui/*.tsx` for shadcn component APIs

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-15 | Initial version — covers design tokens, job queue architecture, known issues |

---

**Questions?** Check the reference docs or review recent commit messages for context.
