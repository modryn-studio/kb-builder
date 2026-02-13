# Feedback System Guide

## How It Works (Current Implementation)

### What Happens When Users Submit Feedback

1. **User Action**: Clicks 👍 or 👎 on a manual section
2. **API Call**: POST to `/api/manual/[slug]/feedback`
3. **Storage**: Saved to in-memory array `feedbackStore[]`
4. **Logging**: Console log: `[Feedback] {"slug":"figma","helpful":true}`
5. **Response**: Returns success, UI shows "Thanks!"

### Limitations

❌ **Data lost on server restart** (in-memory only)  
❌ **No aggregation or analytics**  
❌ **No admin dashboard**  
✅ **Rate limited** (10 submissions/hour per IP)  
✅ **Logs to console** (can view in terminal/Vercel logs)

---

## Viewing Feedback (3 Methods)

### Method 1: Terminal Logs (Development)

**While `npm run dev` is running**, watch for:

```bash
[Feedback] {"slug":"figma","helpful":true}
[Feedback] {"slug":"notion","helpful":false}
[Feedback] {"slug":"figma","helpful":true}
```

**To search logs**:
```bash
npm run dev 2>&1 | Select-String "\[Feedback\]"
```

### Method 2: Vercel Function Logs (Production)

1. Deploy to Vercel
2. Go to: Vercel Dashboard → Your Project → Logs
3. Filter by: "Feedback"
4. See all feedback submissions with timestamps

### Method 3: Export from Terminal (Manual)

While dev server is running, grep logs:

```bash
# PowerShell
Get-Content output.log | Select-String "\[Feedback\]" | Out-File feedback.txt

# Or just copy from terminal
```

---

## For Internal Testing (Current Approach)

Since you have 5-10 internal testers:

### Quick & Manual
1. Keep terminal visible while testing
2. Watch for `[Feedback]` logs in real-time
3. Copy interesting entries to a doc
4. Ask testers: "What did you click thumbs down on?"

### Slightly Better (5 min setup)
1. Redirect logs to file:
   ```bash
   npm run dev > dev.log 2>&1
   ```
2. In another terminal, tail the log:
   ```bash
   Get-Content dev.log -Wait | Select-String "\[Feedback\]"
   ```
3. At end of day, extract all feedback:
   ```bash
   Select-String "\[Feedback\]" dev.log | Out-File daily-feedback.txt
   ```

---

## Upgrading to Persistent Storage

If you want to save feedback permanently, here are options:

### Option 1: Vercel KV (Redis) - 15 min setup

**Pros**: Fast, free tier generous, perfect for MVP  
**Cons**: Need to refactor feedback route

**Setup**:
1. Vercel Dashboard → Storage → Create KV Database
2. Copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. Add to `.env.local`
4. Install: `npm install @vercel/kv`
5. Update feedback route:

```typescript
import { kv } from '@vercel/kv';

// Replace feedbackStore.push(entry) with:
await kv.lpush(`feedback:${slug}`, JSON.stringify(entry));

// View all feedback:
const allFeedback = await kv.lrange('feedback:*', 0, -1);
```

### Option 2: Vercel Postgres - 20 min setup

**Pros**: SQL queries, proper analytics, CSV export  
**Cons**: More complex, overkill for MVP

**Setup**:
1. Vercel Dashboard → Storage → Create Postgres Database
2. Install: `npm install @vercel/postgres`
3. Create table:
```sql
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255),
  helpful BOOLEAN,
  section_type VARCHAR(100),
  section_id VARCHAR(255),
  ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Option 3: Posthog (Recommended for MVP) - 10 min

**Pros**: Analytics + feedback, free tier generous, no backend changes  
**Cons**: External service

**Setup**:
1. Sign up: https://posthog.com (free)
2. Install: `npm install posthog-js`
3. In `ManualContent.tsx`:
```typescript
import posthog from 'posthog-js';

// Initialize once
useEffect(() => {
  posthog.init('YOUR_KEY', { api_host: 'https://app.posthog.com' });
}, []);

// In SectionFeedback component:
const send = async (helpful: boolean) => {
  posthog.capture('feedback_submitted', {
    slug,
    helpful,
    sectionType,
    sectionId
  });
  // ... rest of code
};
```

4. View in Posthog dashboard: Events → `feedback_submitted`

---

## Recommendation by Stage

### Week 1-2 (Internal Testing - YOU ARE HERE)
✅ **Terminal logs are fine**
- 5-10 testers
- Watch logs in real-time
- Qualitative feedback via Slack/email matters more

### Week 3-8 (Beta Testing)
📈 **Add Posthog or Mixpanel**
- 50-500 testers
- Need to see trends: "Which features get 👎?"
- Funnel: Generation → View → Feedback
- 10 min setup, huge insight gain

### Month 3+ (Production)
🗄️ **Migrate to Postgres or KV**
- 1000+ users
- Custom admin dashboard
- SQL queries: "Show me all negative feedback on shortcuts"
- Export to CSV for deeper analysis

---

## Quick Wins

### Add Timestamp Display (Client-Side)

Users want to know when they clicked feedback? Add local time:

```typescript
const [feedbackTime, setFeedbackTime] = useState<string | null>(null);

const send = async (helpful: boolean) => {
  // ... existing code
  setFeedbackTime(new Date().toLocaleTimeString());
};

// In UI:
{feedbackSent !== null && (
  <span className="text-xs text-slate-400">
    Thanks! ({feedbackTime})
  </span>
)}
```

### Add Section-Level Aggregation (No Backend)

Show users how others voted:

```typescript
// In ManualContent, fetch aggregate:
const [feedbackStats, setFeedbackStats] = useState({ helpful: 0, notHelpful: 0 });

useEffect(() => {
  // Fetch from your backend (if you add aggregation)
  fetch(`/api/manual/${slug}/feedback/stats?section=${sectionId}`)
    .then(r => r.json())
    .then(data => setFeedbackStats(data));
}, []);

// Display: "👍 12  👎 3"
```

---

## Current Status

**Implementation**: In-memory array with console logging  
**Viewing**: Terminal logs only  
**Persistence**: None (resets on restart)  
**Good for**: 1-2 weeks internal testing  
**Upgrade when**: Moving to beta (50+ testers)

---

## Actions for You

For internal testing phase:

1. ✅ **Keep current implementation** (no changes needed)
2. ✅ **Watch terminal logs** when testers use the app
3. ✅ **Ask testers directly**: "What confused you?"
4. ⏰ **Week 3**: Add Posthog if you need trend data

For future (beta/production):

1. ⏰ **Week 3**: Install Posthog (10 min)
2. ⏰ **Month 2**: Migrate to Vercel KV if you need export (15 min)
3. ⏰ **Month 3+**: Build admin dashboard with Postgres

---

**Bottom Line**: For 5-10 internal testers over 1-2 weeks, terminal logs are sufficient. Focus on talking to users, not building analytics infrastructure.
