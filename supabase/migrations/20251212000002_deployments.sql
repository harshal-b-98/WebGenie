-- Deployments Schema
-- Tracks website deployments to Vercel and other providers

-- ============================================
-- 1. Deployments Table
-- ============================================

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  version_id UUID REFERENCES site_versions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL DEFAULT 'vercel',

  -- Deployment status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status values: pending, building, ready, error, canceled

  -- URLs
  deployment_url TEXT,
  production_url TEXT,
  preview_url TEXT,

  -- Vercel-specific fields
  vercel_project_id TEXT,
  vercel_deployment_id TEXT,
  vercel_team_id TEXT,

  -- Build info
  build_started_at TIMESTAMPTZ,
  build_completed_at TIMESTAMPTZ,
  build_duration_ms INTEGER,

  -- Error handling
  error_message TEXT,
  error_code VARCHAR(100),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Custom Domains Table
-- ============================================

CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Domain info
  domain VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status values: pending, verifying, active, error, expired

  -- Verification
  verification_type VARCHAR(50) DEFAULT 'dns',
  verification_token TEXT,
  verified_at TIMESTAMPTZ,

  -- SSL
  ssl_status VARCHAR(50) DEFAULT 'pending',
  ssl_expires_at TIMESTAMPTZ,

  -- Provider info
  vercel_domain_id TEXT,

  -- Primary domain flag
  is_primary BOOLEAN DEFAULT FALSE,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(domain, subdomain)
);

-- ============================================
-- 3. Vercel Connections Table
-- ============================================

CREATE TABLE IF NOT EXISTS vercel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted in application layer)
  access_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  scope TEXT,

  -- Team/Account info
  vercel_user_id TEXT,
  vercel_team_id TEXT,
  vercel_team_slug TEXT,

  -- Account details
  email VARCHAR(255),
  username VARCHAR(255),

  -- Token management
  expires_at TIMESTAMPTZ,
  refresh_token TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One connection per user (can add team support later)
  UNIQUE(user_id)
);

-- ============================================
-- 4. Add deployment fields to sites table
-- ============================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS vercel_project_id TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS vercel_project_name TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS production_url TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS last_deployed_at TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS last_deployment_id UUID REFERENCES deployments(id);

-- ============================================
-- 5. Indexes
-- ============================================

-- Deployments indexes
CREATE INDEX IF NOT EXISTS idx_deployments_site_id ON deployments(site_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_site_created ON deployments(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_vercel_id ON deployments(vercel_deployment_id) WHERE vercel_deployment_id IS NOT NULL;

-- Custom domains indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_site_id ON custom_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);

-- Vercel connections indexes
CREATE INDEX IF NOT EXISTS idx_vercel_connections_user_id ON vercel_connections(user_id);

-- ============================================
-- 6. Row Level Security
-- ============================================

-- Enable RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE vercel_connections ENABLE ROW LEVEL SECURITY;

-- Deployments policies
CREATE POLICY "Users can view their own deployments"
  ON deployments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deployments for their sites"
  ON deployments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_id AND sites.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own deployments"
  ON deployments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deployments"
  ON deployments FOR DELETE
  USING (auth.uid() = user_id);

-- Custom domains policies
CREATE POLICY "Users can view their own custom domains"
  ON custom_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create custom domains for their sites"
  ON custom_domains FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_id AND sites.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own custom domains"
  ON custom_domains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom domains"
  ON custom_domains FOR DELETE
  USING (auth.uid() = user_id);

-- Vercel connections policies
CREATE POLICY "Users can view their own Vercel connections"
  ON vercel_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Vercel connections"
  ON vercel_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Vercel connections"
  ON vercel_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Vercel connections"
  ON vercel_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. Update Triggers
-- ============================================

CREATE TRIGGER deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER custom_domains_updated_at
  BEFORE UPDATE ON custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER vercel_connections_updated_at
  BEFORE UPDATE ON vercel_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Helper Functions
-- ============================================

-- Get latest deployment for a site
CREATE OR REPLACE FUNCTION get_latest_deployment(p_site_id UUID)
RETURNS TABLE (
  id UUID,
  status VARCHAR,
  deployment_url TEXT,
  production_url TEXT,
  vercel_deployment_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.status,
    d.deployment_url,
    d.production_url,
    d.vercel_deployment_id,
    d.created_at
  FROM deployments d
  WHERE d.site_id = p_site_id
  ORDER BY d.created_at DESC
  LIMIT 1;
$$;

-- Get deployment history for a site
CREATE OR REPLACE FUNCTION get_deployment_history(
  p_site_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  version_number INT,
  status VARCHAR,
  deployment_url TEXT,
  production_url TEXT,
  build_duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    sv.version_number,
    d.status,
    d.deployment_url,
    d.production_url,
    d.build_duration_ms,
    d.error_message,
    d.created_at
  FROM deployments d
  LEFT JOIN site_versions sv ON d.version_id = sv.id
  WHERE d.site_id = p_site_id
  ORDER BY d.created_at DESC
  LIMIT p_limit;
$$;

-- ============================================
-- 9. Comments
-- ============================================

COMMENT ON TABLE deployments IS 'Tracks all website deployments to hosting providers';
COMMENT ON TABLE custom_domains IS 'Custom domain configurations for deployed sites';
COMMENT ON TABLE vercel_connections IS 'OAuth connections to Vercel accounts';
COMMENT ON FUNCTION get_latest_deployment IS 'Gets the most recent deployment for a site';
COMMENT ON FUNCTION get_deployment_history IS 'Gets deployment history for a site with version info';
