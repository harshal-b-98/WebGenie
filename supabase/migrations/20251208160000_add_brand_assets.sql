-- Add brand assets and configuration columns to sites table
-- Stores logo, social media links, and chat widget settings

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS brand_assets JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chat_widget_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS chat_widget_config JSONB DEFAULT '{}';

-- brand_assets structure:
-- {
--   "logo": {
--     "url": "https://storage.../logo.png",
--     "dominantColors": ["#667eea", "#764ba2"],
--     "style": "modern",
--     "colorScheme": "cool"
--   },
--   "socialMedia": {
--     "linkedin": "https://linkedin.com/company/...",
--     "twitter": "https://twitter.com/...",
--     "facebook": "...",
--     "instagram": "...",
--     "youtube": "..."
--   }
-- }

-- chat_widget_config structure:
-- {
--   "position": "bottom-right",
--   "primaryColor": "#667eea",
--   "welcomeMessage": "Hi! How can I help?"
-- }

-- Create storage bucket for logos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-logos',
  'site-logos',
  true, -- Public so logos can be displayed
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos
DROP POLICY IF EXISTS "Users can upload logos for own sites" ON storage.objects;
CREATE POLICY "Users can upload logos for own sites" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'site-logos' AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-logos');

DROP POLICY IF EXISTS "Users can delete own logos" ON storage.objects;
CREATE POLICY "Users can delete own logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'site-logos' AND
    auth.role() = 'authenticated'
  );
