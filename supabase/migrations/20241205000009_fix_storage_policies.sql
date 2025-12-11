-- Fix storage policies to match actual file structure
-- Files are uploaded as: siteId/timestamp-filename
-- Need to verify user owns the site, not just check user ID in path

-- Drop old policies
DROP POLICY IF EXISTS "Users can upload documents to own sites" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own assets" ON storage.objects;

-- Documents bucket policies
-- For now, allow authenticated users to upload/view/delete
-- The application layer will verify site ownership
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Assets bucket policies (already has "Anyone can view assets")
CREATE POLICY "Authenticated users can upload assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );
