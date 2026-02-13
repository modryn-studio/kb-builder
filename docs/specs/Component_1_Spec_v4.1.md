# Component 1: Knowledge Base Builder — Spec v4.1 (February 2026)

## What Changed from v4.0

| Area | v4.0 (Wrong) | v4.1 (Corrected) |
|---|---|---|
| **Claude model** | `claude-3-5-sonnet-20250215` (doesn't exist, legacy) | `claude-opus-4-6` (released Feb 5, 2026) |
| **Architecture** | Two-step: Perplexity Sonar → Claude structuring | **Single call** via Perplexity Agent API with `anthropic/claude-opus-4-6` + `web_search` tool |
| **Perplexity SDK** | Plain `fetch` to `/chat/completions` | Official `perplexityai` TypeScript SDK with `client.responses.create()` |
| **Structured output** | Claude `tool_use` workaround | Agent API native `response_format: { type: "json_schema" }` |
| **Citation handling** | Raw URLs embedded in JSON schema fields | Citation by **index** — API response provides `citations[]` array, schema references by index |
| **Cost estimate** | ~$0.057/generation | ~$0.50-0.85/generation with Opus 4.6 + web search invocations |
| **Perplexity API shape** | OpenAI chat completions format | Agent API Responses format (`client.responses.create()`) |

### Why Single-Call Architecture?

Perplexity's Agent API (launched 2025) lets you use **any third-party model** (Claude, GPT, Gemini, Grok) with built-in `web_search` and `fetch_url` tools, plus native structured output via `response_format`. This collapses the two-step pipeline into one:

```
OLD (v4.0):  User → Perplexity sonar-pro (research) → Claude (structure) → Blob
NEW (v4.1):  User → Perplexity Agent API [claude-opus-4-6 + web_search + json_schema] → Blob
```

**Benefits:**
- One SDK, one API key, one billing provider
- Claude decides when/what to search (agent behavior, not scripted)
- Structured output enforced at the API level
- Built-in streaming SSE
- Model fallback chains (`["anthropic/claude-opus-4-6", "anthropic/claude-sonnet-4-5"]`)

### Why Opus 4.6 Over Sonnet 4.5?

- **128K max output** vs 64K — big tools like VS Code, Supabase, Figma produce large manuals
- **Adaptive thinking** (Sonnet doesn't have it) — Claude plans before generating complex structured output
- **Knowledge cutoff: May 2025** vs Jan 2025 — more recent training data
- Cost difference is ~$0.35/generation at MVP scale — irrelevant

### Citation Safety

Perplexity docs explicitly warn:
> "Links in JSON Responses may not always work reliably and can result in hallucinations. Use the `citations` or `search_results` fields from the API response."

**Solution:** Schema uses `sourceIndices: number[]` pointing to the API response's `citations` array. Post-processing maps indices → real URLs.

---

## Mission

Turn any software tool name into the best instruction manual on the internet in under 60 seconds. Structured data from day one. Every generation makes the next one better.

---

## Principles Applied

| Principle | How It Shows Up |
|---|---|
| Ship in days, not weeks | One API route, one UI page, one storage layer. No auth, no accounts. |
| One killer feature | Input tool name → get comprehensive manual with shareable link |
| Function really well | Streaming UX, validation pipeline, graceful degradation |
| Data collection from day one | Every generation logged with cost, latency, quality metrics |
| Data flywheel | User thumbs up/down on sections informs prompt improvements |
| Onboard to value in <2 min | Type name, click button, see manual. Under 60 seconds. |
| AI-first | Single-call agentic architecture: Claude + web search + structured output |

---

## Tech Stack (February 2026)

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Server components, streaming, API routes |
| **Generation** | Perplexity Agent API with `anthropic/claude-opus-4-6` | Single call: web search + structuring + JSON schema enforcement |
| **SDK** | `perplexityai` (official TypeScript SDK) | Type-safe, streaming, official support |
| **Storage** | Vercel Blob | Zero-config, CDN-backed, public URLs for JSON documents |
| **Cache/Queue** | Vercel KV (Redis) | Rate limiting, job status, generation caching |
| **Analytics** | Console logging + Vercel KV counters | Ship fast, no external dependency |
| **UI** | React 19 + Tailwind CSS v4 | Server components for manual rendering, minimal client JS |
| **Validation** | Zod + `zod-to-json-schema` | Runtime type validation, schema-first, feeds `response_format` |
| **Deployment** | Vercel | Obvious choice given stack |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│  1. POST /api/generate { tool: "Figma" }                        │
│  2. Receive streaming progress via ReadableStream (NDJSON)       │
│  3. Final payload: { shareableUrl, summary, citations }         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   /api/generate (Node.js runtime)                │
│                                                                 │
│  ┌──────────┐    ┌──────────────────────────┐    ┌──────────┐  │
│  │ Rate     │───▶│ Perplexity Agent API      │───▶│ Validate │  │
│  │ Limit    │    │ claude-opus-4-6           │    │ + Store  │  │
│  │ + Cache  │    │ + web_search tool         │    │ (Blob)   │  │
│  │ (KV)     │    │ + response_format (JSON)  │    │          │  │
│  └──────────┘    │ → Streaming SSE events    │    └──────────┘  │
│       │          └──────────────────────────┘          │        │
│       └──── KV: rate limits, cache, analytics ─────────┘        │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /manual/[slug] (SSR)                          │
│                                                                 │
│  Fetches latest.json from Blob → Renders clean HTML             │
│  - Table of contents                                            │
│  - Collapsible sections by category                             │
│  - Search within manual                                         │
│  - Source citations with links                                  │
│  - Feedback buttons (👍👎 per section)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Design

### `POST /api/generate`

**Request:**
```json
{
  "tool": "Figma",
  "forceRefresh": false
}
```

**Response:** `ReadableStream` (NDJSON — newline-delimited JSON)

```
{"event":"started","tool":"Figma","cached":false}
{"event":"progress","stage":"searching","message":"Searching official Figma documentation..."}
{"event":"progress","stage":"searching","message":"Found keyboard shortcuts reference..."}
{"event":"progress","stage":"structuring","message":"Building instruction manual..."}
{"event":"progress","stage":"validating","message":"Validating structure..."}
{"event":"progress","stage":"storing","message":"Saving manual..."}
{"event":"complete","shareableUrl":"https://app.com/manual/figma","summary":{"features":42,"shortcuts":28,"workflows":12,"tips":18,"commonMistakes":8,"coverageScore":0.91},"citations":["https://...","https://..."],"generationTimeMs":34200,"cost":{"model":0.45,"search":0.035,"total":0.485}}
```

**Errors:**
```
{"event":"error","code":"RATE_LIMITED","message":"Max 5 generations per minute","retryAfter":60}
{"event":"error","code":"GENERATION_FAILED","message":"Failed after 2 attempts","details":"..."}
```

### `GET /manual/[slug]`

Server-rendered HTML manual page. Fetches latest JSON from Blob, renders with React Server Components.

Query params:
- `?format=json` → Return raw JSON instead of HTML

### `GET /api/manual/[slug]/versions`

Returns version history from Blob storage.

### `POST /api/manual/[slug]/feedback`

```json
{
  "sectionType": "feature",
  "sectionId": "database-relations",
  "signal": "up",
  "comment": "Very helpful explanation"
}
```

---

## Instruction Manual JSON Schema

### Key Design Decision: Citation by Index

```
API Response:
  response.citations = ["https://notion.so/help", "https://notion.so/releases", ...]

Manual JSON:
  feature.sourceIndices = [0, 2]  // Points to citations[0] and citations[2]

Post-processing:
  feature.sources = [citations[0], citations[2]]  // Mapped to real URLs
```

### Zod Schema (Single Source of Truth)

```typescript
// lib/schema.ts

import { z } from "zod";

export const OverviewSchema = z.object({
  whatItIs: z.string(),
  primaryUseCases: z.array(z.string()).min(1),
  platforms: z.array(z.string()),
  pricing: z.string().optional(),
  targetUsers: z.array(z.string()).optional(),
});

export const FeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  whatItsFor: z.string(),
  whenToUse: z.array(z.string()).min(1),
  howToAccess: z.string(),
  relatedFeatures: z.array(z.string()).default([]),
  keywords: z.array(z.string()).min(1),
  powerLevel: z.enum(["basic", "intermediate", "advanced"]),
  sourceIndices: z.array(z.number().int().nonneg()).default([]),
});

export const ShortcutSchema = z.object({
  id: z.string(),
  keys: z.string(),
  action: z.string(),
  context: z.string().optional(),
  platforms: z.array(z.string()),
  keywords: z.array(z.string()),
  powerLevel: z.enum(["basic", "intermediate", "advanced"]),
  sourceIndices: z.array(z.number().int().nonneg()).default([]),
});

export const WorkflowStepSchema = z.object({
  step: z.number().int().positive(),
  action: z.string(),
  details: z.string().optional(),
  featuresUsed: z.array(z.string()).default([]),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  steps: z.array(WorkflowStepSchema).min(2),
  useCases: z.array(z.string()).min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedTime: z.string(),
  sourceIndices: z.array(z.number().int().nonneg()).default([]),
});

export const TipSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["productivity", "organization", "collaboration", "automation", "shortcuts"]),
  example: z.string().optional(),
  powerLevel: z.enum(["basic", "intermediate", "advanced"]),
  sourceIndices: z.array(z.number().int().nonneg()).default([]),
});

export const CommonMistakeSchema = z.object({
  id: z.string(),
  mistake: z.string(),
  whyItHappens: z.string(),
  correction: z.string(),
  severity: z.enum(["minor", "moderate", "major"]),
  keywords: z.array(z.string()),
});

export const RecentUpdateSchema = z.object({
  feature: z.string(),
  description: z.string(),
  impact: z.enum(["major", "minor"]),
  sourceIndices: z.array(z.number().int().nonneg()).default([]),
});

// Schema sent to Perplexity Agent API response_format
// Uses sourceIndices (numbers pointing to citations array)
export const InstructionManualGenerationSchema = z.object({
  schemaVersion: z.literal("4.1"),
  tool: z.string(),
  slug: z.string(),
  coverageScore: z.number().min(0).max(1),
  toolScope: z.enum(["enterprise", "standard", "simple"]),
  overview: OverviewSchema,
  features: z.array(FeatureSchema).min(1),
  shortcuts: z.array(ShortcutSchema).default([]),
  workflows: z.array(WorkflowSchema).min(1),
  tips: z.array(TipSchema).min(1),
  commonMistakes: z.array(CommonMistakeSchema).default([]),
  recentUpdates: z.array(RecentUpdateSchema).default([]),
});

// Final stored schema (after post-processing: indices resolved to URLs)
export const InstructionManualSchema = InstructionManualGenerationSchema.extend({
  generatedAt: z.string(),
  citations: z.array(z.string()),
  generationTimeMs: z.number(),
  cost: z.object({
    model: z.number(),
    search: z.number(),
    total: z.number(),
  }),
});

export type InstructionManualGeneration = z.infer<typeof InstructionManualGenerationSchema>;
export type InstructionManual = z.infer<typeof InstructionManualSchema>;
```

---

## Generation Module: Single-Call Agent API

```typescript
// lib/generate.ts

import Perplexity from "perplexityai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { InstructionManualGenerationSchema } from "./schema";

const client = new Perplexity();

const jsonSchema = zodToJsonSchema(InstructionManualGenerationSchema, {
  name: "instruction_manual",
  $refStrategy: "none",
});

export async function generateManual(
  toolName: string,
  onProgress?: (stage: string, message: string) => void
) {
  const slug = toolName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const startTime = Date.now();

  onProgress?.("searching", `Researching ${toolName}...`);

  const response = await client.responses.create({
    model: "anthropic/claude-opus-4-6",
    input: `Create a comprehensive instruction manual for the software tool: "${toolName}".

Search the web thoroughly for:
1. Official documentation and help center
2. Complete feature list with descriptions
3. Keyboard shortcuts for all platforms
4. Common workflows and how-to guides
5. Power user tips and hidden features
6. Common mistakes beginners make
7. Recent updates and new features (2025-2026)
8. Pricing, platforms, integrations

Be exhaustive. This manual should teach someone from beginner to power user.`,

    instructions: `You are an expert technical writer creating the definitive instruction manual for a software tool.

RESEARCH PHASE:
- Use web_search extensively to find official docs, shortcuts, workflows, tips
- Search at least 5-8 different queries to cover all aspects
- Prioritize official documentation, help centers, and changelogs

STRUCTURING PHASE:
After researching, structure everything into the required JSON schema.

QUALITY STANDARDS:
- Be accurate: Only include information you found via web search
- Be comprehensive: Cover the tool from beginner to advanced
- Be practical: Every feature must include whatItsFor, whenToUse, howToAccess
- Be honest: If the tool is simple, fewer items is fine. Quality over quantity.

CITATION RULES (CRITICAL):
- sourceIndices must reference the index positions of the citations returned by the search
- Use sourceIndices to indicate which search results support each claim
- If unsure about a fact, omit it rather than guess

SCHEMA RULES:
- schemaVersion: always "4.1"
- tool: exact tool name as commonly known
- slug: "${slug}"
- coverageScore: 0.0-1.0 reflecting how comprehensive the manual is
- toolScope: "enterprise" (50+ features), "standard" (15-50), "simple" (<15)
- shortcuts: can be empty array if tool has no keyboard shortcuts
- commonMistakes: can be empty array if research doesn't surface any
- powerLevel: "basic" (everyone uses), "intermediate" (power users), "advanced" (experts)
- All IDs must be unique kebab-case strings
- relatedFeatures should reference other feature IDs in the manual
- featuresUsed in workflow steps should reference feature IDs`,

    tools: [{ type: "web_search" }],

    response_format: {
      type: "json_schema",
      json_schema: {
        name: "instruction_manual",
        schema: jsonSchema,
      },
    },

    max_output_tokens: 128000,
  });

  const generationTimeMs = Date.now() - startTime;

  // Parse the structured output
  const manual = JSON.parse(response.output_text);

  // Get citations from the API response
  const citations: string[] = response.citations || [];

  // Calculate cost from usage
  const usage = response.usage;
  const inputCost = ((usage?.input_tokens || 0) / 1_000_000) * 5;
  const outputCost = ((usage?.output_tokens || 0) / 1_000_000) * 25;
  const searchCost = 0.005 * (/* count web_search invocations from response.output */ 5);

  return {
    manual,
    citations,
    generationTimeMs,
    cost: {
      model: inputCost + outputCost,
      search: searchCost,
      total: inputCost + outputCost + searchCost,
    },
  };
}
```

---

## Storage Layer

```typescript
// lib/storage.ts — Vercel Blob with versioning

import { put, list } from "@vercel/blob";

export async function storeManual(manual: InstructionManual): Promise<{
  blobUrl: string;
  shareableUrl: string;
  version: string;
}> {
  const version = new Date().toISOString().replace(/[:.]/g, "-");
  const serialized = JSON.stringify(manual, null, 2);

  // Store versioned copy
  const blob = await put(`manuals/${manual.slug}/${version}.json`, serialized, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  // Overwrite latest pointer
  await put(`manuals/${manual.slug}/latest.json`, serialized, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  return {
    blobUrl: blob.url,
    shareableUrl: `${process.env.NEXT_PUBLIC_APP_URL}/manual/${manual.slug}`,
    version,
  };
}

export async function getLatestManual(slug: string): Promise<InstructionManual | null> {
  try {
    // Use list to find the blob URL dynamically
    const { blobs } = await list({ prefix: `manuals/${slug}/latest.json` });
    if (blobs.length === 0) return null;
    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
```

---

## Streaming API Route

```typescript
// app/api/generate/route.ts

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { tool, forceRefresh } = await request.json();

  // 1. Validate input
  // 2. Rate limit via KV
  // 3. Check cache (skip if forceRefresh)
  // 4. Stream generation progress to client via ReadableStream (NDJSON)
  // 5. On complete: validate with Zod, map citation indices, store in Blob
  // 6. Send final "complete" event with shareable URL + summary
}
```

---

## Frontend

### Builder Page (`/kb-builder`)
- Text input for tool name
- "Build Instruction Manual" button
- Real-time streaming progress display
- Success state: summary stats, shareable link with copy button, "View Manual" link
- Error state: clear message with retry option

### Manual Viewer (`/manual/[slug]`)
- Server-rendered HTML from Blob JSON
- Table of contents sidebar
- Sections: Overview → Features → Shortcuts → Workflows → Tips → Common Mistakes → Recent Updates
- Each feature/shortcut/tip is a card with expandable details
- Source citations as footnote links  
- Feedback buttons (👍👎) per section
- Copy link button

---

## File Structure

```
kb-builder/
├── app/
│   ├── layout.tsx              # Root layout with Tailwind
│   ├── page.tsx                # Redirect to /kb-builder
│   ├── kb-builder/
│   │   └── page.tsx            # Builder form + streaming UI
│   ├── manual/
│   │   └── [slug]/
│   │       └── page.tsx        # SSR manual viewer
│   └── api/
│       ├── generate/
│       │   └── route.ts        # Streaming generation endpoint
│       └── manual/
│           └── [slug]/
│               ├── route.ts    # Raw JSON endpoint
│               ├── versions/
│               │   └── route.ts
│               └── feedback/
│                   └── route.ts
├── lib/
│   ├── schema.ts               # Zod schemas (single source of truth)
│   ├── generate.ts             # Perplexity Agent API generation
│   └── storage.ts              # Vercel Blob operations
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.local                  # API keys (not committed)
```

---

## Environment Variables

```bash
# .env.local
PERPLEXITY_API_KEY=pplx-...          # Perplexity API key (covers Agent API + Sonar)
BLOB_READ_WRITE_TOKEN=vercel_blob_... # Vercel Blob access token
KV_REST_API_URL=https://...           # Vercel KV Redis URL
KV_REST_API_TOKEN=...                 # Vercel KV auth token
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Base URL for shareable links
```

---

## Cost Analysis (Per Generation)

| Component | Estimate |
|---|---|
| Claude Opus 4.6 input tokens (~8K) | ~$0.04 |
| Claude Opus 4.6 output tokens (~16K) | ~$0.40 |
| Web search invocations (~5-8) | ~$0.025-0.04 |
| Vercel Blob storage | ~$0.00 (negligible) |
| **Total per generation** | **~$0.47-0.48** |

For simple tools (smaller output): ~$0.25-0.35
For enterprise tools (VS Code, Figma): ~$0.60-0.85

---

## Acceptance Criteria (v4.1 is DONE when...)

✅ User can input any tool name and get a manual with streaming progress in <60 seconds
✅ Manual includes features, shortcuts, workflows, tips, common mistakes
✅ All citations are real URLs from web search (not hallucinated)
✅ Shareable link works at `/manual/[slug]` — anyone can view
✅ Manual JSON is valid and passes Zod schema validation
✅ Rebuilding a tool overwrites `latest.json` but preserves version history
✅ Rate limiting: max 5 generations per minute per IP
✅ Cache: return existing manual if <24 hours old (unless forceRefresh)
✅ Cost tracking logged per generation
✅ Error handling: clear message if generation fails

**NOT required for v4.1:**
- Beautiful UI (functional > pretty, but Tailwind makes it decent)
- User accounts / auth
- Feedback collection backend (buttons render, backend is TODO)
- Manual editing

---

## Risks + Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Agent API first schema request takes 10-30s | High | Warn user on first load; schema is cached after first call |
| Claude returns invalid JSON despite schema | Medium | Validate with Zod; retry once with error context |
| Web search returns thin results for niche tools | Medium | Claude instructed to set lower coverageScore; UI shows "limited info" warning |
| Cost per generation higher than expected | Medium | Track per-generation cost; can drop to Sonnet 4.5 ($3/$15) |
| 60s Vercel function timeout exceeded | Medium | Set `maxDuration: 60`; Opus 4.6 is fast enough for most tools |
| Perplexity Agent API rate limits | Low | Rate limit users to 5/min; implement model fallback chain |
| Citations array empty | Low | Graceful degradation: show manual without source links |
