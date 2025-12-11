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
