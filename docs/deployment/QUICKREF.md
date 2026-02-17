# Quick Reference - Dev & Production

## 🚀 Deploy to Production

```bash
npm run deploy:check    # Build + deploy (recommended)
# or
npm run deploy          # Deploy without build check
```

## 💻 Development

```bash
npm run dev              # Normal dev start
npm run dev:clean        # Clean .next and start fresh
```

## 🔧 Fixing Stuck Jobs (Production Testing)

### Option 1: Force Start Individual Job
1. Go to `/pending` page
2. Wait 30s for "Force Start" button to appear on stuck jobs
3. Click to manually trigger processing

### Option 2: Admin Processor Trigger
1. Go to `/admin/jobs`
2. Click "Trigger Processor"
3. Enter `CRON_SECRET` when prompted

## ⚙️ How It Works

### Job Flow
```
User submits → Job created (queued)
    ↓
Check for duplicates → Return existing job if found
    ↓
Immediate trigger → Cron processor picks job
    ↓
Generate manual (2-3 min) → Job completed
    ↓
User polling sees update → Auto-redirect
```

### Deduplication
**Multiple requests for same tool:**
- If job is already queued/processing → Returns existing job ID
- All users track the same job
- Prevents duplicate API costs
- Cache hit (30-day) → Instant redirect to manual

### Processor Trigger Points
1. **On job creation** - Immediate fetch to `/api/cron/process`
2. **Daily cron** - 2am UTC (backup, cleanup stuck jobs)
3. **Manual trigger** - `/admin/jobs` or "Force Start" button

## 📍 Key URLs

### Public
- `/` - Homepage (generate manuals)
- `/pending` - Track your jobs
- `/manual/[slug]` - View manual
- `/manuals` - Browse all manuals

### Admin (Testing)
- `/admin/jobs` - Manual processor trigger
- `/admin/feedback` - Feedback dashboard

## 🐛 Common Issues

### Jobs not processing?
→ `/admin/jobs` → Trigger Processor

### Dev server won't start?
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
npm run dev
```

### Build fails?
```bash
npm run dev:clean
npm run build
```

## 📊 Environment Variables (Vercel)

**Required:**
- `PERPLEXITY_API_KEY` - API key
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token
- `CRON_SECRET` - Cron auth (random string)

**Optional:**
- `ADMIN_SECRET` - Admin endpoints (defaults to CRON_SECRET)

## 🔄 Architecture Summary

**Queue-based processing:**
- Jobs queue in memory + Blob persistence
- Processor picks oldest queued job
- One job at a time (sequential processing)
- Reliable, no race conditions

**Why this works:**
- Immediate trigger on job creation (don't wait for cron)
- Daily cron catches stragglers
- Force Start button for stuck jobs during testing
- Polling UI shows real-time progress

---

Full docs: [DEPLOYMENT.md](DEPLOYMENT.md)
