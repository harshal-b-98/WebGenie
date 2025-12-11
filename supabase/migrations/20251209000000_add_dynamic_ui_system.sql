-- Dynamic UI Generation System
-- Adds support for progressive page generation, persona detection, and visitor tracking

-- ============================================
-- 1. Add new columns to sites table
-- ============================================

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS persona_detection_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS persona_detection_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dynamic_pages_enabled BOOLEAN DEFAULT TRUE;

-- persona_detection_config structure:
-- {
--   "personaTypes": ["developer", "executive", "buyer", "end_user", "general"],
--   "trackingEnabled": true,
--   "adaptiveContent": true,
--   "confidenceThreshold": 0.7
-- }

-- ============================================
-- 2. Create site_pages table for dynamic page hierarchy
-- ============================================

CREATE TABLE IF NOT EXISTS site_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,

  -- Page hierarchy
  page_type VARCHAR(50) NOT NULL CHECK (page_type IN ('landing', 'segment', 'detail')),
  page_slug VARCHAR(255) NOT NULL,
  parent_page_id UUID REFERENCES site_pages(id) ON DELETE SET NULL,

  -- Content
  html_content TEXT NOT NULL,
  title VARCHAR(255),

  -- Segment information (for segment and detail pages)
  segment_type VARCHAR(50) CHECK (segment_type IN ('features', 'solutions', 'platform', 'faq', NULL)),
  topic_slug VARCHAR(255), -- For detail pages: specific feature/solution slug

  -- Generation metadata
  persona_type VARCHAR(50) CHECK (persona_type IN ('developer', 'executive', 'buyer', 'end_user', 'general', NULL)),
  generation_context JSONB DEFAULT '{}',

  -- AI generation info
  ai_provider VARCHAR(50),
  model VARCHAR(100),
  tokens_used INTEGER,
  generation_time_ms INTEGER,

  -- Caching
  cache_expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: each page slug unique per site and persona
  UNIQUE(site_id, page_slug, persona_type)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_site_pages_site ON site_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_type ON site_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_site_pages_segment ON site_pages(segment_type);
CREATE INDEX IF NOT EXISTS idx_site_pages_persona ON site_pages(persona_type);
CREATE INDEX IF NOT EXISTS idx_site_pages_cache ON site_pages(cache_expires_at) WHERE cache_expires_at IS NOT NULL;

-- ============================================
-- 3. Create visitor_sessions table for persona tracking
-- ============================================

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,

  -- Persona detection
  detected_persona VARCHAR(50) CHECK (detected_persona IN ('developer', 'executive', 'buyer', 'end_user', 'general', NULL)),
  persona_confidence DECIMAL(3, 2) DEFAULT 0.0 CHECK (persona_confidence >= 0 AND persona_confidence <= 1),

  -- Behavior signals for persona detection
  behavior_signals JSONB DEFAULT '{}',
  -- Structure:
  -- {
  --   "pagesVisited": ["landing", "features", "solutions"],
  --   "timeOnSections": {"hero": 5.2, "features": 12.3},
  --   "clickedElements": ["btn-explore", "feature-ai-integration"],
  --   "scrollDepth": {"features": 0.85, "solutions": 0.5},
  --   "searchQueries": ["api documentation", "pricing"]
  -- }

  -- Visitor metadata
  user_agent TEXT,
  ip_hash VARCHAR(64), -- Hashed for privacy
  referrer TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_site ON visitor_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_token ON visitor_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_persona ON visitor_sessions(detected_persona);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_expires ON visitor_sessions(expires_at);

-- ============================================
-- 4. Create page_views table for analytics
-- ============================================

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES site_pages(id) ON DELETE CASCADE,
  session_id UUID REFERENCES visitor_sessions(id) ON DELETE SET NULL,

  -- Page info
  page_slug VARCHAR(255) NOT NULL,
  page_type VARCHAR(50),

  -- View metrics
  time_on_page INTEGER, -- seconds
  scroll_depth DECIMAL(3, 2), -- 0.00 to 1.00

  -- Timestamps
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_views_site ON page_views(site_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(viewed_at);

-- ============================================
-- 5. RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Site pages policies
CREATE POLICY "Users can view own site pages" ON site_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_pages.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own site pages" ON site_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_pages.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own site pages" ON site_pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_pages.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own site pages" ON site_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_pages.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Visitor sessions policies (public read for widget, owner full access)
CREATE POLICY "Anyone can view sessions for published sites" ON visitor_sessions
  FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert sessions" ON visitor_sessions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can update sessions" ON visitor_sessions
  FOR UPDATE USING (TRUE);

-- Page views policies
CREATE POLICY "Users can view own site page views" ON page_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = page_views.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert page views" ON page_views
  FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- 6. Functions
-- ============================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM visitor_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE visitor_sessions
  SET last_activity_at = NOW(),
      expires_at = NOW() + INTERVAL '7 days'
  WHERE session_token = p_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Comments for documentation
-- ============================================

COMMENT ON TABLE site_pages IS 'Stores dynamically generated pages (landing, segment, detail) for progressive UI generation';
COMMENT ON TABLE visitor_sessions IS 'Tracks visitor sessions for persona detection and content personalization';
COMMENT ON TABLE page_views IS 'Analytics for page views and visitor behavior tracking';
COMMENT ON COLUMN sites.persona_detection_enabled IS 'Whether AI-based persona detection is enabled for this site';
COMMENT ON COLUMN sites.dynamic_pages_enabled IS 'Whether progressive/on-demand page generation is enabled';
