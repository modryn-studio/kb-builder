# Feedback Admin Dashboard - Quick Start

## Access the Dashboard

**Development:**
```
http://localhost:3000/admin/feedback
```

**Production (after deploy):**
```
https://your-app.vercel.app/admin/feedback
```

---

## What You Get

### 📊 Real-Time Stats
- **Total feedback count**
- **Helpful 👍 percentage**  
- **Not Helpful 👎 percentage**

### 📋 Feedback by Manual
- Click any manual card to filter
- See 👍/👎 breakdown per manual
- Quick toggle to clear filter

### 🔄 Live Updates
- Toggle "Auto-refresh" to update every 5 seconds
- Watch feedback come in real-time during testing

### 📥 Export Options
- **Download CSV** button exports all data
- Includes: slug, helpful, sectionType, sectionId, IP, timestamp
- Open in Excel/Google Sheets for analysis

### 🗑️ Clear Data
- "Clear All" button wipes all feedback
- Useful for fresh testing sessions

---

## Usage During Testing

### Option 1: Keep Dashboard Open (Recommended)

1. Start dev server: `npm run dev`
2. Open dashboard in browser: http://localhost:3000/admin/feedback
3. Enable "Auto-refresh" checkbox
4. Give testers the KB Builder: http://localhost:3000/kb-builder
5. Watch feedback appear in real-time

### Option 2: Check Periodically

1. Test for an hour
2. Visit dashboard to see all feedback
3. Download CSV for deeper analysis
4. Clear feedback before next session

---

## How It Works

**Tech:**
- Shared in-memory store (`feedback-store.ts`)
- Both submission and viewer use same array
- Console logs still work (backwards compatible)

**Limitations:**
- Data resets when server restarts
- Not saved to database (intentional for MVP)
- Port to Vercel KV/Postgres later if needed

---

## Example Workflow

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Open dashboard (or just use browser)
start http://localhost:3000/admin/feedback

# Give testers:
http://localhost:3000/kb-builder
```

**During Testing:**
1. Testers generate manuals
2. Testers click 👍/👎 on sections
3. You watch feedback appear in dashboard
4. Filter by manual: "figma", "notion", etc.
5. Download CSV at end: `feedback-1738400000000.csv`

---

## API Endpoints

### GET /api/admin/feedback
Returns JSON with stats + all entries:
```json
{
  "stats": {
    "total": 12,
    "helpful": 8,
    "notHelpful": 4,
    "bySlug": {
      "figma": { "helpful": 5, "notHelpful": 2 },
      "notion": { "helpful": 3, "notHelpful": 2 }
    }
  },
  "feedback": [...]
}
```

### GET /api/admin/feedback?slug=figma
Filter by manual slug

### GET /api/admin/feedback?format=csv
Download as CSV file

### DELETE /api/admin/feedback
Clear all feedback (returns count)

---

## Upgrading to Persistent Storage

When you outgrow in-memory (50+ testers):

### Quick: Vercel KV (Redis) - 15 min
```typescript
// feedback-store.ts
import { kv } from '@vercel/kv';

export async function addFeedback(entry: FeedbackEntry) {
  await kv.lpush('feedback', JSON.stringify(entry));
}
```

### Full: Vercel Postgres - 30 min
```sql
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255),
  helpful BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security Note

**No authentication on admin page by default.**

If deploying to public URL, add simple password:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const auth = request.headers.get('authorization');
    if (auth !== 'Bearer your-secret-password') {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }
}
```

For MVP with 5-10 internal testers, keep it simple (no auth needed).

---

## Troubleshooting

### Dashboard shows 0 feedback but testers submitted
**Problem:** Server restarted, clearing in-memory store  
**Solution:** Normal behavior. Feedback only persists during server uptime.

### Don't see recent feedback
**Problem:** Auto-refresh disabled  
**Solution:** Enable "Auto-refresh (5s)" checkbox or click Refresh button

### Want to save feedback permanently
**Solution:** Export CSV before stopping server, or upgrade to KV/Postgres

---

## Next Steps

1. ✅ **Start dev server**: `npm run dev`
2. ✅ **Open dashboard**: http://localhost:3000/admin/feedback  
3. ✅ **Generate a test manual**: http://localhost:3000/kb-builder
4. ✅ **Click 👍 or 👎** on any section
5. ✅ **See it appear** in dashboard instantly

**You're ready for internal testing!**
