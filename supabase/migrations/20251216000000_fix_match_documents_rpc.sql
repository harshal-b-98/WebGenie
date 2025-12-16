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
