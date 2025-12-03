-- NextGenWeb Database Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business', 'agency')),
  credits_remaining INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Sites (website projects)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  site_type VARCHAR(100), -- landing, portfolio, blog, etc.
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'generated', 'published', 'archived')),

  -- Requirements from AI interview
  requirements JSONB,
  target_audience TEXT,
  main_goal TEXT,

  -- Generated content
  current_version_id UUID,
  published_url TEXT,
  subdomain VARCHAR(255) UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Conversations (AI chat sessions)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_type VARCHAR(50) NOT NULL CHECK (conversation_type IN ('clarification', 'generation', 'refinement')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  ai_provider VARCHAR(50), -- openai, anthropic, etc.
  model VARCHAR(100),
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
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
CREATE TABLE site_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,

  -- Generated code
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  component_tree JSONB,

  -- Generation metadata
  generation_type VARCHAR(50) NOT NULL CHECK (generation_type IN ('initial', 'refinement')),
  prompt_context JSONB,
  ai_provider VARCHAR(50),
  model VARCHAR(100),
  tokens_used INTEGER,
  generation_time_ms INTEGER,

  -- Version info
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(site_id, version_number)
);

-- Add foreign key constraint
ALTER TABLE sites ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES site_versions(id);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- File information
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- pdf, docx
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,

  -- Processed content
  extracted_text TEXT,
  summary TEXT, -- AI-generated summary
  metadata JSONB DEFAULT '{}',

  processing_status VARCHAR(50) DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (uploaded files, images)
CREATE TABLE assets (
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

-- Indexes for performance
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_sites_workspace ON sites(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sites_user ON sites(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_conversations_site ON conversations(site_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_site_versions_site ON site_versions(site_id);
CREATE INDEX idx_documents_site ON documents(site_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_assets_workspace ON assets(workspace_id);

-- Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = owner_id AND deleted_at IS NULL);

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = owner_id);

-- Sites policies
CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
  ON sites FOR DELETE
  USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Site Versions policies
CREATE POLICY "Users can view versions of own sites"
  ON site_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_versions.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for own sites"
  ON site_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_versions.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents for own sites"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = documents.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to own sites"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = documents.site_id
      AND sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Assets policies
CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
