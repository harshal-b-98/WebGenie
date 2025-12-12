-- Fix Missing RLS Enable Statements
-- Migration 7 created policies but never enabled RLS on several core tables
-- This migration enables RLS and adds missing policies for widget public access

-- ============================================
-- 1. Enable RLS on tables that are missing it
-- ============================================

-- These tables have policies but RLS was never enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Add missing policies for workspace_members
-- ============================================

-- Allow workspace owners to add members
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
CREATE POLICY "Workspace owners can add members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Allow workspace admins/owners to update members
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
CREATE POLICY "Workspace admins can update members" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      JOIN workspaces ON workspaces.id = wm.workspace_id
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND (wm.role IN ('owner', 'admin') OR workspaces.owner_id = auth.uid())
    )
  );

-- Allow workspace admins/owners to remove members
DROP POLICY IF EXISTS "Workspace admins can delete members" ON workspace_members;
CREATE POLICY "Workspace admins can delete members" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      JOIN workspaces ON workspaces.id = wm.workspace_id
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND (wm.role IN ('owner', 'admin') OR workspaces.owner_id = auth.uid())
    )
  );

-- ============================================
-- 3. Add missing policies for websites table
-- ============================================

DROP POLICY IF EXISTS "Members can create websites" ON websites;
CREATE POLICY "Members can create websites" ON websites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = websites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Members can update websites" ON websites;
CREATE POLICY "Members can update websites" ON websites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = websites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete websites" ON websites;
CREATE POLICY "Admins can delete websites" ON websites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = websites.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 4. Add public widget access policies
-- ============================================

-- Allow public access to site_pages for published sites (widget needs this)
DROP POLICY IF EXISTS "Public can view pages for published sites" ON site_pages;
CREATE POLICY "Public can view pages for published sites" ON site_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_pages.site_id
      AND sites.status = 'published'
      AND sites.deleted_at IS NULL
    )
  );

-- Note: Site pages INSERT is handled by service role (bypasses RLS)
-- The existing owner INSERT policy from migration 20251209000000 covers user inserts

-- Allow public access to site_versions for published sites (for preview)
DROP POLICY IF EXISTS "Public can view versions for published sites" ON site_versions;
CREATE POLICY "Public can view versions for published sites" ON site_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_versions.site_id
      AND sites.status = 'published'
      AND sites.deleted_at IS NULL
    )
  );

-- Allow public access to document_embeddings for widget chat
DROP POLICY IF EXISTS "Public can query embeddings for published sites" ON document_embeddings;
CREATE POLICY "Public can query embeddings for published sites" ON document_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = document_embeddings.project_id
      AND sites.status = 'published'
      AND sites.deleted_at IS NULL
    )
  );

-- ============================================
-- 5. Fix user_profiles INSERT policy (for new user registration)
-- ============================================

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 6. Add missing UPDATE policy for documents
-- ============================================

DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = documents.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. Add missing UPDATE policy for assets
-- ============================================

DROP POLICY IF EXISTS "Users can update own assets" ON assets;
CREATE POLICY "Users can update own assets" ON assets
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 8. Note on Service Role Access
-- ============================================

-- Service role (SUPABASE_SERVICE_ROLE_KEY) automatically bypasses RLS
-- No special policies needed - just use service role client for:
-- - AI generation operations
-- - Document processing
-- - System-level operations

-- The following operations use service role and bypass RLS:
-- - POST /api/ai/generate (site version creation)
-- - POST /api/documents/upload (document processing)
-- - POST /api/widget/chat (embedding queries)
-- - POST /api/widget/generate-page (page creation)

-- ============================================
-- 9. Comments for documentation
-- ============================================

COMMENT ON TABLE user_profiles IS 'User profile data extending auth.users - RLS enabled';
COMMENT ON TABLE sites IS 'Main website projects - RLS enabled with user ownership';
COMMENT ON TABLE conversations IS 'AI chat sessions - RLS enabled with user ownership';
COMMENT ON TABLE messages IS 'Chat messages - RLS enabled via conversation ownership';
COMMENT ON TABLE site_versions IS 'Website version history - RLS enabled via site ownership';
COMMENT ON TABLE documents IS 'Uploaded documents for content extraction - RLS enabled via site ownership';
COMMENT ON TABLE assets IS 'Media assets for websites - RLS enabled with user ownership';
