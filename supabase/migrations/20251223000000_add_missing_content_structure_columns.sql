-- Add missing columns to site_content_structure table
-- These columns were defined in the original migration but never applied to production
-- Root cause: Migration file existed but was never run on cloud Supabase

-- Add max_depth column
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS max_depth INTEGER DEFAULT 2 CHECK (max_depth >= 1 AND max_depth <= 4);

-- Add lead_capture_points column
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS lead_capture_points JSONB DEFAULT '[]';

-- Add primary_cta column
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS primary_cta JSONB;

-- Add secondary_ctas column
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS secondary_ctas JSONB DEFAULT '[]';

-- Add analysis metadata columns
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS analysis_version INTEGER DEFAULT 1;

ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS document_hash VARCHAR(64);

ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS analysis_confidence DECIMAL(3, 2) DEFAULT 0.0 CHECK (analysis_confidence >= 0 AND analysis_confidence <= 1);

-- Add raw_analysis for debugging
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS raw_analysis JSONB;

-- Add metadata column if missing
ALTER TABLE site_content_structure
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN site_content_structure.max_depth IS 'AI-determined page hierarchy depth (1=segment only, 2=segment+detail, 3=deep nesting)';
COMMENT ON COLUMN site_content_structure.analysis_confidence IS 'Confidence score from AI analysis (0.0 to 1.0)';
COMMENT ON COLUMN site_content_structure.document_hash IS 'MD5 hash of combined document content to detect changes and avoid re-analysis';
