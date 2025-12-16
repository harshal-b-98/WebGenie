-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable Vector extension for embeddings
create extension if not exists "vector";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workspaces table
create table public.workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workspace Members table
create table public.workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, user_id)
);

-- Websites table
create table public.websites (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  slug text not null unique,
  status text not null default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Profiles: Users can view their own profile
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Workspaces: Members can view
alter table public.workspaces enable row level security;
create policy "Members can view workspaces" on public.workspaces
  for select using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
      and user_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

-- Workspace Members: Members can view other members
alter table public.workspace_members enable row level security;
create policy "Members can view other members" on public.workspace_members
  for select using (
    exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Websites: Members can view websites
alter table public.websites enable row level security;
create policy "Members can view websites" on public.websites
  for select using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = websites.workspace_id
      and user_id = auth.uid()
    )
  );

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Add deleted_at column to workspaces table for soft deletes
alter table public.workspaces
add column deleted_at timestamp with time zone;

-- Add deleted_at column to workspace_members table for soft deletes
alter table public.workspace_members
add column deleted_at timestamp with time zone;

-- Add deleted_at column to websites table for soft deletes
alter table public.websites
add column deleted_at timestamp with time zone;

-- Update RLS policies to exclude soft-deleted records

-- Workspaces: Members can view (excluding deleted)
drop policy if exists "Members can view workspaces" on public.workspaces;
create policy "Members can view workspaces" on public.workspaces
  for select using (
    deleted_at is null and (
      exists (
        select 1 from public.workspace_members
        where workspace_id = workspaces.id
        and user_id = auth.uid()
        and deleted_at is null
      )
      or owner_id = auth.uid()
    )
  );

-- Workspace Members: Members can view other members (excluding deleted)
drop policy if exists "Members can view other members" on public.workspace_members;
create policy "Members can view other members" on public.workspace_members
  for select using (
    deleted_at is null and exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
    )
  );

-- Websites: Members can view websites (excluding deleted)
drop policy if exists "Members can view websites" on public.websites;
create policy "Members can view websites" on public.websites
  for select using (
    deleted_at is null and exists (
      select 1 from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      where wm.workspace_id = websites.workspace_id
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
      and w.deleted_at is null
    )
  );
-- Fix infinite recursion in workspace_members policy
-- The issue was that the policy was querying workspace_members from within itself

-- Drop the problematic policy
drop policy if exists "Members can view other members" on public.workspace_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can view workspace members if they are viewing their own membership record
-- or if they share a workspace (checked via the workspace policy, not workspace_members)
create policy "Members can view other members" on public.workspace_members
  for select using (
    deleted_at is null and (
      user_id = auth.uid()
      or workspace_id in (
        select id from public.workspaces
        where owner_id = auth.uid()
        and deleted_at is null
      )
    )
  );

-- Also update the websites policy to avoid potential recursion
drop policy if exists "Members can view websites" on public.websites;
create policy "Members can view websites" on public.websites
  for select using (
    deleted_at is null and workspace_id in (
      select id from public.workspaces
      where (owner_id = auth.uid() or id in (
        select workspace_id from public.workspace_members
        where user_id = auth.uid() and deleted_at is null
      ))
      and deleted_at is null
    )
  );
-- PROPER fix for infinite recursion in RLS policies
-- The issue: workspaces checks workspace_members, workspace_members checks workspaces
-- Solution: Break the circular dependency by making workspaces policy simpler

-- Drop and recreate workspaces policy to only check owner
drop policy if exists "Members can view workspaces" on public.workspaces;
create policy "Owners can view workspaces" on public.workspaces
  for select using (
    deleted_at is null and owner_id = auth.uid()
  );

-- Keep the workspace_members policy as-is (it's already correct)
-- Users can view workspace members if they own the workspace
-- This doesn't cause recursion because workspaces policy no longer checks workspace_members
-- Add missing columns to workspaces table

alter table public.workspaces
  add column if not exists description text,
  add column if not exists settings jsonb default '{}'::jsonb;
-- Add INSERT, UPDATE, DELETE policies for workspaces table
-- Currently only have SELECT policy which prevents creating/updating/deleting

-- Allow users to create their own workspaces
create policy "Users can create workspaces" on public.workspaces
  for insert with check (
    owner_id = auth.uid()
  );

-- Allow owners to update their workspaces
create policy "Owners can update workspaces" on public.workspaces
  for update using (
    owner_id = auth.uid() and deleted_at is null
  );

-- Allow owners to delete their workspaces
create policy "Owners can delete workspaces" on public.workspaces
  for delete using (
    owner_id = auth.uid()
  );
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
-- Add RLS policies for the newly created tables
-- PostgreSQL doesn't support IF NOT EXISTS for policies, so we drop first

-- First, create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Sites policies
DROP POLICY IF EXISTS "Users can view own sites" ON sites;
CREATE POLICY "Users can view own sites" ON sites
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create sites" ON sites;
CREATE POLICY "Users can create sites" ON sites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sites" ON sites;
CREATE POLICY "Users can update own sites" ON sites
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sites" ON sites;
CREATE POLICY "Users can delete own sites" ON sites
  FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;
CREATE POLICY "Users can create messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Site Versions policies
DROP POLICY IF EXISTS "Users can view versions of own sites" ON site_versions;
CREATE POLICY "Users can view versions of own sites" ON site_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_versions.site_id
      AND sites.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create versions for own sites" ON site_versions;
CREATE POLICY "Users can create versions for own sites" ON site_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = site_versions.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Documents policies
DROP POLICY IF EXISTS "Users can view documents for own sites" ON documents;
CREATE POLICY "Users can view documents for own sites" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = documents.site_id
      AND sites.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can upload documents to own sites" ON documents;
CREATE POLICY "Users can upload documents to own sites" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = documents.site_id
      AND sites.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Assets policies
DROP POLICY IF EXISTS "Users can view own assets" ON assets;
CREATE POLICY "Users can view own assets" ON assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upload assets" ON assets;
CREATE POLICY "Users can upload assets" ON assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own assets" ON assets;
CREATE POLICY "Users can delete own assets" ON assets
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Create storage buckets for file uploads

-- Documents bucket (for pitch decks, brochures, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Users can upload documents to own sites" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1] -- First folder is user ID
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Assets bucket (for images, videos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true, -- Public bucket for website assets
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assets bucket
CREATE POLICY "Anyone can view assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

CREATE POLICY "Users can upload assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
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
-- Document embeddings for semantic search
-- Enables AI chat widget to answer visitor questions intelligently

CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,

  -- Chunk content and metadata
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_type VARCHAR(50), -- feature, benefit, pricing, use_case, technical, testimonial, general
  keywords TEXT[], -- Extracted important terms for filtering
  metadata JSONB DEFAULT '{}',

  -- Vector embedding (OpenAI ada-002: 1536 dimensions)
  embedding vector(1536),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure uniqueness per document chunk
  UNIQUE(document_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX idx_embeddings_project ON document_embeddings(project_id);
CREATE INDEX idx_embeddings_document ON document_embeddings(document_id);
CREATE INDEX idx_embeddings_type ON document_embeddings(chunk_type) WHERE chunk_type IS NOT NULL;
CREATE INDEX idx_embeddings_created ON document_embeddings(created_at DESC);

-- Vector similarity search index using IVFFlat algorithm
-- Lists parameter: sqrt(total_rows) is a good starting point, using 100 for initial setup
CREATE INDEX idx_embeddings_vector ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view embeddings for their own sites
CREATE POLICY "Users can view embeddings for own sites" ON document_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = document_embeddings.project_id
      AND sites.user_id = auth.uid()
      AND sites.deleted_at IS NULL
    )
  );

-- Service role can insert embeddings (used by document processing)
CREATE POLICY "Service role can create embeddings" ON document_embeddings
  FOR INSERT WITH CHECK (true);

-- Users can delete embeddings for their own sites
CREATE POLICY "Users can delete embeddings for own sites" ON document_embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = document_embeddings.project_id
      AND sites.user_id = auth.uid()
    )
  );

-- PostgreSQL function for vector similarity search
-- Returns chunks most similar to a query embedding
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL,
  filter_chunk_types varchar[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  chunk_type varchar,
  keywords text[],
  similarity float,
  document_id uuid
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    chunk_text,
    chunk_type,
    keywords,
    1 - (embedding <=> query_embedding) AS similarity,
    document_id
  FROM document_embeddings
  WHERE
    (filter_project_id IS NULL OR project_id = filter_project_id)
    AND (filter_chunk_types IS NULL OR chunk_type = ANY(filter_chunk_types))
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Comment explaining the function
COMMENT ON FUNCTION match_documents IS 'Performs vector similarity search on document embeddings. Returns chunks most similar to the query embedding, filtered by project and chunk types, above the similarity threshold.';
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
-- Fix match_documents function to accept TEXT input for embeddings
-- This is necessary because Supabase JS client cannot pass native vector types
-- The function converts the JSON array text to a vector internally

-- First drop the old function
DROP FUNCTION IF EXISTS match_documents(vector, float, int, uuid, varchar[]);

-- Create new function that accepts TEXT and casts to vector
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding TEXT,           -- Changed from vector(1536) to TEXT
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_project_id uuid DEFAULT NULL,
  filter_chunk_types varchar[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  chunk_type varchar,
  keywords text[],
  similarity float,
  document_id uuid
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  query_vector vector(1536);
BEGIN
  -- Cast the text input to vector
  query_vector := query_embedding::vector;

  RETURN QUERY
  SELECT
    de.id,
    de.chunk_text,
    de.chunk_type,
    de.keywords,
    (1 - (de.embedding <=> query_vector))::float AS similarity,
    de.document_id
  FROM document_embeddings de
  WHERE
    (filter_project_id IS NULL OR de.project_id = filter_project_id)
    AND (filter_chunk_types IS NULL OR de.chunk_type = ANY(filter_chunk_types))
    AND de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> query_vector) > match_threshold
  ORDER BY de.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

-- Comment explaining the function
COMMENT ON FUNCTION match_documents(TEXT, float, int, uuid, varchar[]) IS
'Performs vector similarity search on document embeddings.
Accepts query embedding as TEXT (JSON array format) and casts to vector internally.
Returns chunks most similar to the query embedding, filtered by project and chunk types, above the similarity threshold.';
