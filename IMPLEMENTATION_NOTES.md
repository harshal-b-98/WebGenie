# Implementation Notes - Document Processing Issue

## Root Cause Analysis

After extensive debugging, the issue is:

1. ✅ Documents upload successfully
2. ✅ Text extraction works (logs show 10,733 characters extracted)
3. ✅ AI summaries generate successfully
4. ❌ Database UPDATE fails silently (likely RLS policy issue)
5. ❌ Documents have no `extracted_text` in database
6. ❌ Generation has no content to work with

## Evidence

From server logs:

```
Documents found for generation: 4
Documents with text: 0  ← PROBLEM
Full document text length: 0  ← PROBLEM
```

From processing logs:

```
✅ DOCX text extracted { textLength: 10733 }
✅ AI summary generated: "BevGenie is a conversational..."
✅ Document processed successfully
```

## The Fix Needed

The database UPDATE operation at `lib/services/document-service.ts:91-98` is failing due to RLS policies.

### Option 1: Check RLS Policies

Run this in Supabase SQL Editor:

```sql
-- Check if UPDATE policy exists for documents
SELECT * FROM pg_policies WHERE tablename = 'documents' AND cmd = 'UPDATE';

-- If no UPDATE policy, add one:
CREATE POLICY "Users can update documents for own sites"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = documents.site_id
      AND sites.user_id = auth.uid()
    )
  );
```

### Option 2: Use Service Role for Updates

In `lib/services/document-service.ts`, use service role client:

```typescript
// At top of processDocument function
const { createClient } = await import("@supabase/supabase-js");
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Then use serviceSupabase instead of supabase for the UPDATE
```

### Option 3: Verify Data

Check actual database state with the SQL query (already in clipboard).

## Current Session Summary

### ✅ What Works:

- 6 Epics complete (75% of MVP)
- LangChain PDF extraction implemented
- Synchronous processing
- AI summarization
- Website generation engine
- Complete auth and project management

### 🔧 What Needs Fixing:

- Document UPDATE query (RLS policy or use service role)
- Once fixed, entire flow will work end-to-end

## Next Steps

1. Run the SQL query to check database
2. Add UPDATE RLS policy OR use service role client
3. Upload fresh document
4. Verify extraction saves to database
5. Test complete generation flow

The solution is very close - just need the database UPDATE to succeed!
