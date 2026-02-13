# Vercel Blob Setup Guide

## Quick Answer

**Yes, use the same project.** You don't need a separate project for storage.

---

## Step-by-Step Setup

### 1. Deploy to Vercel (If You Haven't Already)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or use the Vercel dashboard:
1. Go to https://vercel.com/new
2. Import your Git repository
3. Click "Deploy"

---

### 2. Create Blob Storage

**After your project is deployed:**

1. **Go to Project Dashboard**
   - https://vercel.com/[your-username]/[your-project]

2. **Click "Storage" Tab**
   - Top navigation: Overview / Deployments / Analytics / **Storage** / Settings

3. **Click "Create Database"**
   - Big blue button in the Storage tab

4. **Select "Blob"**
   - Choose from: Postgres / KV / Blob / Edge Config
   - Click **Blob**

5. **Name Your Store**
   - Example: `kb-manuals`
   - Region: Auto (closest to your serverless functions)

6. **Click "Create"**

---

### 3. Connect to Your Project

Vercel will automatically:
- ✅ Add environment variables to your project
- ✅ Create `.env.local` tab with connection string
- ✅ Enable Blob storage for all deployments

**Environment variables added:**
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

---

### 4. Get Token for Local Development

1. **In Vercel Dashboard**, go to:
   - Storage tab → Your Blob store → ".env.local" tab

2. **Copy the token**:
   ```bash
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
   ```

3. **Add to your local `.env.local` file**:
   ```bash
   # Vercel Blob (for storing KB manuals)
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
   ```

4. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

### 5. Verify It Works

**Test locally:**

1. Start dev server: `npm run dev`
2. Go to: http://localhost:3000/kb-builder
3. Enter your Perplexity API key
4. Generate a manual (e.g., "Figma")
5. Check terminal for:
   ```
   ✅ Blob uploaded: figma-1234567890.json
   ✅ Slug ready: figma
   ```

**Test in production:**

1. Push changes to Git
2. Vercel auto-deploys
3. Visit: https://your-app.vercel.app/kb-builder
4. Generate a manual
5. View at: https://your-app.vercel.app/manual/figma

---

## Troubleshooting

### Problem 1: "Missing BLOB_READ_WRITE_TOKEN"

**Symptoms:**
```
Error: Missing BLOB_READ_WRITE_TOKEN environment variable
```

**Solution:**
1. Check `.env.local` file exists in project root
2. Verify token is present: `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...`
3. Restart dev server: `npm run dev`

---

### Problem 2: "Access Denied" in Production

**Symptoms:**
```
Error: Blob storage access denied
```

**Solution:**
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Confirm `BLOB_READ_WRITE_TOKEN` is present
3. If missing, add it manually:
   - Key: `BLOB_READ_WRITE_TOKEN`
   - Value: (copy from Storage → .env.local tab)
   - Environment: Production, Preview, Development (select all)
4. Redeploy: Deployments tab → ... → Redeploy

---

### Problem 3: Blob Store Not Found

**Symptoms:**
```
Error: Blob store 'kb-manuals' not found
```

**Solution:**
- You don't name the store in your code
- The token automatically connects to the right store
- Just use `put()` and `list()` - Vercel handles routing

---

### Problem 4: Local Dev Works, Production Fails

**Checklist:**
1. ✅ Deployed to Vercel?
2. ✅ Created Blob storage in Vercel dashboard?
3. ✅ Connected Blob to your project?
4. ✅ Environment variables auto-added?
5. ✅ Redeployed after adding Blob?

**Quick fix:**
```bash
# Force redeploy
vercel --prod --force
```

---

## Cost (Free Tier Generous)

**Vercel Blob Pricing:**
- **Free Hobby Plan:**
  - 500 MB storage
  - 1 GB bandwidth/month
  - ~50,000 manuals (if each is ~10 KB)

- **Pro Plan ($20/month):**
  - 100 GB storage
  - 1 TB bandwidth/month

**For Your MVP:**
- Hobby plan is plenty for 100+ testers
- Each manual JSON ~10-20 KB
- Versions stored separately (minimal cost)

---

## What You're Storing

**Files uploaded to Blob:**

1. **Manual JSON** (latest version):
   - Path: `{slug}-{timestamp}.json`
   - Example: `figma-1704567890123.json`
   - Size: ~10-30 KB per manual

2. **Version History** (archived):
   - Path: `{slug}-archive-{timestamp}.json`
   - Kept indefinitely (unless you delete)
   - Used by Version History viewer

---

## Viewing Your Blobs

### Option 1: Vercel Dashboard

1. Dashboard → Storage → Your Blob store
2. See list of all files
3. Click file → View/Download JSON

### Option 2: Programmatically

Your app already has this working:

```typescript
// List all manuals
const { blobs } = await list({ prefix: 'manual-' });

// Get specific manual
const blob = await head(`figma-1704567890123.json`);

// Download JSON
const response = await fetch(blob.url);
const manual = await response.json();
```

### Option 3: API Route

Visit: `/api/manual/[slug]` to see latest version:
```
https://your-app.vercel.app/api/manual/figma
```

---

## Security Notes

✅ **Read/Write Token is Server-Side Only**
- Never exposed to client
- Used in API routes only
- Secure by default

✅ **Public URLs are Short-Lived**
- Generated on-demand
- Expire after 1 hour (configurable)
- Can't guess URLs (cryptographically random)

✅ **No User Authentication Required**
- Manuals are public (like documentation)
- If you add private manuals later, implement auth in API routes

---

## Next Steps

1. ✅ **Create Blob storage** (follow steps above)
2. ✅ **Add token to `.env.local`**
3. ✅ **Test generation locally**
4. ✅ **Deploy to Vercel**
5. ✅ **Share with internal testers**

---

## Current Status

**Your app already has Blob integration:**
- ✅ `@vercel/blob` installed
- ✅ Upload logic in `/api/generate`
- ✅ Download logic in `/api/manual/[slug]`
- ✅ Version history in `/api/manual/[slug]/versions`

**You just need:**
- ⏰ Create Blob store in Vercel dashboard
- ⏰ Copy token to `.env.local`

**That's it!** Your code is ready.
