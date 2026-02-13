# Component 1 Vision: KB Builder

**Turn any software tool name into the best instruction manual on the internet in 2-3 minutes.**

---

## What Is This?

KB Builder is an AI-powered manual generator that creates comprehensive, structured instruction manuals for any software tool through fresh web research and intelligent synthesis.

**Input:** Tool name (e.g., "Figma", "VS Code", "Supabase")  
**Output:** Complete JSON manual with features, shortcuts, workflows, tips, common mistakes, and recent updates  
**Time:** 130-160 seconds (with live web search)  
**Cost:** ~$0.40-1.40 per manual  

---

## Why This Exists

### The Problem

1. **Software onboarding is terrible** — most users never discover 80% of a tool's capabilities
2. **Documentation is scattered** — official docs, YouTube tutorials, Reddit tips, blog posts
3. **Knowledge decays fast** — tools update monthly, docs lag by months or never update
4. **Generic tutorials don't fit your workflow** — you need contextual, workflow-specific guidance

### The Solution

AI that:
- **Reads the entire internet** about a tool in real-time
- **Synthesizes** scattered knowledge into one structured source
- **Stays current** via web search (no stale training data)
- **Generates instantly** — no human curation bottleneck

---

## Core Principles

### 1. **Structured Data from Day One**
Manuals are JSON documents with explicit schemas (Zod-validated). This enables:
- Semantic search within a manual
- Programmatic filtering (show me only "advanced" features)
- API access for other tools
- Cross-manual knowledge graphs (future)

**Not:** Unstructured markdown that requires parsing.

### 2. **Fresh Web Research Always**
Every generation hits live web sources via Perplexity's `web_search` tool:
- Official docs
- Recent blog posts
- Stack Overflow discussions
- GitHub issues/releases
- Tutorial videos

**Not:** Relying on training data (Claude's May 2025 cutoff is 9 months stale).

### 3. **Async UX (Sora-Inspired)**
Users don't wait 2.5 minutes staring at a spinner:
- Submit → instant ack → job queued
- Close the tab, come back later
- Browser notification when ready
- Progress visible in `/pending` page

**Not:** Synchronous request-response that times out or frustrates users.

### 4. **Ship Fast, Iterate Faster**
Current implementation choices prioritize **working now** over **theoretically optimal**:
- In-memory job store (not Postgres) — fast to ship, easy to swap later
- Single model (Opus 4-6 only) — reliable > fallback chains
- No retries (1 attempt at 180s) — better than 2×120s with a slow API
- Prompt-based validation (not strict JSON schema) — more flexible, equally reliable

**Philosophy:** Production-ready MVP beats perfect vaporware.

### 5. **Data = Moat**
Every manual generated:
- Logs cost, latency, token counts, citation sources
- Tracks user feedback (thumbs up/down on sections)
- Identifies prompt/model failures

This data trains:
- Better prompts (what works for different tool types?)
- Smarter caching (which tools get regenerated often?)
- Quality scores (which manuals are most used?)

**Future:** Your manual generation gets better every day because thousands of manuals came before it.

---

## What It Is Today (v5.0)

### Architecture

```
User submits tool name
    ↓
Job created (status: queued) — instant 201 response
    ↓
Fire-and-forget: HTTP POST to /api/jobs/[id]/process
    ↓
Background worker:
  1. Perplexity Agent API (Claude Opus 4-6 + web_search)
  2. Parse & validate JSON (Zod + transform layer)
  3. Store in Vercel Blob (versioned + latest.json)
  4. Update job (status: completed, attach URL + cost)
    ↓
User sees: /pending shows live progress (polling every 3s)
    ↓
Browser notification fires on completion → opens manual
    ↓
Manual viewable at /manual/[slug] forever
```

### Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| **Framework** | Next.js 16.1.6 (App Router) | Server components, API routes, native cron |
| **AI** | Perplexity Agent API (`anthropic/claude-opus-4-6` + `web_search`) | Fresh web data, agentic search, single API call |
| **Storage** | Vercel Blob | Zero-config, CDN-backed, public URLs |
| **Job Queue** | In-memory Map (abstracted) | Fast to ship, no ops, easy to swap to Neon later |
| **Validation** | Zod v4.3.6 | Runtime schema enforcement, TypeScript types |
| **UI** | React 19 + Tailwind v4 | Fast, minimal JS, modern |

### Key Features

✅ **Async job queue** — submit instantly, process in background  
✅ **Live web search** — current data from official docs + community  
✅ **Cost tracking** — real token counts + fallback estimation  
✅ **Progress polling** — Sora-style pending page with elapsed time  
✅ **Browser notifications** — get alerted when manual is ready  
✅ **24h cache** — same tool returns instant result if generated recently  
✅ **Rate limiting** — 5 jobs/min per session (prevents abuse)  
✅ **Cron safety net** — picks up stuck jobs every 2 minutes  
✅ **Session-based** — no auth, localStorage UUID for job isolation  
✅ **Manual index** — browse all generated manuals at `/manuals`  

### Quality Guarantees

**Schema enforcement:**
- Every manual passes Zod validation
- Transform layer handles ~15 common model output variations
- Missing fields filled with sensible defaults
- Invalid enum values normalized automatically

**Fresh data:**
- Every generation includes 5-10 web search queries
- Citations tracked and exposed in manual
- Cost breakdown shows model + search costs separately

**Reliability:**
- 100% success rate in testing (after v5.0 bug fixes)
- Error handling at every layer (API, validation, storage)
- Failed jobs show clear error messages with retry option

---

## Key Design Decisions (and Why)

### Decision 1: In-Memory Job Store (Not Postgres)

**What:** Jobs stored in `Map<string, GenerationJob>` in Node process memory.

**Why:**
- ✅ Zero setup (no database connection string, migrations, schema)
- ✅ Fast writes/reads (no network latency)
- ✅ Abstracted cleanly (`db.ts` exports job CRUD functions)
- ✅ Easy to swap later (Postgres/Neon drop-in replacement)

**Tradeoff:**
- ❌ Jobs lost on server restart (acceptable for MVP)
- ❌ Can't scale horizontally (single-process only)

**When to change:** When we hit 1000+ concurrent users or need job persistence across deploys.

### Decision 2: Perplexity (Not Direct Claude)

**What:** Use Perplexity Agent API with Claude Opus 4-6 model + web_search tool.

**Why:**
- ✅ Integrated web search (no separate search API needed)
- ✅ Agentic behavior (decides how many searches to run)
- ✅ Citations automatically tracked
- ✅ Single billing provider

**Tradeoff:**
- ❌ Costs $15/$75 per M tokens (5×-10× markup over Claude direct $3/$15)
- ❌ Slower (web search adds 60-90s vs 70s without)

**Why it's worth it:** Claude's training cutoff is May 2025. In February 2026, that's 9 months stale. Web search makes manuals current.

### Decision 3: No Streaming UI (Synthetic Progress Only)

**What:** Progress bar is estimated (based on 150s baseline), not real-time.

**Why:**
- ✅ Perplexity SDK streaming is broken (yields 0 chunks despite creating iterator)
- ✅ Async architecture makes real-time less critical (user doesn't wait)
- ✅ Users prefer *any* feedback over blank screen

**Tradeoff:**
- ❌ Progress bar sometimes reaches 95% then jumps to 100% (not perfectly smooth)

**When to change:** If Perplexity fixes SDK streaming (monitor v0.26+ releases).

### Decision 4: One Model, No Retries

**What:** Only use `anthropic/claude-opus-4-6`. Max 1 attempt per job (no retries).

**Why:**
- ✅ Opus 4-6 is the *only* model that works with Agent API (Sonnet 4-5 returns 400)
- ✅ 1×180s succeeds more often than 2×120s (API is slow, short timeouts cause false failures)
- ✅ Failed jobs show clear errors → user can retry manually

**Tradeoff:**
- ❌ No fallback model if Opus 4-6 goes down

**When to change:** When Perplexity adds more compatible models to Agent API.

### Decision 5: Prompt-Based Validation (Not Strict JSON Schema)

**What:** Include JSON schema in prompt text, validate output with Zod post-generation.

**Why:**
- ✅ `response_format` + `web_search` are incompatible (API constraint, not a bug)
- ✅ Prompt-based works reliably (~100% success after transform layer)
- ✅ More flexible (can handle minor variations, then normalize)

**Tradeoff:**
- ❌ Model *could* return invalid JSON (though hasn't in 10+ tests)

**When to change:** If Perplexity adds streaming-compatible JSON schema enforcement.

---

## What's Next (Roadmap)

### Immediate (Week 1)
- [ ] **Deploy to production** (Vercel)
- [ ] **Generate 10+ test manuals** (VS Code, Figma, Notion, etc.)
- [ ] **Monitor quality** (are manuals useful? any missing sections?)
- [ ] **Collect user feedback** (thumbs up/down on sections)

### Short-Term (Month 1)
- [ ] **Upgrade job store to Neon** (persist jobs across restarts)
- [ ] **Add manual versioning UI** (view history, compare changes)
- [ ] **Tool categorization** (tag manuals: dev-tools, design, productivity, etc.)
- [ ] **Search across manuals** (find all tools with feature X)
- [ ] **Export formats** (PDF, Markdown, Notion import)

### Medium-Term (Month 2-3)
- [ ] **Custom manual sections** (user can request "I want more workflows")
- [ ] **Manual merging** (combine knowledge from multiple tools)
- [ ] **Quality scoring** (auto-detect incomplete manuals, trigger regeneration)
- [ ] **Multi-language support** (generate manuals in Spanish, French, etc.)
- [ ] **API access** (let other apps query the knowledge base)

### Long-Term (Month 4+)
- [ ] **Hybrid architecture** (LLM + traditional search for super fast lookups)
- [ ] **Cross-tool workflows** (e.g., "Figma → VS Code → Vercel" deployment guides)
- [ ] **User contributions** (community can suggest edits, model learns from them)
- [ ] **Agent-to-agent** (other AI agents can query KB Builder to learn tools)

---

## What This Isn't (Scope Boundaries)

### Not a Tutorial Platform
**We are:** Comprehensive reference manuals (discover what exists)  
**We're not:** Step-by-step courses with videos and quizzes

### Not a Documentation Aggregator
**We are:** AI synthesis (read everything, create one coherent source)  
**We're not:** Link collector (just showing you where docs are)

### Not Tool-Specific
**We are:** Generic (works for any software tool with online documentation)  
**We're not:** Deep integrations with tool APIs (e.g., Figma plugin architecture analysis)

### Not Real-Time Help
**We are:** Exploration mode ("teach me everything before I start")  
**We're not:** Contextual mode ("watch me work and help in real-time")
  - **Note:** That's Components 2 & 3 in the [tool-copilot repo](https://github.com/modryn-studio/tool-copilot)

---

## Success Metrics

### For MVP (Month 1)
- ✅ **Generation success rate:** >95% (currently 100% in testing)
- ✅ **Average generation time:** <180s (currently ~150s with web search)
- ✅ **Cost per manual:** <$1.50 (currently ~$0.40-1.40 depending on tool complexity)
- 🎯 **User satisfaction:** >80% thumbs-up on generated sections
- 🎯 **Manual reuse:** >50% of manuals viewed multiple times

### For Scale (Month 3)
- 🎯 **Manuals generated:** 1000+ unique tools
- 🎯 **Daily active users:** 100+
- 🎯 **Cache hit rate:** >40% (same tool requested within 24h)
- 🎯 **API uptime:** >99.5%

### For Product-Market Fit (Month 6)
- 🎯 **User retention:** >60% weekly active (of users who generated 1+ manual)
- 🎯 **Organic growth:** >30% of new users from referrals/word-of-mouth
- 🎯 **Enterprise interest:** 5+ companies requesting team accounts
- 🎯 **Revenue:** $1000+ MRR from premium features

---

## Business Model (Future)

### Freemium Core
- **Free tier:** 5 manuals/month, public manuals only
- **Pro ($10/mo):** Unlimited manuals, private manuals, priority queue, export formats
- **Team ($50/mo):** Shared workspace, team analytics, API access

### Enterprise Add-Ons
- **Internal tool manuals** (generate docs for proprietary tools)
- **Custom sections** (request specific workflows/use cases)
- **SSO + compliance** (SOC 2, GDPR, HIPAA)
- **Dedicated instances** (isolated infrastructure for security)

### API Revenue
- **Usage-based pricing:** $0.10 per manual generation (for developers integrating KB Builder)
- **Academic/research discount:** 50% off for .edu emails

---

## Technical Debt & Known Issues

### High Priority
- **In-memory job store:** Will lose jobs on restart (need Neon/Postgres)
- **No horizontal scaling:** Single process only (need distributed queue)
- **ESLint config broken:** Next.js 16 + ESLint 9 compatibility issue (non-blocking, TypeScript catches everything)

### Medium Priority
- **Streaming UI:** Synthetic progress only (SDK streaming broken)
- **Token count accuracy:** Falls back to estimation sometimes (API doesn't always return usage)
- **Single model:** No fallback if Opus 4-6 fails

### Low Priority (Acceptable Trade-offs)
- **No auth:** Session-based only (intentional simplicity for MVP)
- **No manual editing:** Generated content is immutable (prevents quality degradation)
- **No batch generation:** One tool at a time (prevents resource exhaustion)

---

## Dependencies & Risks

### External Dependencies
| Service | Risk | Mitigation |
|---------|------|------------|
| **Perplexity API** | Rate limits, downtime, pricing changes | Cache aggressively, monitor usage, fallback to direct Claude if needed |
| **Vercel Blob** | Storage limits, cost scaling | Implement manual expiration (90 days?), compress JSON |
| **Vercel Functions** | Cold starts, timeout limits | Keep functions warm, optimize bundle size |
| **Claude Model** | Training data staleness, API changes | Web search compensates, version lock SDK |

### Technical Risks
- **Cost explosion:** Runaway jobs generating thousands of tokens
  - *Mitigation:* Rate limiting (5/min), `max_output_tokens: 65536` cap
- **Quality degradation:** Model returns invalid/incomplete manuals
  - *Mitigation:* Schema validation, transform layer, error logging
- **Storage growth:** Blobs accumulate indefinitely
  - *Mitigation:* Implement cleanup (delete manuals >90 days old with 0 views)

---

## The Bet

**Thesis:** The best instruction manual for any tool is one that:
1. **Reads everything** (official docs + community knowledge)
2. **Synthesizes intelligently** (AI understands intent, not just keyword matching)
3. **Stays current** (real-time web search, not stale training data)
4. **Structures knowledge** (programmatic access, not just prose)

**If we're right:** This becomes the default way people learn new tools. Google/YouTube are discovery, KB Builder is mastery.

**If we're wrong:** Either:
- Official docs are "good enough" (people don't value comprehensive synthesis)
- Tools change too fast (manuals are outdated within hours, can't keep up)
- Cost too high (users won't pay for better docs)

**Early signal:** If users generate the same manual multiple times (testing) vs. bookmark and return to it (using), we know if it's valuable.

---

## How to Contribute

This is a solo project currently, but key areas for contribution:

1. **Test manuals:** Try generating manuals for tools you know well. Is it accurate? Comprehensive? What's missing?
2. **Edge cases:** What tool names break the slugification? What tool types generate poor manuals?
3. **UI/UX feedback:** Is the async flow clear? Do notifications work on your OS/browser?
4. **Performance:** Where are the bottlenecks? Can we speed up generation?
5. **Cost optimization:** Can we get the same quality for less money?

---

## Related Work

This project exists in the context of:
- **Tool Copilot (parent vision):** KB Builder is Component 1 of 3
  - Component 2: Action Monitor (watch you work)
  - Component 3: Suggestion Engine (teach you better ways)
  - See [Vision.md](./Vision.md) for the full picture
- **Tool Copilot Monitor repo:** Where Components 2 & 3 are being built
  - [github.com/modryn-studio/tool-copilot-monitor](https://github.com/modryn-studio/tool-copilot-monitor)

KB Builder is intentionally **standalone** — it delivers value without the other components. But combined, they create a full AI learning assistant.

---

## Final Thoughts

This is not about building the perfect manual generator on day one. It's about:
- **Shipping fast** (v5.0 took ~10 hours of focused work)
- **Learning from users** (is this valuable? what's missing?)
- **Iterating based on data** (cost, latency, quality metrics guide decisions)
- **Staying flexible** (in-memory store is fine for now, swap later when needed)

The goal is **production-ready MVP**, not vaporware perfection.

If you can generate a useful manual in 2-3 minutes that would take a human 2-3 hours to research and write, that's a 60× productivity multiplier. That's enough to build a business on.

Everything else is optimization.

---

**Status:** Production-ready as of February 13, 2026  
**Version:** v5.0 (async architecture)  
**Repository:** [github.com/modryn-studio/kb-builder](https://github.com/modryn-studio/kb-builder)  
**Live Demo:** Coming soon (deploying to Vercel)
