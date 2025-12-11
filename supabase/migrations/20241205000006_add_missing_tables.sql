-- Add all missing tables that were in remote Supabase but not in local

-- User Profiles (if not using profiles from initial migration)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business', 'agency')),
  credits_remaining INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites table (main website projects table)
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  site_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'generated', 'published', 'archived')),
  requirements JSONB,
  target_audience TEXT,
  main_goal TEXT,
  current_version_id UUID,
  published_url TEXT,
  subdomain VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Conversations (AI chat sessions)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_type VARCHAR(50) NOT NULL CHECK (conversation_type IN ('clarification', 'generation', 'refinement')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  ai_provider VARCHAR(50),
  model VARCHAR(100),
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Versions (generation history)
CREATE TABLE IF NOT EXISTS site_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  component_tree JSONB,
  generation_type VARCHAR(50) NOT NULL CHECK (generation_type IN ('initial', 'refinement')),
  prompt_context JSONB,
  ai_provider VARCHAR(50),
  model VARCHAR(100),
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, version_number)
);

-- Add foreign key constraint for current_version_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_current_version'
  ) THEN
    ALTER TABLE sites ADD CONSTRAINT fk_current_version
      FOREIGN KEY (current_version_id) REFERENCES site_versions(id);
  END IF;
END $$;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  processing_status VARCHAR(50) DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  mime_type VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_workspace ON sites(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_conversations_site ON conversations(site_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_site_versions_site ON site_versions(site_id);
CREATE INDEX IF NOT EXISTS idx_documents_site ON documents(site_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);

-- RLS will be enabled by migration 20241205000007_add_policies_for_new_tables.sql
-- Policies and triggers will also be added by that migration
