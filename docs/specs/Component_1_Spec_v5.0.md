# Component 1: Knowledge Base Builder — Spec v5.0 (February 2026)

## What Changed from v4.1

| Area | v4.1 (Current) | v5.0 (This Spec) |
|---|---|---|
| **Web search** | ❌ Disabled (adds 60-90s, exceeds timeouts) | ✅ Re-enabled via async job architecture |
| **Generation UX** | Synchronous — user waits 70s staring at progress bar | **Async (Sora-style)** — submit → pending folder → notified when ready |
| **Usage tracking** | ❌ Always shows $0.00 (response.usage undefined) | ✅ Fixed with debug logging + fallback estimation |
| **Latency budget** | 70s (no search) / ~~130-160s (with search)~~ | 130-160s allowed — user doesn't wait |
| **Architecture** | Single synchronous request-response | **Job queue** with background processing |
| **Storage** | Vercel Blob only | Vercel Blob + **Vercel Postgres** (job queue) |
| **Frontend** | Single page (generate + results) | **Multi-view**: Builder → Pending Jobs → Manual Index |
| **maxDuration** | 300s (unused — request is ~70s) | 300s (fully utilized with web search) |
| **Streaming** | Broken (SDK issue) — using synthetic progress | Not needed — job status via polling |

### Why This Change?

Three critical problems in v4.1:

1. **Paying Perplexity markup for no search** — Claude Opus 4.6 via Perplexity costs ~$15/$75 per million tokens. Without `web_search`, we're just using it as an expensive Claude proxy. With search re-enabled, we get actual value: fresh web data that compensates for May 2025 knowledge cutoff.

2. **9 months of stale knowledge** — Opus 4.6 cutoff is May 2025. It's February 2026. Any tool that changed in the last 9 months produces outdated manuals. Web search fixes this.

3. **Usage tracking broken** — `response.usage` is undefined/null from Perplexity Agent API when web_search is disabled, causing costs to always show $0.00.

### Why Async (Not Just Re-enable Search)?

Re-enabling `web_search` adds 60-90s to generation, making total time 130-160s. Vercel's `maxDuration: 300` allows this on the backend — but no user should stare at a progress bar for 2.5 minutes.

**Inspiration: Sora 2's video generation UX.**
- User submits a request → instant acknowledgment
- Request goes to a "pending" queue
- User can close the tab, come back later
- Notification when generation completes
- Manual appears in their "library"

This pattern transforms a frustrating 160s wait into a delightful async experience.

---

## Mission

Turn any software tool name into the best instruction manual on the internet. Structured data from day one. Fresh web research on every generation.

---

## Principles Applied

| Principle | How It Shows Up |
|---|---|
| Ship in days, not weeks | Job queue uses Vercel Postgres (zero-ops), not a custom message broker |
| One killer feature | Input tool name → get comprehensive manual with shareable link |
| Function really well | Async UX means no timeouts, no staring at spinners |
| Data collection from day one | Every generation logged with cost, latency, quality metrics, search queries used |
| Data flywheel | User thumbs up/down on sections informs prompt improvements |
| Onboard to value in <2 min | Type name, click button, see it in pending, get notified |
| AI-first | Single-call agentic architecture: Claude + web search + structured output |

---

## Tech Stack (v5.0)

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 16.1.6 (App Router) | Server components, API routes, cron-compatible |
| **Generation** | Perplexity Agent API with `anthropic/claude-opus-4-6` + `web_search` | Fresh data, single call, agentic search |
| **SDK** | `@perplexity-ai/perplexity_ai` v0.25.0 | Official TypeScript SDK |
| **Manual Storage** | Vercel Blob | Zero-config, CDN-backed, public URLs for JSON documents |
| **Job Queue** | **Vercel Postgres** (new) | Serverless Postgres — stores job status, results, cost tracking |
| **UI** | React 19 + Tailwind CSS v4 | Minimal client JS, fast renders |
| **Validation** | Zod v4.3.6 | Runtime type validation, schema-first |
| **Deployment** | Vercel | Obvious choice given stack |

### New Dependency

```bash
npm install @vercel/postgres
```

### Environment Variables (New)

```bash
# Existing
PERPLEXITY_API_KEY=pplx-...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# New for v5.0
POSTGRES_URL=postgres://...                  # Vercel Postgres connection string
POSTGRES_URL_NON_POOLING=postgres://...      # For migrations
CRON_SECRET=your-secret-here                 # Protects cron endpoint
```

---

## Architecture (v5.0)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                   │
│                                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ /kb-builder  │  │ /pending      │  │ /manuals      │                  │
│  │ Submit form  │  │ Job tracker   │  │ Manual index  │                  │
│  │ → instant ack│  │ Polls status  │  │ All manuals   │                  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                │                  │                            │
│    POST /api/jobs   GET /api/jobs    GET /api/manuals                   │
└─────────┼────────────────┼──────────────────┼───────────────────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API ROUTES                                     │
│                                                                         │
│  POST /api/jobs/create     → Insert job into Postgres (status: queued)  │
│  GET  /api/jobs            → List all jobs for session                  │
│  GET  /api/jobs/[id]       → Get single job status + result             │
│  GET  /api/manuals         → List all generated manuals from Blob       │
│  POST /api/jobs/[id]/process → Process one job (called by cron/direct)  │
│  POST /api/cron/process    → Process next queued job (cron trigger)     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     JOB PROCESSING                                      │
│                                                                         │
│  1. Pick oldest "queued" job → set status = "processing"                │
│  2. Call Perplexity Agent API (claude-opus-4-6 + web_search)            │
│  3. Validate with Zod + normalizeModelOutput()                          │
│  4. Store manual in Vercel Blob (versioned + latest)                    │
│  5. Update job: status = "completed", attach result URL + cost          │
│  6. On error: status = "failed", attach error message                   │
│                                                                         │
│  Time budget: up to 300s (maxDuration) per job                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Vercel Postgres)

```sql
CREATE TABLE IF NOT EXISTS generation_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name     TEXT NOT NULL,
  slug          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  
  -- Timestamps
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at    TIMESTAMP WITH TIME ZONE,
  completed_at  TIMESTAMP WITH TIME ZONE,
  
  -- Result (populated on completion)
  manual_url    TEXT,                -- Vercel Blob URL for the manual
  shareable_url TEXT,                -- /manual/[slug] URL
  
  -- Cost tracking
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  model_cost    NUMERIC(10,6) DEFAULT 0,
  search_cost   NUMERIC(10,6) DEFAULT 0,
  total_cost    NUMERIC(10,6) DEFAULT 0,
  
  -- Metadata
  model_used    TEXT,
  citation_count INTEGER DEFAULT 0,
  generation_time_ms INTEGER,
  error_message TEXT,                -- Populated on failure
  
  -- Session tracking (no auth — use browser fingerprint or session ID)
  session_id    TEXT NOT NULL,
  
  -- Summary (populated on completion)
  feature_count   INTEGER DEFAULT 0,
  shortcut_count  INTEGER DEFAULT 0,
  workflow_count  INTEGER DEFAULT 0,
  tip_count       INTEGER DEFAULT 0,
  coverage_score  NUMERIC(3,2) DEFAULT 0
);

CREATE INDEX idx_jobs_status ON generation_jobs(status);
CREATE INDEX idx_jobs_session ON generation_jobs(session_id);
CREATE INDEX idx_jobs_slug ON generation_jobs(slug);
CREATE INDEX idx_jobs_created ON generation_jobs(created_at);
```

---

## API Design (v5.0)

### `POST /api/jobs/create`

Creates a new generation job. Returns immediately.

**Request:**
```json
{
  "tool": "Figma",
  "apiKey": "pplx-...",
  "forceRefresh": false,
  "sessionId": "browser-generated-uuid"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tool": "Figma",
  "slug": "figma",
  "status": "queued",
  "createdAt": "2026-02-13T10:30:00Z",
  "position": 1
}
```

**Logic:**
1. Validate tool name and API key
2. Rate limit (5 jobs/min/session)
3. Check if manual exists in cache (<24h old) — if so, return cached result instantly
4. Insert row into `generation_jobs` with status = `queued`
5. **Immediately trigger processing** via internal fetch to `/api/jobs/[id]/process` (fire-and-forget with `waitUntil`)
6. Return job ID to client

### `GET /api/jobs`

List jobs for a session.

**Query params:** `?sessionId=xxx&status=queued,processing,completed`

**Response:**
```json
{
  "jobs": [
    {
      "id": "550e8400-...",
      "tool": "Figma",
      "slug": "figma",
      "status": "completed",
      "createdAt": "2026-02-13T10:30:00Z",
      "completedAt": "2026-02-13T10:32:30Z",
      "shareableUrl": "/manual/figma",
      "totalCost": 0.485,
      "generationTimeMs": 142000,
      "summary": { "features": 42, "shortcuts": 28, "workflows": 12, "tips": 18 }
    },
    {
      "id": "660f9500-...",
      "tool": "Notion",
      "slug": "notion",
      "status": "processing",
      "createdAt": "2026-02-13T10:33:00Z",
      "startedAt": "2026-02-13T10:33:01Z"
    }
  ]
}
```

### `GET /api/jobs/[id]`

Get single job status. Used for polling.

**Response (processing):**
```json
{
  "id": "660f9500-...",
  "status": "processing",
  "tool": "Notion",
  "slug": "notion",
  "createdAt": "2026-02-13T10:33:00Z",
  "startedAt": "2026-02-13T10:33:01Z",
  "elapsedMs": 45000
}
```

**Response (completed):**
```json
{
  "id": "660f9500-...",
  "status": "completed",
  "tool": "Notion",
  "slug": "notion",
  "shareableUrl": "/manual/notion",
  "manualUrl": "https://blob.vercel-storage.com/manuals/notion/latest.json",
  "totalCost": 0.52,
  "generationTimeMs": 148000,
  "summary": { "features": 38, "shortcuts": 22, "workflows": 10, "tips": 15, "coverageScore": 0.88 }
}
```

### `POST /api/jobs/[id]/process`

Processes a single job. Called internally (fire-and-forget from create) or by cron.

**Protected by:** `CRON_SECRET` header or internal call detection.

**Logic:**
1. Load job from Postgres
2. Verify status is `queued` → set to `processing`, record `started_at`
3. Call `generateManual()` with web_search enabled
4. On success: store in Blob, update job with results
5. On failure: update job with error message, set status = `failed`
6. `maxDuration: 300` — enough for 160s generation + overhead

### `POST /api/cron/process`

Cron job that picks up any stuck/queued jobs. Safety net.

**Vercel cron config (`vercel.json`):**
```json
{
  "crons": [
    {
      "path": "/api/cron/process",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Logic:**
1. Find oldest job with status = `queued` OR status = `processing` with `started_at` > 5 min ago (stuck)
2. Process it (same logic as `/api/jobs/[id]/process`)
3. Process at most 1 job per cron invocation (avoid timeout)

### `GET /api/manuals`

List all generated manuals from Blob storage.

**Response:**
```json
{
  "manuals": [
    { "slug": "figma", "tool": "Figma", "generatedAt": "2026-02-13T10:32:30Z", "url": "/manual/figma" },
    { "slug": "notion", "tool": "Notion", "generatedAt": "2026-02-13T10:35:00Z", "url": "/manual/notion" }
  ]
}
```

---

## Frontend UX (Sora-Style Async)

### Page Structure

```
/kb-builder    → Submit new generation (existing page, redesigned)
/pending       → View all jobs (queued, processing, completed, failed)
/manuals       → Browse all generated manuals
/manual/[slug] → View a specific manual (existing, unchanged)
```

### `/kb-builder` — Submit Page (Redesigned)

**Flow:**
1. User enters tool name + API key (existing)
2. Clicks "Generate"
3. **Instant response** — "Your manual is being generated! View progress →"
4. Redirected to `/pending` or shown inline status card
5. No more waiting on this page

**Changes from v4.1:**
- Remove streaming progress display
- Remove timeout logic (no longer waiting for response)
- Add "View Pending Jobs" link
- Keep API key management, cost tracker

### `/pending` — Job Tracker (New Page)

**Inspired by Sora 2's generation queue:**

```
┌─────────────────────────────────────────────────────────┐
│ Your Generations                              [+ New]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ⏳ Notion                          Processing    │    │
│  │    Started 45s ago · Searching web...           │    │
│  │    ████████████░░░░░░░░░░ ~50%                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ✅ Figma                           Completed     │    │
│  │    2 min ago · 42 features · $0.48              │    │
│  │    [View Manual]  [Copy Link]                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ❌ Slack                           Failed        │    │
│  │    5 min ago · Validation error                  │    │
│  │    [Retry]  [Details]                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Polling behavior:**
- Poll `/api/jobs?sessionId=xxx` every 3 seconds while any job is `queued` or `processing`
- Stop polling when all jobs are terminal (`completed` or `failed`)
- Show elapsed time for in-progress jobs
- Estimated progress bar based on expected 130-160s generation time

**Browser notifications:**
- Request notification permission on first job submission
- Send browser notification when a job completes:
  > "✅ Your Figma manual is ready! 42 features, 28 shortcuts."
- Clicking notification opens `/manual/[slug]`

### `/manuals` — Manual Index (New Page)

Simple list of all generated manuals. Fetches from `/api/manuals`.

```
┌─────────────────────────────────────────────────────────┐
│ Generated Manuals                         [+ Generate]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📘 Figma          42 features · Feb 13, 2026           │
│  📘 Windows Calc   9 features  · Feb 13, 2026           │
│                                                         │
│  No more manuals. Generate one →                        │
└─────────────────────────────────────────────────────────┘
```

### Session Management

Since there's no auth:
- Generate a UUID on first visit, store in `localStorage` as `kb_session_id`
- All jobs are tagged with this session ID
- User can only see their own jobs
- Session persists across page reloads but not across browsers/devices

---

## Usage Tracking Fix

### Problem

`response.usage?.input_tokens` returns `undefined` from Perplexity Agent API, causing `?? 0` fallback to fire. Cost always calculates as $0.00.

### Investigation Steps

1. Add debug logging to see actual `response.usage` structure
2. Check if usage is at a different path (e.g., `response.model_usage`, `response.billing`)
3. Check if usage is only returned when `web_search` is enabled

### Fix Strategy

```typescript
// 1. Debug log the full usage object
console.log("Response usage:", JSON.stringify(response.usage, null, 2));
console.log("Response keys:", Object.keys(response));

// 2. Try known alternative paths
const usage = response.usage 
  || (response as any).model_usage 
  || (response as any).billing;

// 3. Extract tokens
const inputTokens = usage?.input_tokens 
  ?? usage?.prompt_tokens       // OpenAI-style naming
  ?? 0;
const outputTokens = usage?.output_tokens 
  ?? usage?.completion_tokens   // OpenAI-style naming
  ?? 0;

// 4. Fallback: estimate from text length if still 0
if (inputTokens === 0 && outputTokens === 0) {
  // Rough estimate: 1 token ≈ 4 characters
  const promptLength = buildInstructions(slug).length + buildUserPrompt(toolName).length;
  const estimatedInputTokens = Math.ceil(promptLength / 4);
  const estimatedOutputTokens = Math.ceil(text.length / 4);
  
  console.warn(`Usage data unavailable. Estimating: ~${estimatedInputTokens} input, ~${estimatedOutputTokens} output tokens`);
  
  inputTokens = estimatedInputTokens;
  outputTokens = estimatedOutputTokens;
}
```

### Pricing Reference (Perplexity Agent API with Claude Opus 4.6)

| Item | Rate |
|---|---|
| Input tokens | $15 / 1M tokens |
| Output tokens | $75 / 1M tokens |
| Web search invocation | $5 / 1K requests |

> **Note:** These are Perplexity's rates for third-party models, not Claude direct pricing. The markup is justified because we get web search integration.

---

## Generation Module Changes (v5.0)

### Re-enable Web Search

```typescript
// In generateManual():
response = await client.responses.create({
  model,
  instructions: buildInstructions(slug),
  input: buildUserPrompt(toolName),
  tools: [{ type: "web_search" }],   // ← RE-ENABLED
  max_output_tokens: 65536,
  stream: false,                       // Streaming still broken in SDK
});
```

### Cost Calculation Update

```typescript
// Updated pricing for Perplexity Agent API with third-party model
const inputTokens = /* ... with fallback estimation ... */;
const outputTokens = /* ... with fallback estimation ... */;

// Perplexity rates for Claude Opus 4.6
const modelCost = inputTokens * 0.000015 + outputTokens * 0.000075;

// Web search cost: $5 per 1000 requests
// Estimate from citations (1 search per 3 citations, min 1)
const searchInvocations = Math.max(1, Math.ceil(citations.length / 3));
const searchCost = searchInvocations * 0.005;
```

### Remove Streaming Generator

The `generateManualStreaming()` function is dead code (SDK streaming broken, now using async jobs). Remove it to reduce file size.

---

## File Structure (v5.0)

```
kb-builder/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Redirect to /kb-builder
│   ├── globals.css
│   ├── kb-builder/
│   │   └── page.tsx                    # Submit form (redesigned for async)
│   ├── pending/
│   │   └── page.tsx                    # ★ NEW: Job tracker (Sora-style)
│   ├── manuals/
│   │   └── page.tsx                    # ★ NEW: Manual index
│   ├── manual/
│   │   └── [slug]/
│   │       ├── page.tsx                # Manual viewer (unchanged)
│   │       ├── ManualContent.tsx
│   │       ├── loading.tsx
│   │       ├── not-found.tsx
│   │       └── error.tsx
│   ├── api/
│   │   ├── generate/
│   │   │   └── route.ts               # DEPRECATED — kept for backward compat
│   │   ├── jobs/
│   │   │   ├── create/
│   │   │   │   └── route.ts           # ★ NEW: Create job
│   │   │   ├── route.ts               # ★ NEW: List jobs
│   │   │   └── [id]/
│   │   │       ├── route.ts           # ★ NEW: Get job status
│   │   │       └── process/
│   │   │           └── route.ts       # ★ NEW: Process single job
│   │   ├── cron/
│   │   │   └── process/
│   │   │       └── route.ts           # ★ NEW: Cron processor
│   │   ├── manuals/
│   │   │   └── route.ts               # ★ NEW: List all manuals
│   │   ├── admin/
│   │   │   └── feedback/
│   │   │       └── route.ts
│   │   └── manual/
│   │       └── [slug]/
│   │           ├── route.ts
│   │           ├── feedback/
│   │           │   └── route.ts
│   │           └── versions/
│   │               └── route.ts
│   └── admin/
│       └── feedback/
│           └── page.tsx
├── lib/
│   ├── schema.ts                       # Zod schemas (unchanged)
│   ├── generate.ts                     # Generation (web_search re-enabled, streaming removed)
│   ├── storage.ts                      # Vercel Blob (unchanged)
│   ├── db.ts                           # ★ NEW: Postgres connection + job queries
│   ├── session.ts                      # ★ NEW: Session ID management
│   ├── feedback-store.ts
│   └── utils.ts
├── vercel.json                         # ★ NEW: Cron config
├── package.json
├── tsconfig.json
└── .env.local
```

---

## Implementation Plan

### Phase 1: Fix Usage Tracking (Quick Win — 30 min)

**Goal:** Make cost display work, even without async architecture.

1. Add debug logging to `generateManual()` to inspect `response.usage`
2. Implement fallback token estimation from text length
3. Update pricing constants to correct Perplexity rates
4. Test: generate a manual, verify cost > $0.00

**Files changed:** `src/lib/generate.ts`

### Phase 2: Database + Job Infrastructure (2-3 hours)

**Goal:** Set up Vercel Postgres and job CRUD.

1. Install `@vercel/postgres`
2. Create `src/lib/db.ts` with:
   - Connection pool setup
   - `initializeDatabase()` — creates table if not exists
   - `createJob()`, `getJob()`, `listJobs()`, `updateJob()` helpers
3. Create `src/lib/session.ts` — session ID generation/validation
4. Create API routes:
   - `POST /api/jobs/create` — create job, fire-and-forget processing
   - `GET /api/jobs` — list jobs by session
   - `GET /api/jobs/[id]` — get job status
   - `POST /api/jobs/[id]/process` — process one job
5. Create `vercel.json` with cron config
6. Create `POST /api/cron/process` — safety net cron

**Files created:** `src/lib/db.ts`, `src/lib/session.ts`, `src/app/api/jobs/create/route.ts`, `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/route.ts`, `src/app/api/jobs/[id]/process/route.ts`, `src/app/api/cron/process/route.ts`, `vercel.json`

### Phase 3: Re-enable Web Search (30 min)

**Goal:** Uncomment `tools: [{ type: "web_search" }]`, remove dead streaming code.

1. Re-enable `web_search` in `generateManual()`
2. Delete `generateManualStreaming()` function (dead code)
3. Update timeout to be generous (API_TIMEOUT_MS stays at 180s, `maxDuration: 300` on process route)

**Files changed:** `src/lib/generate.ts`

### Phase 4: Frontend — Sora-Style UX (3-4 hours)

**Goal:** Transform UX from synchronous to async.

1. **Redesign `/kb-builder`** — submit creates job, instant redirect to pending
2. **Create `/pending`** — job tracker with polling, progress bars, notifications
3. **Create `/manuals`** — manual index from Blob listing
4. **Add navigation** — header nav between Builder / Pending / Manuals
5. **Browser notifications** — request permission, notify on completion
6. **Session management** — generate and persist session ID in localStorage

**Files created:** `src/app/pending/page.tsx`, `src/app/manuals/page.tsx`, `src/app/api/manuals/route.ts`
**Files changed:** `src/app/kb-builder/page.tsx`, `src/app/layout.tsx`

### Phase 5: Polish + Testing (1-2 hours)

1. Test full flow: submit → pending → completed → view manual
2. Test failure handling: bad tool name → failed → retry
3. Test cache: submit same tool → instant return
4. Test cost tracking across multiple generations
5. Test cron picks up stuck jobs
6. Update BUILD-LOG.md with resolution notes

---

## Cost Analysis (Per Generation with Web Search)

| Component | Estimate |
|---|---|
| Claude Opus 4.6 input tokens (~10K with search context) | ~$0.15 |
| Claude Opus 4.6 output tokens (~16K) | ~$1.20 |
| Web search invocations (~5-8) | ~$0.025-0.04 |
| Vercel Blob storage | ~$0.00 (negligible) |
| Vercel Postgres (job row) | ~$0.00 (negligible) |
| **Total per generation** | **~$0.40-1.40** |

> **Note:** Cost varies significantly by tool complexity. Simple tools (Calculator) ≈ $0.40. Enterprise tools (Figma, VS Code) ≈ $1.00-1.40.

The Perplexity markup over direct Claude pricing ($3/$15) is justified because:
- Web search integration (fresh 2026 data)
- No need for a separate search API
- Single billing provider

---

## Acceptance Criteria (v5.0 is DONE when...)

- [ ] User can submit a tool name and immediately see it in their pending queue
- [ ] Job processes in the background with web search enabled
- [ ] Pending page shows real-time status updates via polling
- [ ] Browser notification fires when generation completes
- [ ] Cost tracker shows actual cost (not $0.00)
- [ ] Completed jobs link to viewable manual at `/manual/[slug]`
- [ ] Failed jobs show error message and offer retry
- [ ] Manual index at `/manuals` shows all generated manuals
- [ ] Cron picks up stuck jobs (processing > 5 min)
- [ ] Cache works: same tool within 24h returns instant result
- [ ] Rate limiting: max 5 jobs per minute per session
- [ ] All generated manuals have web-sourced citations

**NOT required for v5.0:**
- Beautiful UI (functional > pretty)
- User accounts / auth
- Email notifications (browser notifications only)
- Manual editing
- Batch generation (one at a time for now)

---

## Risks + Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Vercel Postgres cold start adds latency | Low | Connection pooling, keep-alive |
| Web search adds 60-90s to generation | High | Async architecture — user doesn't wait |
| Perplexity API rate limits (rare) | Medium | Rate limit users to 5/min, queue-based processing |
| Job stuck in "processing" forever | Medium | Cron safety net resets stuck jobs after 5 min |
| `response.usage` still undefined with web_search | Medium | Fallback token estimation from text length |
| Browser notification permission denied | Low | Graceful degradation — user checks /pending manually |
| Session ID lost (cleared localStorage) | Low | Jobs still exist in DB, just not visible. Not critical at MVP. |
| Vercel function timeout (300s) even with async | Low | 160s typical generation is well within 300s budget |

---

## Migration Path from v4.1

v4.1's `/api/generate` endpoint continues to work (synchronous, no web search). It will be marked as deprecated but not removed, ensuring any existing bookmarks or API consumers don't break.

New flow uses `/api/jobs/*` endpoints exclusively.

The existing `/manual/[slug]` viewer is unchanged — it reads from the same Blob storage regardless of whether the manual was generated via the old or new pipeline.

---

## Development Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
 (30m)     (2-3h)     (30m)     (3-4h)    (1-2h)
  │          │          │          │          │
  ▼          ▼          ▼          ▼          ▼
Fix cost   Set up     Enable    Build      Test &
tracking   job queue  web_search async UI   polish
```

**Total estimated time: ~8-10 hours of focused work.**
