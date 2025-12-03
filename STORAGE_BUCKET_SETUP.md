# Supabase Storage Bucket Setup

## The Problem

You're seeing: **"new row violates row-level security policy"**

This is because the Storage buckets don't have RLS policies configured yet.

## Quick Fix (2 minutes)

### Step 1: Go to Storage in Supabase

https://supabase.com/dashboard/project/cfhssgueszhoracjeyou/storage/buckets

### Step 2: Create `documents` Bucket

1. Click "New bucket"
2. Name: `documents`
3. **Public bucket**: ❌ OFF (private)
4. Click "Create bucket"

### Step 3: Add RLS Policy to `documents` Bucket

1. Click on the `documents` bucket
2. Go to "Policies" tab
3. Click "New policy"
4. Choose "Custom policy"
5. Policy name: `Users can upload their own documents`
6. Target roles: `authenticated`
7. Policy definition for INSERT:
   ```sql
   (bucket_id = 'documents'::text AND auth.uid() = owner)
   ```
8. Policy definition for SELECT:
   ```sql
   (bucket_id = 'documents'::text AND auth.uid() = owner)
   ```
9. Policy definition for DELETE:
   ```sql
   (bucket_id = 'documents'::text AND auth.uid() = owner)
   ```
10. Click "Save policy"

### Alternative: Simpler Policy (Allow all authenticated users)

If the above doesn't work, use this simpler policy:

1. New policy name: `Authenticated users can upload documents`
2. For INSERT/SELECT/DELETE, use:
   ```sql
   auth.role() = 'authenticated'
   ```

This allows any logged-in user to upload/view/delete their files.

### Step 4: Create `assets` Bucket (For later)

Same steps but:

- Name: `assets`
- Public bucket: ✅ ON (public)
- Same RLS policies

## After Setup

Once the storage policies are configured:

1. Refresh your app
2. Try uploading documents again
3. Should work! ✅

## Why This Happened

Supabase Storage has RLS enabled by default but no policies, so all operations are denied until you add policies.
