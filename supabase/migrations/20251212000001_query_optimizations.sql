-- Database Query Optimizations
-- Adds composite indexes and helper functions for common query patterns

-- ============================================
-- 1. Composite Indexes for Common Queries
-- ============================================

-- Sites: User's sites filtered by status (dashboard query)
CREATE INDEX IF NOT EXISTS idx_sites_user_status
  ON sites(user_id, status)
  WHERE deleted_at IS NULL;

-- Sites: User's sites ordered by update time (dashboard sorting)
CREATE INDEX IF NOT EXISTS idx_sites_user_updated
  ON sites(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Site versions: Latest version lookup
CREATE INDEX IF NOT EXISTS idx_site_versions_site_number
  ON site_versions(site_id, version_number DESC);

-- Workspace members: Fast membership check
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
  ON workspace_members(user_id, workspace_id);

-- Documents: User's documents with status
CREATE INDEX IF NOT EXISTS idx_documents_site_status
  ON documents(site_id, processing_status);

-- Site pages: Page lookup by slug and persona
CREATE INDEX IF NOT EXISTS idx_site_pages_lookup
  ON site_pages(site_id, page_slug, persona_type);

-- ============================================
-- 2. Partial Indexes for Active Records
-- ============================================

-- Active sites only (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sites_active
  ON sites(user_id)
  WHERE deleted_at IS NULL AND status != 'archived';

-- Published sites only (for public widget queries)
CREATE INDEX IF NOT EXISTS idx_sites_published
  ON sites(id)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Pending documents (for processing queue)
CREATE INDEX IF NOT EXISTS idx_documents_pending
  ON documents(site_id, created_at)
  WHERE processing_status = 'pending';

-- ============================================
-- 3. Helper Functions for Common Operations
-- ============================================

-- Function to get user's sites efficiently
CREATE OR REPLACE FUNCTION get_user_sites(
  p_user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  status VARCHAR,
  site_type VARCHAR,
  current_version_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id,
    s.title,
    s.description,
    s.status,
    s.site_type,
    s.current_version_id,
    s.created_at,
    s.updated_at
  FROM sites s
  WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
    AND (p_status IS NULL OR s.status = p_status)
  ORDER BY s.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Function to get site with ownership validation
CREATE OR REPLACE FUNCTION get_site_if_owner(
  p_site_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  title VARCHAR,
  description TEXT,
  status VARCHAR,
  site_type VARCHAR,
  requirements JSONB,
  target_audience TEXT,
  main_goal TEXT,
  current_version_id UUID,
  brand_assets JSONB,
  chat_widget_enabled BOOLEAN,
  chat_widget_config JSONB,
  dynamic_pages_enabled BOOLEAN,
  persona_detection_enabled BOOLEAN,
  persona_detection_config JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id,
    s.workspace_id,
    s.title,
    s.description,
    s.status,
    s.site_type,
    s.requirements,
    s.target_audience,
    s.main_goal,
    s.current_version_id,
    s.brand_assets,
    s.chat_widget_enabled,
    s.chat_widget_config,
    s.dynamic_pages_enabled,
    s.persona_detection_enabled,
    s.persona_detection_config,
    s.created_at,
    s.updated_at
  FROM sites s
  WHERE s.id = p_site_id
    AND s.user_id = p_user_id
    AND s.deleted_at IS NULL;
$$;

-- Function to get latest site version
CREATE OR REPLACE FUNCTION get_latest_site_version(p_site_id UUID)
RETURNS TABLE (
  id UUID,
  version_number INT,
  html_content TEXT,
  css_content TEXT,
  js_content TEXT,
  component_tree JSONB,
  generation_type VARCHAR,
  change_summary TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    sv.id,
    sv.version_number,
    sv.html_content,
    sv.css_content,
    sv.js_content,
    sv.component_tree,
    sv.generation_type,
    sv.change_summary,
    sv.created_at
  FROM site_versions sv
  WHERE sv.site_id = p_site_id
  ORDER BY sv.version_number DESC
  LIMIT 1;
$$;

-- Function to count user's sites by status
CREATE OR REPLACE FUNCTION get_user_site_counts(p_user_id UUID)
RETURNS TABLE (
  status VARCHAR,
  count BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.status,
    COUNT(*) as count
  FROM sites s
  WHERE s.user_id = p_user_id
    AND s.deleted_at IS NULL
  GROUP BY s.status;
$$;

-- ============================================
-- 4. Comments
-- ============================================

COMMENT ON FUNCTION get_user_sites IS 'Efficiently retrieves paginated list of user sites with optional status filter';
COMMENT ON FUNCTION get_site_if_owner IS 'Gets full site data only if the user owns it - combines select and authorization';
COMMENT ON FUNCTION get_latest_site_version IS 'Gets the most recent version of a site without needing current_version_id';
COMMENT ON FUNCTION get_user_site_counts IS 'Gets count of user sites grouped by status for dashboard stats';
