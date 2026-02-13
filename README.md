# KB Builder — Instant Instruction Manuals

Generate comprehensive instruction manuals for any software tool in ~30 seconds using AI-powered web research.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Perplexity API key ([get one here](https://www.perplexity.ai/settings/api))
- Vercel Blob storage token ([create project](https://vercel.com/docs/storage/vercel-blob))

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local and add your keys:
# PERPLEXITY_API_KEY=pplx-...
# BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
# Runs on http://localhost:3000
```

---

## 🧪 Internal Testing Checklist

### ✅ Core Generation Flow

- [ ] Navigate to http://localhost:3000 (should redirect to `/kb-builder`)
- [ ] Enter a tool name (try: "Figma", "VS Code", "Notion")
- [ ] Verify streaming progress updates appear in real-time
- [ ] Wait for completion (~30-40 seconds)
- [ ] Verify summary stats display (features, shortcuts, workflows, etc.)
- [ ] Verify cost estimate appears (~$0.50 average)
- [ ] Verify shareable link is generated
- [ ] Click "View Manual" button

### ✅ Manual Viewer Experience

- [ ] Verify manual loads at `/manual/[slug]` URL
- [ ] Check Table of Contents sidebar (visible on desktop)
- [ ] Verify TOC highlights current section on scroll
- [ ] Test all collapsible sections (Features, Shortcuts, Workflows, Tips, Common Mistakes)
- [ ] Verify citation links work (small numbered badges)
- [ ] Test "Copy Link" button (should copy manual URL to clipboard)
- [ ] Test feedback buttons (👍👎) on each section
- [ ] Verify feedback shows "Thanks!" after submission

### ✅ Edge Cases & Error Handling

**Rate Limiting:**
- [ ] Generate 6 manuals in quick succession → should see rate limit error on 6th
- [ ] Wait 60 seconds → should work again
- [ ] Submit 11 feedback items in quick succession → should see rate limit error on 11th

**Invalid Inputs:**
- [ ] Try empty tool name → should see validation error
- [ ] Try special characters only (`@#$%`) → should see "empty after sanitization" error
- [ ] Navigate to `/manual/invalid-slug-123` → should see "Manual Not Found" page

**Caching:**
- [ ] Generate manual for "Figma"
- [ ] Generate "Figma" again immediately → should return in <1s with "Using cached manual" message
- [ ] Verify same manual is displayed
- [ ] Use "Force Refresh" button → should regenerate with new search data

**Network Issues:**
- [ ] Start generation, then close browser tab → verify abort works (check server logs)
- [ ] Disable internet mid-generation → should timeout after 70s with error

### ✅ Mobile Responsiveness

- [ ] Test on mobile viewport (Chrome DevTools → Toggle Device Toolbar)
- [ ] Verify TOC sidebar hidden on mobile
- [ ] Verify all buttons accessible and tappable
- [ ] Verify collapsible sections work on touch
- [ ] Verify stats grid wraps properly (2 cols → 3 cols → 6 cols as screen grows)

### ✅ Data Correctness

- [ ] Generate manual for a tool you know well
- [ ] Verify features section has relevant, accurate information
- [ ] Check shortcuts table has correct key combos
- [ ] Verify workflows make logical sense
- [ ] Check tips are actionable and specific
- [ ] Review common mistakes section for relevance

### ✅ Shareable Links

- [ ] Copy shareable URL from generation results
- [ ] Open in new incognito window → should load manual directly
- [ ] Share link with teammate → verify they can view without generating
- [ ] Check `?format=json` query param → should return JSON (proxy working)

### ✅ Versioning (Optional Deep Dive)

- [ ] Generate manual for tool (e.g., "Slack")
- [ ] Force refresh to create new version
- [ ] Use Vercel Blob dashboard to verify multiple versions stored:
  - `manuals/slack/latest.json` (pointer to current)
  - `manuals/slack/2026-02-12T10-30-45-123Z.json` (timestamped versions)

---

## 📊 Expected Behavior

| Metric | Expected Value |
|--------|---------------|
| **Generation Time** | 28-40 seconds (depends on tool complexity) |
| **Cost per Generation** | $0.35-$0.65 (average $0.50) |
| **Features Found** | 15-50 (depends on tool size) |
| **Shortcuts Listed** | 10-40 |
| **Workflows** | 5-15 |
| **Tips** | 8-25 |
| **Common Mistakes** | 4-12 |
| **Citations** | 8-20 URLs |
| **Coverage Score** | 0.75-0.95 (75-95%) |

---

## 🐛 Known Limitations

1. **In-Memory Storage**: Rate limiting and feedback data stored in memory. Will reset on server restart. Fine for MVP testing.
2. **No Authentication**: Anyone with the URL can use the service. No user accounts or API keys required.
3. **Single Region**: Deployed to one region. Multi-region would need distributed rate limiting.
4. **No Analytics Dashboard**: Feedback data collected but no admin UI to view it yet.
5. **Model Fallback**: Uses `claude-opus-4-6` primarily, falls back to `claude-sonnet-4-5` only on failures (2 attempts each = 4 total max).
6. **Citation Quality**: Web search results vary. Some tools have better documentation than others, affecting citation relevance.

---

## 🚢 Deployment Notes

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# PERPLEXITY_API_KEY
# BLOB_READ_WRITE_TOKEN  
# NEXT_PUBLIC_APP_URL (e.g., https://your-app.vercel.app)
```

### Environment Variables for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `PERPLEXITY_API_KEY` | Perplexity Agent API key | `pplx-abc123...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | `vercel_blob_rw_...` |
| `NEXT_PUBLIC_APP_URL` | Base URL for shareable links | `https://kb.example.com` |

**Important**: Set `NEXT_PUBLIC_APP_URL` to your production domain before deploying, or shareable links will default to `http://localhost:3000`.

### DNS & Domains

If using a custom domain:
1. Configure in Vercel dashboard: Settings → Domains
2. Update `NEXT_PUBLIC_APP_URL` to match custom domain
3. Redeploy to apply changes

---

## 📁 Project Structure

```
kb/
├── src/
│   ├── lib/
│   │   ├── schema.ts          # Zod schemas for validation
│   │   ├── utils.ts           # Sanitization & validation helpers
│   │   ├── generate.ts        # AI generation logic (565 lines)
│   │   └── storage.ts         # Vercel Blob operations
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/       # POST /api/generate (NDJSON streaming)
│   │   │   └── manual/[slug]/  # GET manual JSON, feedback, versions
│   │   ├── kb-builder/         # Main generation UI
│   │   └── manual/[slug]/      # Manual viewer + TOC sidebar
│   └── proxy.ts               # Rewrites ?format=json requests
├── docs/
│   └── specs/
│       ├── Component_1_Spec_v4.1.md  # Technical specification
│       └── Vision.md                  # Product vision (3-phase plan)
├── package.json
├── next.config.ts
├── .env.local.example
└── README.md (this file)
```

---

## 🔧 Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **AI**: Perplexity Agent API with `anthropic/claude-opus-4-6`
- **Styling**: Tailwind CSS v4
- **Validation**: Zod ^4.3.6 (with native `.toJSONSchema()`)
- **Storage**: Vercel Blob ^2.2.0 (versioned, public read)
- **Icons**: Lucide React ^0.563.0
- **Language**: TypeScript 5 (strict mode)

---

## 📞 Support

**Issues During Testing?**

Common fixes:
- Ensure `.env.local` has all 3 variables set
- Verify Perplexity API key is valid: `curl -H "Authorization: Bearer $PERPLEXITY_API_KEY" https://api.perplexity.ai/models`
- Check Vercel Blob token has read+write permissions
- Clear browser cache and retry
- Check browser console for client-side errors
- Check terminal/server logs for API errors

**Still stuck?** Check:
- [docs/specs/Component_1_Spec_v4.1.md](docs/specs/Component_1_Spec_v4.1.md) for detailed technical documentation
- Server logs for error stack traces (console.error statements)
- Network tab for failed API calls

---

## 🎯 What's Next?

This is **Component 1** of a 3-component vision (see [Vision.md](docs/specs/Vision.md)):

- ✅ **Component 1: Knowledge Base Builder** — You are here
- ⏳ **Component 2: Action Monitor** — Screen capture + pattern matching
- ⏳ **Component 3: Suggestion Engine** — Contextual teaching

Current status: **Ready for internal testing → validate market → decide on Phase 1 continuation or standalone ship.**

---

**Last Updated**: Feb 12, 2026  
**Version**: 0.1.0 (MVP)  
**Status**: 🟢 Ready for Internal Testing
