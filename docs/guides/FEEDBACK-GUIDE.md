# Feedback System Guide

## How It Works (Current Implementation)

### 1. Section Feedback (Thumbs Up/Down)

**User Action**: Clicks 👍 or 👎 on a manual section  
**API Call**: POST to `/api/manual/[slug]/feedback`  
**Storage**: Blob-persisted via `feedback-store.ts` → `_internal/feedback.json`  
**Persistence**: Survives server restarts (lazy hydrate on first access, debounced writes)  
**Rate Limit**: ✅ 10 submissions/hour per IP  
**Console Log**: ✅ `[Feedback] {"slug":"figma","helpful":true}`

### 2. Star Ratings (1-5 Stars)

**User Action**: Rates a manual 1-5 stars  
**API Call**: POST to `/api/manual/[slug]/rate`  
**Storage**: Blob-persisted → `_internal/ratings.json`  
**Aggregation**: ✅ Returns average + count per manual  
**Deduplication**: One rating per session per manual  
**Query**: GET `/api/manual/[slug]/rate` returns `{average: 4.2, count: 15}`

### 3. User Messages (Bug Reports, Feature Requests)

**User Action**: Submits message via form  
**API Call**: POST to `/api/feedback/message`  
**Storage**: Blob-persisted → `_internal/messages.json`  
**Types**: `feature-request`, `bug-report`, `general`, `manual-feedback`  
**Optional**: Email, sessionId, slug (for manual-specific feedback)  
**Limit**: Max 5000 messages (FIFO)

### 4. Admin Dashboard

**Endpoint**: `/api/admin/feedback?key=ADMIN_SECRET`  
**Auth**: Requires `ADMIN_SECRET` env var (falls back to `CRON_SECRET`, then `"dev-secret"`)  
**Returns**: All feedback (thumbs), ratings, and messages  
**Privacy**: IP addresses stripped from response  
**Delete**: DELETE `/api/admin/feedback?key=ADMIN_SECRET` clears all feedback

---

## Current Status

✅ **Persistent storage** (Blob-backed, survives restarts)  
✅ **Star ratings** with aggregation  
✅ **User messages** API  
✅ **Admin endpoint** (secured)  
✅ **Rate limited** (10/hour per IP)  
✅ **Console logging**  
❌ **No frontend UI** for star ratings or messages yet  
❌ **No admin dashboard UI** (API only)

---

## Viewing Feedback

### Method 1: Admin API Endpoint (Recommended)

**Quick JSON export:**
```bash
# PowerShell (with admin secret)
$env:ADMIN_SECRET = "your-secret-here"
Invoke-RestMethod "http://localhost:3000/api/admin/feedback?key=$env:ADMIN_SECRET" | ConvertTo-Json -Depth 10 | Out-File feedback-export.json

# Or curl
curl "http://localhost:3000/api/admin/feedback?key=your-secret" > feedback-export.json
```

**Returns:**
```json
{
  "feedback": [
    {"slug": "figma", "helpful": true, "sectionType": "feature", ...}
  ],
  "ratings": [
    {"slug": "notion", "rating": 5, "sessionId": "...", "createdAt": "..."}
  ],
  "messages": [
    {"type": "bug-report", "message": "...", "email": "user@example.com"}
  ],
  "stats": {
    "totalFeedback": 42,
    "helpfulCount": 35,
    "notHelpfulCount": 7,
    "totalRatings": 15,
    "totalMessages": 3
  }
}
```

### Method 2: Terminal Logs (Development)

**While `npm run dev` is running**, watch for:

```bash
[Feedback] {"slug":"figma","helpful":true}
[BlobPersistence] Hydrated 42 feedback entries from Blob
```

**To search logs**:
```bash
npm run dev 2>&1 | Select-String "\[Feedback\]"
```

### Method 3: Vercel Function Logs (Production)

1. Deploy to Vercel
2. Go to: Vercel Dashboard → Your Project → Logs
3. Filter by: "Feedback" or "BlobPersistence"
4. See all feedback submissions with timestamps

### Method 4: Direct Blob Access (Advanced)

Feedback is stored in Vercel Blob at:
- `_internal/feedback.json` (thumbs up/down)
- `_internal/ratings.json` (star ratings)
- `_internal/messages.json` (user messages)

Access via Vercel Dashboard → Storage → Blob → Browse files

---

## For Internal Testing

You have persistent feedback now, so all data is saved. Here's how to review it:

### Quick Daily Check
```bash
# Export all feedback to JSON
curl "http://localhost:3000/api/admin/feedback?key=dev-secret" | jq . > daily-$(date +%Y%m%d).json
```

### Parse Specific Data
```bash
# Get all star ratings
curl "http://localhost:3000/api/admin/feedback?key=dev-secret" | jq '.ratings'

# Get all bug reports
curl "http://localhost:3000/api/admin/feedback?key=dev-secret" | jq '.messages[] | select(.type=="bug-report")'

# Summary stats
curl "http://localhost:3000/api/admin/feedback?key=dev-secret" | jq '.stats'
```

### Watch Live Feedback (Terminal)
```bash
npm run dev 2>&1 | Select-String "\[Feedback\]"
```

---

## Next Steps (Frontend UI)

The backend is complete. To make this user-facing:

### 1. Add Star Rating Component (15 min)

In `ManualContent.tsx`, add a star rating component at the top of the page:

```typescript
import { Star } from "lucide-react";

const [rating, setRating] = useState<number | null>(null);
const [hover, setHover] = useState<number | null>(null);

const handleRate = async (stars: number) => {
  const res = await fetch(`/api/manual/${slug}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      rating: stars, 
      sessionId: getOrCreateSessionId() 
    }),
  });
  const data = await res.json();
  setRating(stars);
  setAverageRating(data.average);
  setRatingCount(data.count);
};

// UI: 5 clickable stars
<div className="flex gap-1">
  {[1,2,3,4,5].map(n => (
    <Star 
      key={n}
      className={`cursor-pointer ${(hover || rating) >= n ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      onMouseEnter={() => setHover(n)}
      onMouseLeave={() => setHover(null)}
      onClick={() => handleRate(n)}
    />
  ))}
  <span className="text-sm text-gray-500">
    {averageRating.toFixed(1)} ({ratingCount} ratings)
  </span>
</div>
```

### 2. Add User Message Form (30 min)

Create a "Report an Issue" button that opens a modal:

```typescript
const [showMessageForm, setShowMessageForm] = useState(false);
const [messageType, setMessageType] = useState<"bug-report" | "feature-request" | "manual-feedback">("manual-feedback");
const [message, setMessage] = useState("");
const [email, setEmail] = useState("");

const handleSubmitMessage = async () => {
  await fetch("/api/feedback/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      type: messageType,
      message,
      email: email || undefined,
      sessionId: getOrCreateSessionId(),
    }),
  });
  setShowMessageForm(false);
  toast.success("Thanks for your feedback!");
};
```

### 3. Build Admin Dashboard (1-2 hours)

Create `/admin/feedback` page with protected route:

```typescript
// Check ADMIN_SECRET on page load
const [data, setData] = useState(null);

useEffect(() => {
  const secret = prompt("Enter admin secret:");
  fetch(`/api/admin/feedback?key=${secret}`)
    .then(r => r.json())
    .then(setData);
}, []);

// Display tables:
// - Feedback by manual (thumbs up/down counts)
// - Star ratings histogram
// - Recent messages with filters
```

---

## Recommendation by Stage

### Week 1-2 (Internal Testing - YOU ARE HERE)
✅ **Backend complete** (blob persistence, all APIs work)  
🔨 **Add star rating UI** (15 min) - improves UX  
📋 **Terminal logs + API exports** - sufficient for 5-10 testers

### Week 3-8 (Beta Testing)
🔨 **Build admin dashboard** (1-2 hours)  
📊 **Add message form UI** (30 min)  
📈 **Optional: Add Posthog/Mixpanel** for funnel analytics

### Month 3+ (Production)
🎨 **Polish admin dashboard**  
📧 **Email notifications** for bug reports  
📊 **Automated weekly reports**

---

## Current Implementation Status

✅ **Blob persistence** - All feedback saved permanently  
✅ **Star ratings API** - Backend complete  
✅ **User messages API** - Backend complete  
✅ **Admin API endpoint** - GET/DELETE with auth  
✅ **Rate limiting** - 10/hour per IP  
✅ **Privacy** - IPs stripped in admin response  
❌ **Star rating UI** - Not implemented yet  
❌ **Message form UI** - Not implemented yet  
❌ **Admin dashboard UI** - API-only, no visual dashboard  

---

## Actions for You

**Immediate (this week):**
1. ✅ Test admin API: `curl "http://localhost:3000/api/admin/feedback?key=dev-secret"`
2. 🔨 Add star rating UI to manual pages (15 min)
3. ✅ Share with internal testers, collect feedback via API

**Next 1-2 weeks:**
1. 🔨 Build simple admin dashboard page (2 hours)
2. 🔨 Add "Report Issue" button with message form (30 min)

**Future (month 2+):**
1. Add email notifications for messages
2. Weekly automated reports
3. Trending/popular manuals based on ratings
