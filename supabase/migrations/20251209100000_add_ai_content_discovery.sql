-- AI-Driven Content Discovery System
-- Adds support for dynamic segment discovery, flexible page structure, and lead capture

-- ============================================
-- 1. Create site_content_structure table for AI-discovered content
-- ============================================

CREATE TABLE IF NOT EXISTS site_content_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Discovered segments (AI-determined, not hardcoded)
  segments JSONB NOT NULL DEFAULT '[]',
  -- Structure:
  -- [
  --   {
  --     "id": "uuid",
  --     "name": "Products",
  --     "slug": "products",
  --     "description": "Our product lineup",
  --     "items": [
  --       {
  --         "id": "uuid",
  --         "name": "Widget Pro",
  --         "slug": "widget-pro",
  --         "description": "Advanced widget solution",
  --         "hasDetailPage": true,
  --         "contentDepth": 150,
  --         "suggestedCTAs": ["Request Demo", "View Pricing"]
  --       }
  --     ],
  --     "suggestedInteractions": ["view-details", "compare", "demo"]
  --   }
  -- ]

  -- Page depth (AI-determined based on content richness)
  max_depth INTEGER DEFAULT 2 CHECK (max_depth >= 1 AND max_depth <= 4),

  -- Lead capture configuration
  lead_capture_points JSONB DEFAULT '[]',
  -- ["pricing", "demo", "contact", "newsletter"]

  -- CTAs (AI-determined based on business type)
  primary_cta JSONB,
  -- { "text": "Start Free Trial", "action": "signup", "style": "primary" }

  secondary_ctas JSONB DEFAULT '[]',
  -- [{ "text": "Schedule Demo", "action": "demo" }, { "text": "View Pricing", "action": "pricing" }]

  -- Business type classification
  business_type VARCHAR(50) CHECK (business_type IN ('product', 'service', 'marketplace', 'agency', 'ecommerce', 'other', NULL)),

  -- Analysis metadata
  analysis_version INTEGER DEFAULT 1,
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  document_hash VARCHAR(64), -- MD5 hash of combined document content to detect changes
  analysis_confidence DECIMAL(3, 2) DEFAULT 0.0 CHECK (analysis_confidence >= 0 AND analysis_confidence <= 1),

  -- Raw analysis output for debugging
  raw_analysis JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_content_structure_site ON site_content_structure(site_id);
CREATE INDEX IF NOT EXISTS idx_site_content_structure_business_type ON site_content_structure(business_type);

-- ============================================
-- 2. Create site_leads table for lead capture
-- ============================================

CREATE TABLE IF NOT EXISTS site_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,

  -- Lead information
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(255),
  message TEXT,

  -- Additional fields (flexible)
  custom_fields JSONB DEFAULT '{}',

  -- Lead source context
  source_page VARCHAR(255),      -- Which page the form was on (e.g., "products", "products/widget-pro")
  source_segment VARCHAR(100),   -- Which segment
  form_type VARCHAR(50),         -- 'demo', 'contact', 'newsletter', 'pricing', 'custom'
  form_id VARCHAR(100),          -- Specific form identifier

  -- Tracking
  session_id VARCHAR(255),
  detected_persona VARCHAR(50),
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),

  -- Lead status
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_leads_site ON site_leads(site_id);
CREATE INDEX IF NOT EXISTS idx_site_leads_email ON site_leads(email);
CREATE INDEX IF NOT EXISTS idx_site_leads_status ON site_leads(status);
CREATE INDEX IF NOT EXISTS idx_site_leads_form_type ON site_leads(form_type);
CREATE INDEX IF NOT EXISTS idx_site_leads_created ON site_leads(created_at);

-- ============================================
-- 3. Modify site_pages to support dynamic segments
-- ============================================

-- Remove the hardcoded segment_type constraint and make it flexible
ALTER TABLE site_pages
  DROP CONSTRAINT IF EXISTS site_pages_segment_type_check;

-- Add new column for dynamic segment reference
ALTER TABLE site_pages
  ADD COLUMN IF NOT EXISTS segment_id VARCHAR(100), -- References segment.id from site_content_structure.segments
  ADD COLUMN IF NOT EXISTS item_id VARCHAR(100);    -- References item.id for detail pages

-- Add index for dynamic segments
CREATE INDEX IF NOT EXISTS idx_site_pages_segment_id ON site_pages(segment_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_item_id ON site_pages(item_id);

-- ============================================
-- 4. RLS Policies for new tables
-- ============================================

-- Enable RLS
ALTER TABLE site_content_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;

-- Site content structure policies
CREATE POLICY "Users can view own site content structure" ON site_content_structure
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_content_structure.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own site content structure" ON site_content_structure
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_content_structure.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own site content structure" ON site_content_structure
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_content_structure.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own site content structure" ON site_content_structure
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_content_structure.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Public access for widget to read content structure
CREATE POLICY "Public can view published site content structure" ON site_content_structure
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_content_structure.site_id
      AND sites.status = 'published'
    )
  );

-- Site leads policies
CREATE POLICY "Users can view own site leads" ON site_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_leads.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own site leads" ON site_leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_leads.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own site leads" ON site_leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_leads.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Anyone can submit leads (public widget)
CREATE POLICY "Anyone can submit leads" ON site_leads
  FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- 5. Functions
-- ============================================

-- Function to get content structure for a site
CREATE OR REPLACE FUNCTION get_site_content_structure(p_site_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'segments', COALESCE(segments, '[]'::jsonb),
    'maxDepth', max_depth,
    'leadCapturePoints', COALESCE(lead_capture_points, '[]'::jsonb),
    'primaryCTA', primary_cta,
    'secondaryCTAs', COALESCE(secondary_ctas, '[]'::jsonb),
    'businessType', business_type,
    'lastAnalyzedAt', last_analyzed_at
  )
  INTO result
  FROM site_content_structure
  WHERE site_id = p_site_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update analysis timestamp
CREATE OR REPLACE FUNCTION update_content_structure_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_site_content_structure_timestamp
  BEFORE UPDATE ON site_content_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_content_structure_timestamp();

CREATE TRIGGER update_site_leads_timestamp
  BEFORE UPDATE ON site_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_content_structure_timestamp();

-- ============================================
-- 6. Comments
-- ============================================

COMMENT ON TABLE site_content_structure IS 'AI-discovered content structure for dynamic page generation - determines segments, items, and interactions based on uploaded documents';
COMMENT ON TABLE site_leads IS 'Lead capture storage for forms submitted through generated websites';
COMMENT ON COLUMN site_content_structure.segments IS 'AI-discovered segments (not hardcoded) with items and suggested interactions';
COMMENT ON COLUMN site_content_structure.max_depth IS 'AI-determined page hierarchy depth (1=segment only, 2=segment+detail, 3=deep nesting)';
COMMENT ON COLUMN site_content_structure.business_type IS 'AI-classified business type to inform page generation style';
COMMENT ON COLUMN site_leads.form_type IS 'Type of form: demo, contact, newsletter, pricing, custom';
