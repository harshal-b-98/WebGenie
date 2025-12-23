# Vercel Deployment Testing Guide

## Deployment Information

- **URL**: https://web-genie-nu.vercel.app/
- **Latest Commit**: `283119f` - "fix: Prevent streaming controller errors during landing page generation"
- **Status**: ✅ Live and deployed

## Important: Test with a NEW Site

⚠️ **Do NOT use existing sites** - they were created before the fix and have broken/truncated HTML saved in the database.

You MUST create a **brand new site** to test the streaming fix.

## Step-by-Step Testing Instructions

### Step 1: Access the Deployment

1. Open browser and navigate to: https://web-genie-nu.vercel.app/
2. Sign in with your account

### Step 2: Create a New Site

1. Click **"Create New Workspace"** or **"New Project"**
2. Name it something like: `BevTest-Fix-Verification`
3. Save the project

### Step 3: Configure Site Settings

1. Go to site settings
2. Ensure the following are enabled:
   - ✅ **Chat Widget Enabled**
   - ✅ **Dynamic Pages Enabled**
   - ✅ **Persona Detection** (optional)

### Step 4: Upload Documents

Upload your 6 BevGenie PDFs:

- BevGenie - Competitor Intel.pdf
- BevGenie - Implementation Steps.pdf
- BevGenie - Industry Insight.pdf
- BevGenie - Product Features.pdf
- BevGenie - ROI & Industry Benchmarks.pdf
- BevGenie - Use Cases.pdf

**Wait for all documents to process** (you'll see "Processing complete" for each)

### Step 5: Generate Landing Page

1. Go to the **Generate** tab
2. Click **"Generate Website"** button
3. **Watch the streaming progress**:
   - You should see: "Initializing generation..."
   - Then: "Analyzing your requirements..."
   - Then: "Designing the layout..."
   - Then: "Generating content..."
   - Finally: "Generation complete"

**Expected Result**: ✅ No errors, streaming completes successfully

### Step 6: Verify Landing Page Has Content

1. Go to **Preview** tab
2. **Check that the landing page displays**:
   - ✅ Hero section with company name and tagline
   - ✅ Navigation cards (2-4 segments like "Competitive Intelligence", "Product Features", etc.)
   - ✅ Content sections (not empty HTML)
   - ✅ Chat widget bubble in bottom right corner

**If you see empty content**: ❌ The fix didn't work - report this immediately

### Step 7: Test Chat Widget

1. Click the chat widget bubble
2. Ask a question like: "What is BevGenie?"
3. **Expected Result**: ✅ Chat widget responds with information from your uploaded documents

**If chat says "I don't have specific information"**: ❌ Document processing issue - check embeddings

### Step 8: Test Dynamic Page Navigation

1. Click on one of the navigation cards (e.g., "Competitive Intelligence")
2. **Expected Result**:
   - ✅ New page loads with relevant content
   - ✅ Chat widget appears on the new page
   - ✅ Breadcrumb navigation shows: Home > Competitive Intelligence

### Step 9: Test Breadcrumb Navigation

1. From a segment page, click on another card to go deeper
2. **Expected Result**:
   - ✅ Breadcrumb updates to: Home > Segment > Topic
   - ✅ Full navigation path is preserved
   - ✅ Can click breadcrumb items to go back

### Step 10: Verify HTML in Database

Run this SQL query on your cloud Supabase:

```sql
SELECT
  v.id,
  v.version_number,
  LENGTH(v.html_content) as html_length,
  v.created_at,
  s.title
FROM site_versions v
JOIN sites s ON v.site_id = s.id
WHERE s.title LIKE '%BevTest-Fix-Verification%'
ORDER BY v.version_number DESC;
```

**Expected Result**:

- ✅ `html_length` should be **50,000 - 150,000 bytes** (not 5,000!)
- ✅ At least one version exists

## What to Report

### If Everything Works ✅

Report:

- "Landing page generated successfully with content"
- "HTML length: [X bytes]"
- "Chat widget appears on all pages"
- "Breadcrumb navigation works correctly"

### If Issues Occur ❌

Report:

- Which step failed
- Error messages (if any)
- Screenshot of the issue
- Browser console errors (F12 → Console tab)
- Network tab showing API responses (F12 → Network tab)

## Troubleshooting

### Issue: "Still showing empty content"

**Check**:

1. Open browser DevTools (F12)
2. Go to Console tab - look for JavaScript errors
3. Go to Network tab - find the `/api/ai/generate-stream` request
4. Check the response - does it contain HTML or errors?

### Issue: "Streaming hangs/freezes"

**Check**:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Look for the streaming request - is it still "Pending"?
4. Check Console for errors like "Controller is already closed"

### Issue: "Chat widget missing"

**Verify**:

1. Site settings have "Chat Widget Enabled" = true
2. HTML in database includes "NEXTGENWEB_CONFIG"
3. Browser console shows no errors loading widget.js

## Success Criteria

✅ **All tests must pass**:

- [ ] Landing page generates without controller errors
- [ ] Landing page displays with actual content from documents
- [ ] HTML size is 50-150KB (not 5-6KB)
- [ ] Navigation cards appear (2-4 segments)
- [ ] Chat widget appears on all pages
- [ ] Chat widget can answer questions from documents
- [ ] Breadcrumb navigation maintains full path context
- [ ] Can navigate: Home → Segment → Topic → Back via breadcrumbs

## Additional Notes

- **First generation may take 30-60 seconds** - this is normal
- **Subsequent page generations are faster** (15-25 seconds) due to caching
- **If you get authentication errors** - clear cookies and sign in again
- **If Supabase rate limits kick in** - wait 1 minute and try again

## Vercel Deployment Logs

If you need to check Vercel deployment logs:

1. Go to https://vercel.com
2. Select your project
3. Go to "Deployments" tab
4. Click on the latest deployment
5. View "Functions" logs for any errors

## Contact

If tests fail, provide:

- Step number where it failed
- Error messages
- Screenshots
- Browser console logs
- Network tab responses
