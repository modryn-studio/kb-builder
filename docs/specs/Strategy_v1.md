# KB Builder — Product Strategy v1

**Date:** February 13, 2026  
**Status:** Active  
**Supersedes:** Vision.md (multi-component), Component_1_Vision.md (technical)

---

## One-Liner

**The best instruction manual for any tool or website on the internet — generated in 2 minutes, free forever.**

---

## Core Beliefs

1. **No gatekeepers.** No API keys, no accounts, no paywalls. Type a name, get a manual.
2. **Low cognitive load.** One text input. One button. Zero decisions for the user.
3. **Library first, generator second.** Most value comes from *browsing* what exists, not generating new.
4. **Data flywheel.** Every generation, view, and rating makes the next manual better.
5. **Ship fast, learn faster.** Production MVP beats perfect vaporware. Always.

*Alignment: [development-principles.md](../development-principles.md)*

---

## What Changed from Vision v2

| Decision | Vision v2 | Strategy v1 | Why |
|----------|-----------|-------------|-----|
| **API keys** | BYOK (user provides Perplexity key) | Server-side key (user sees nothing) | "No gatekeepers, low cognitive load" |
| **Monetization** | Freemium ($10/mo) | Free forever + donations | Owner doesn't want to monetize |
| **Homepage** | Empty input field | Manual library (browse first) | Library > generator for discovery |
| **Target input** | Software tools only | Tools AND websites | Same engine, broader reach |
| **Feedback** | Thumbs up/down only | Stars + messages + email collection | Richer data flywheel |
| **Data persistence** | In-memory (lost on restart) | Blob-backed (persistent) | Zero-config persistence |
| **Admin endpoint** | Public `/api/admin/feedback` | Secret-key protected | Security fix |
| **Tool validation** | None (user types anything) | Pre-validation with LLM | Prevent wasted $0.80 generations |

---

## Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                 │
│                                                                  │
│   Homepage (/)                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Hero: "The best instruction manual for any tool        │   │
│   │         or website on the internet"                      │   │
│   │                                                          │   │
│   │  [Search: "Type any tool or website name..."] [Generate] │   │
│   │                                                          │   │
│   │  Popular: VS Code · Figma · Notion · ChatGPT · GitHub   │   │
│   │                                                          │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│   │  │ VS Code  │ │  Figma   │ │  Notion  │ │  ChatGPT │   │   │
│   │  │ 47 feat  │ │ 38 feat  │ │ 42 feat  │ │ 29 feat  │   │   │
│   │  │ ★★★★★    │ │ ★★★★☆    │ │ ★★★★★    │ │ ★★★★☆    │   │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│   │                                                          │   │
│   │  Browse All Manuals →                                    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  If tool exists in library → /manual/[slug] (instant)    │   │
│   │  If tool is new:                                         │   │
│   │    1. Pre-validate name (is this a real tool/website?)   │   │
│   │    2. Create job → /pending (2-3 min wait)               │   │
│   │    3. Store in Blob → available forever                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Manual Page (/manual/[slug])                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Full manual with:                                       │   │
│   │  - Overview, Features, Shortcuts, Workflows, Tips        │   │
│   │  - Star rating (1-5) per section                         │   │
│   │  - "Report issue" / "Request feature" button             │   │
│   │  - Optional email signup for updates                     │   │
│   │  - Share / Export / Copy link                            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Feedback Modal                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Type: [Bug] [Feature Request] [Inaccuracy] [Other]     │   │
│   │  Message: [textarea]                                     │   │
│   │  Email (optional): [input] "Get notified of updates"    │   │
│   │  [Submit]                                                │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Homepage Spec

### Hero Section

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│        The best instruction manual for any                │
│        tool or website on the internet.                   │
│                                                           │
│   AI reads the entire internet about your tool —          │
│   official docs, tutorials, Reddit, GitHub —              │
│   and creates one comprehensive manual in 2 minutes.      │
│                                                           │
│   ┌───────────────────────────────────────┐ ┌──────────┐ │
│   │ Search tools & websites...            │ │ Generate │ │
│   └───────────────────────────────────────┘ └──────────┘ │
│                                                           │
│   Popular: VS Code · Figma · Notion · GitHub · Vercel     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Design principles:**
- Clean, minimal, one action (Apple style)
- No signup, no API key input, no settings
- Popular tools as quick-links (click = instant manual)
- Subtle animation on the search bar (pulsing border or typing effect)

### Library Grid

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  Browse the Library                           [See all →] │
│                                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  │ 📘         │ │ 🎨         │ │ 📝         │            │
│  │ VS Code    │ │ Figma      │ │ Notion     │            │
│  │ 47 features│ │ 38 features│ │ 42 features│            │
│  │ 32 shortcu │ │ 28 shortcu │ │ 15 shortcu │            │
│  │ ★★★★★ (12)│ │ ★★★★☆ (8) │ │ ★★★★★ (6) │            │
│  └────────────┘ └────────────┘ └────────────┘            │
│                                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  │ 🤖         │ │ 🐙         │ │ ▲          │            │
│  │ ChatGPT    │ │ GitHub     │ │ Vercel     │            │
│  │ 29 features│ │ 51 features│ │ 33 features│            │
│  │ 8 shortcut │ │ 42 shortcu │ │ 12 shortcu │            │
│  │ ★★★★☆ (4) │ │ ★★★★★ (15)│ │ ★★★★☆ (3) │            │
│  └────────────┘ └────────────┘ └────────────┘            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Card design:**
- Tool name + emoji/icon
- Key stats (features, shortcuts count)
- Star rating (community average)
- Click → instant manual view

### Value Proposition Section

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  Why KB Builder?                                          │
│                                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐      │
│  │ 🔍 Google gives you  │  │ 📘 KB Builder gives  │      │
│  │ 10 scattered results │  │ you ONE complete     │      │
│  │ Blog posts from 2023 │  │ manual with FRESH    │      │
│  │ YouTube videos (15m) │  │ data from today      │      │
│  │ Reddit threads       │  │ Features, shortcuts, │      │
│  │ Outdated docs        │  │ workflows, tips —    │      │
│  │                      │  │ all structured       │      │
│  └──────────────────────┘  └──────────────────────┘      │
│                                                           │
│  "We read the entire internet so you don't have to."      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### How It Works (3-step)

```
  1. Type          →  2. Wait 2 min    →  3. Master it
  Any tool or         AI searches the      Complete manual
  website name        entire internet      forever free
```

### Footer

```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  Built with ❤️ by Modryn Studio                           │
│                                                           │
│  ☕ Support this project (ko-fi link)                     │
│                                                           │
│  This is free forever. Help us keep it running.           │
│  X manuals generated · Y total views · $Z spent           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Transparency dashboard:**
- Show real numbers (manuals generated, total views, monthly cost)
- "This project costs $X/month to run. Your support helps."
- Ko-fi / GitHub Sponsors link

---

## Growth Strategy

### Phase 1: Seed the Library (Week 1)

**Goal:** Launch with content, not an empty tool.

**Action:** Automate generation of top 50-100 tools:
```
Dev Tools:     VS Code, Cursor, GitHub, GitLab, Linear, Jira, Vercel, Netlify
Design:        Figma, Framer, Canva, Adobe XD, Photoshop, Illustrator
Productivity:  Notion, Obsidian, Todoist, Trello, Google Docs, Slack
AI:            ChatGPT, Claude, Midjourney, Stable Diffusion, Copilot
No-Code:       Webflow, Bubble, Airtable, Supabase, Firebase
Websites:      YouTube, Reddit, Twitter/X, LinkedIn, ProductHunt
```

**Cost:** ~$40-80 (one-time)

**Why users first is also smart:** "I need your help building this library" is great marketing:
- Creates ownership ("I contributed the Figma manual")
- Creates community (Discord/Twitter thread of requests)
- Free content generation (users pay $0, you pay $0.80 per manual, but they spread the word)
- Viral loop: "I just generated a manual for [tool], check it out!"

**Hybrid approach (recommended):**
1. Pre-generate top 20 tools yourself ($16)
2. Launch with: "We have 20 manuals. Help us reach 100! Request your favorite tool."
3. Users submit requests → you approve → generate
4. Feature "Community Contributors" on homepage

### Phase 2: Distribution (Week 2-3)

**SEO (organic):**
- Each manual at `/manual/[slug]` is a unique, high-quality page
- Title: `{Tool Name} Complete Manual — Features, Shortcuts, Workflows | KB Builder`
- Meta description: AI-generated summary
- Structured data (Schema.org HowTo / SoftwareApplication)
- OG images with tool stats

**Social:**
- Tweet each new manual: "Just generated a complete manual for {tool}. 47 features, 32 shortcuts."
- Reddit posts in r/[tool] subreddits: "I built an AI tool that generates comprehensive manuals"
- ProductHunt launch: "KB Builder — AI reads the internet so you don't have to"
- Hacker News: "Show HN: I built an AI-powered manual generator"

**Viral mechanics:**
- Share button on each manual (pre-formatted tweet)
- "Generated by KB Builder" watermark in exports
- "This manual was viewed X times" social proof

### Phase 3: Community (Month 2+)

- **Ratings drive quality:** Most-rated manuals surface to top
- **Feedback loop:** User reports "shortcuts section is wrong" → you regenerate that section
- **Email list:** Users who opted in get notified when their tool's manual is updated
- **Contributor credits:** "This manual was requested by @user"

---

## Cost Model (No Monetization)

### Fixed Costs
| Item | Monthly | Annual |
|------|---------|--------|
| Vercel Hosting | $0 (free tier) | $0 |
| Vercel Blob (1GB) | $0 (free tier) | $0 |
| Domain (optional) | $1 | $12 |
| **Total fixed** | **$1** | **$12** |

### Variable Costs (Perplexity API)
| Scenario | Generations/mo | Cost/mo |
|----------|---------------|---------|
| **Seed phase** | 100 (one-time) | $80 |
| **Low traffic** | 5 new | $4 |
| **Medium traffic** | 20 new | $16 |
| **High traffic** | 50 new | $40 |

**Key insight:** Cache hit rate increases over time. By month 3, 90%+ of requests serve cached manuals ($0 cost). Only truly new/niche tools trigger generation.

### Sustainability
- Ko-fi / GitHub Sponsors link in footer
- Transparency: "This project costs ~$X/month. Support helps."
- If costs exceed $50/month → introduce longer cache (7 days → 30 days)
- Nuclear option: Pause new generations, library still accessible forever

---

## Technical Changes (This Session)

### 1. Remove BYOK — Server-Side API Key Only

**Before:** User inputs Perplexity API key, stored in localStorage  
**After:** Server uses `PERPLEXITY_API_KEY` env var, user sees nothing

**Files changed:**
- `src/app/kb-builder/page.tsx` → Remove API key input, validation UI, cost tracker
- `src/app/api/jobs/create/route.ts` → Use server key instead of user key
- `src/app/api/generate/route.ts` → Remove `apiKey` from request body
- `src/app/api/validate-key/route.ts` → Delete (no longer needed)
- `src/lib/db.ts` → Remove `apiKey` field from job type
- `src/app/pending/page.tsx` → Remove API key check in retry

### 2. Blob Persistence for Jobs + Feedback

**Before:** In-memory Map + Array (lost on restart)  
**After:** Write to Blob on changes, read on startup

**New file:** `src/lib/blob-persistence.ts`
```typescript
// Save: put("_internal/jobs.json", JSON.stringify(jobs))
// Save: put("_internal/feedback.json", JSON.stringify(feedback))
// Load: On first access, fetch from Blob and hydrate Maps
```

### 3. Tool Name Pre-Validation

**New file:** `src/lib/validate-tool.ts`

Pre-flight check using Perplexity `sonar` model (~$0.001):
- Is this a real tool/website?
- Normalize the name (vscode → Visual Studio Code)
- Return type: `software` | `website` | `invalid`

### 4. Website Support

**Prompt changes:**
- Detect type from pre-validation
- For websites: emphasize navigation, account features, settings
- For software: emphasize keyboard shortcuts, workflows, integrations

**UI changes:**
- Placeholder: "Search tools & websites..." (not just "tools")
- Homepage copy: "tool or website"

### 5. Enhanced Feedback System

**New endpoints:**
- `POST /api/feedback/message` — Bug reports, feature requests, messages
- `GET /api/admin/feedback?key=SECRET` — Protected admin view

**Schema additions:**
- Star rating (1-5) per manual (overall)
- Message type: `bug | feature | inaccuracy | other`
- Optional email field
- Persist all feedback to Blob

### 6. Star Ratings

**On manual page:**
- Overall star rating (1-5 stars, clickable)
- Display average + count: "★★★★☆ (12 ratings)"
- Store per-slug in Blob feedback

**On library cards:**
- Show average rating + count
- Sort option: "Highest rated"

### 7. Secure Admin Endpoint

**Before:** `/api/admin/feedback` — public, exposes IP addresses  
**After:** `/api/admin/feedback?key=ADMIN_SECRET` — secret-key gated

---

## Information Architecture (Updated)

```
/                           → Homepage (hero + library grid + value prop)
/manual/[slug]              → View manual
/manuals                    → Browse all manuals (full library)
/pending                    → Your pending generations
/generate                   → Generate new manual (secondary, linked from homepage)
/api/jobs/create            → POST: Create generation job
/api/jobs                   → GET: List user's jobs
/api/jobs/[id]              → GET: Job status
/api/jobs/[id]/process      → POST: Internal processing
/api/manuals                → GET: List all manuals
/api/manual/[slug]          → GET: Manual JSON
/api/manual/[slug]/feedback → POST: Thumbs + stars
/api/manual/[slug]/versions → GET: Version history
/api/feedback/message       → POST: User messages (bugs, features, emails)
/api/admin/feedback         → GET: Admin view (secret-key protected)
/api/cron/process           → POST: Cron safety net
```

---

## Community Building

### "Help us build this library"

**Landing page section:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Help us build the world's best manual library.

  We've generated [X] manuals so far.
  Request any tool or website — we'll add it in 2 minutes.

  [Request a Manual]

  ☕ This project is free forever. Support us on Ko-fi.
  
  [View all X manuals →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Why this is great marketing:
1. **Ownership:** Users feel invested ("I requested the Figma manual")
2. **Organic growth:** Every manual is a shareable URL
3. **SEO:** More manuals = more indexed pages = more organic traffic
4. **Community:** Discord/Twitter becomes a request queue
5. **Cost sharing:** Power users donate voluntarily

---

## Success Metrics

### Week 1 (Launch)
- [ ] 20+ manuals in library (pre-generated)
- [ ] Homepage live with library grid
- [ ] First 10 external users

### Month 1
- [ ] 100 manuals in library
- [ ] 500 unique visitors
- [ ] 50% cache hit rate
- [ ] Average rating ≥ 4.0 stars
- [ ] 10 user-submitted feedback messages

### Month 3
- [ ] 500 manuals in library
- [ ] 5,000 unique visitors/month
- [ ] 90%+ cache hit rate (most requests served from library)
- [ ] Featured on ProductHunt or Hacker News
- [ ] $20+ monthly in donations (covers API costs)

### Month 6
- [ ] 1,000+ manuals
- [ ] 25,000 unique visitors/month
- [ ] Top 10 Google result for "[tool name] manual" for top 50 tools
- [ ] Community contributors actively requesting manuals
- [ ] Self-sustaining (donations ≥ API costs)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API costs exceed budget | Medium | High | Extend cache to 30 days, pause new gen, donations |
| Perplexity API goes down | Low | High | Fallback to direct Claude + Tavily search |
| Low-quality manuals | Medium | Medium | Pre-validation + post-generation scoring |
| No users find it | High | High | SEO, social sharing, ProductHunt launch |
| Abuse (spam generation) | Medium | Medium | Rate limit 3/month per session, IP-based |
| Legal (copyright claims) | Low | Medium | AI-generated synthesis, not copying. Add disclaimer |

---

## Alignment with Development Principles

| Principle | How This Applies |
|-----------|-----------------|
| **Focus and solve your own problems** | You want to learn tools faster — so does everyone |
| **Start with a micro niche** | Power users who learn new tools weekly |
| **Start small. Don't think big.** | One input, one button, one output |
| **Onboard to value in <2 minutes** | Type name → get manual (no signup, no config) |
| **Data Flywheel Hack** | Every generation + rating trains better prompts |
| **Share your ideas freely** | Open library, shareable URLs, community building |
| **Your enemy is perfection, BUT first prototype must function really well** | Manuals must be accurate + comprehensive. UI can be simple. |
| **AI-First Development** | Entire product is one AI agent call |

---

## Next Session Todo

1. Implement all technical changes (items 1-7 above)
2. Build new homepage (hero + library grid + value prop)
3. Pre-generate 20 seed manuals
4. Deploy to Vercel
5. Write ProductHunt copy
6. Share on Twitter / relevant subreddits

---

**This is not a tool. It's a library. Build the library.**
