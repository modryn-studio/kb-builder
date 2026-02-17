# Deployment Guide

## Quick Commands

### Development
```bash
npm run dev              # Start dev server
npm run dev:clean        # Clean .next cache and start dev
```

### Production
```bash
npm run build           # Test production build locally
npm run deploy:check    # Build + deploy to Vercel
npm run deploy          # Deploy without build check
```

---

## Environment Variables

### Required in Vercel Production

Go to Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PERPLEXITY_API_KEY` | Perplexity API key for generation | `pplx-xyz123...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token | `vercel_blob_rw_...` |
| `CRON_SECRET` | Secret for cron endpoint auth | Random 32-char string |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_SECRET` | Admin endpoint auth | Falls back to `CRON_SECRET` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (auto-detected if not set) | Auto-detected from request |

---

## How Job Processing Works

### Architecture

1. **Job Creation** ([/api/jobs/create](src/app/api/jobs/create/route.ts))
   - User submits tool name
   - **Cache check:** If manual exists (< 30 days) → instant redirect
   - **Deduplication check:** If job already queued/processing → return existing job
   - Job created with status: `queued`
   - Immediate trigger sent to cron processor
   - User redirected to `/job/[id]`

2. **Queue Processor** ([/api/cron/process](src/app/api/cron/process/route.ts))
   - Picks oldest queued job
   - Runs generation (130-160s with web search)
   - Updates job status to `completed` or `failed`
   
3. **Client Polling** ([/pending](src/app/pending/page.tsx))
   - Polls every 3s while jobs are active
   - Shows real-time progress updates
   - Auto-redirects on completion

### Production vs Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| Job trigger | Immediate (fetch to localhost) | Immediate (fetch to production URL) |
| Cron backup | Manual only | Daily at 2am UTC |
| Job persistence | In-memory + Blob | In-memory + Blob |
| URL detection | `localhost:3000` | Auto-detected from request headers |

---

## Deployment Checklist

### Pre-Deploy

- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] Test key flows locally:
  - [ ] Generate manual (full flow)
  - [ ] View manual detail page
  - [ ] Rate/feedback submission
  
### Deploy

```bash
git add .
git commit -m "Description of changes"
npm run deploy
```

### Post-Deploy (First Time)

1. **Set Environment Variables** (Vercel Dashboard)
   - `PERPLEXITY_API_KEY`
   - `BLOB_READ_WRITE_TOKEN`
   - `CRON_SECRET`

2. **Test Production Flow**
   - Generate a manual (should complete in 2-3 minutes)
   - Check `/pending` page polls correctly
   - Verify manual appears at `/manual/[slug]`

3. **Enable Cron** (Vercel Dashboard)
   - Crons should auto-enable from `vercel.json`
   - Verify in Deployments → Cron Jobs tab

---

## Troubleshooting

### Jobs Stuck in "Queued"

**Symptoms:** Jobs stay queued forever, never move to processing.

**Cause:** Processor trigger failed (network error, wrong URL).

**Fix:**
1. Go to `/admin/jobs`
2. Click "Trigger Processor" to manually start
3. Or use "Force Start" button on stuck jobs in `/pending`

**Long-term:** Jobs process immediately on creation. Daily cron (2am UTC) catches stragglers.

### Multiple Same Jobs in Queue

**Symptoms:** Multiple jobs for same tool (e.g., 3x "VS Code").

**Cause (OLD):** No deduplication - each request created a new job.

**Fixed:** Deduplication check now returns existing job if tool is already queued/processing.

**Manual cleanup:** Use `/admin/jobs` to trigger processor - will process them sequentially.

### Build Failures

**Error:** `Type error` or `Module not found`

**Fix:**
```bash
npm run dev:clean   # Clear cache
npm run build       # Re-test build
```

### Dev Server Won't Start

**Error:** `Port 3000 already in use` or `EADDRINUSE`

**Fix (PowerShell):**
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
npm run dev
```

**Fix (Clean restart):**
```powershell
rm -rf .next
npm run dev
```

---

## Admin Tools

### Manual Processor Trigger

URL: `/admin/jobs`

Use this to:
- Test job processing without waiting for cron
- Clear stuck queued jobs
- Debug generation issues

**Requires:** `CRON_SECRET` (will prompt)

### Feedback Dashboard

URL: `/admin/feedback`

View user feedback submissions (bugs, features, contact).

**Requires:** `ADMIN_SECRET` header (use browser extension or curl)

---

## Monitoring

### Key Metrics to Watch

1. **Job Completion Rate**
   - Check `/pending` page for failed jobs
   - Monitor Vercel logs for generation errors

2. **Generation Cost**
   - Average: ~$1.05 per manual (Claude Opus + search)
   - Track in job `totalCost` field

3. **API Errors**
   - Perplexity API failures
   - Vercel Blob storage errors

### Logs

**View Vercel logs:**
```bash
vercel logs --project=kb-builder --follow
```

**Filter for errors:**
```bash
vercel logs --project=kb-builder | grep "ERROR"
```

---

## Rollback

If production breaks:

1. **Revert to previous deployment** (Vercel Dashboard)
   - Deployments tab → Click previous deployment → Promote to Production

2. **Or revert locally:**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## Development Workflow

### Typical Cycle

1. Make changes locally
2. Test in dev: `npm run dev`
3. Build check: `npm run build`
4. Commit: `git commit -am "feat: new feature"`
5. Deploy: `git push origin main`
6. Monitor Vercel deployment progress
7. Test in production

### Branch Strategy

**Current:** Direct commits to `main` (auto-deploys to production)

**Recommended for multiple developers:**
- Feature branches: `feature/something`
- Preview deployments: auto-created by Vercel
- Merge to `main` after testing preview

---

## Performance

### Build Times
- Local: ~20-30s
- Vercel: ~40-60s

### Job Processing
- Generation: 130-160s (with web search)
- Polling interval: 3s
- Expected user wait: 2-3 minutes

### Optimization Opportunities
- [ ] Move to edge functions where possible
- [ ] Cache manual versions (30-day TTL already implemented)
- [ ] Use Vercel KV for job queue (instead of in-memory)
- [ ] Implement proper background job runner

---

## Support

- **Documentation:** `docs/` folder
- **Architecture:** `docs/specs/Component_1_Spec_v5.0.md`
- **Design System:** `.github/copilot-instructions.md`

