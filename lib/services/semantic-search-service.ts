// Semantic Search Service
// Uses vector similarity to find relevant content from document embeddings

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { DatabaseError } from "@/lib/utils/errors";
import type { ChunkType } from "./embedding-service";
import OpenAI from "openai";

// Create service role client for public widget access (bypasses RLS)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface SearchResult {
  id: string;
  chunkText: string;
  chunkType: ChunkType | null;
  keywords: string[];
  similarity: number;
  documentId: string;
}

export interface SemanticSearchOptions {
  chunkTypes?: ChunkType[];
  limit?: number;
  threshold?: number;
}

/**
 * Perform semantic search across project's document embeddings
 */
export async function semanticSearch(
  projectId: string,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SearchResult[]> {
  const { chunkTypes, limit = 10, threshold = 0.7 } = options;

  logger.info("Performing semantic search", {
    projectId,
    query: query.substring(0, 100),
    chunkTypes,
    limit,
    threshold,
  });

  try {
    // Step 1: Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Step 2: Search using vector similarity
    const results = await vectorSearch(projectId, queryEmbedding, {
      chunkTypes,
      limit,
      threshold,
    });

    logger.info("Semantic search completed", {
      projectId,
      resultsFound: results.length,
    });

    return results;
  } catch (error) {
    logger.error("Semantic search failed", error, { projectId, query });
    throw new DatabaseError("Semantic search failed");
  }
}

/**
 * Generate embedding vector for a search query
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error("Failed to generate query embedding", error, { query });
    throw new Error("Failed to generate query embedding");
  }
}

/**
 * Perform vector similarity search using PostgreSQL function
 */
async function vectorSearch(
  projectId: string,
  queryEmbedding: number[],
  options: SemanticSearchOptions
): Promise<SearchResult[]> {
  const { chunkTypes, limit = 10, threshold = 0.7 } = options;

  // Use service client to bypass RLS for public widget access
  const supabase = getServiceClient();

  // Call the match_documents PostgreSQL function
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
    filter_project_id: projectId,
    filter_chunk_types: chunkTypes || null,
  } as never);

  if (error) {
    logger.error("Vector search failed", error, { projectId });
    throw new DatabaseError(`Vector search failed: ${error.message}`);
  }

  // Transform results
  const rawResults =
    (data as {
      id: string;
      chunk_text: string;
      chunk_type: string | null;
      keywords: string[];
      similarity: number;
      document_id: string;
    }[]) || [];

  const results: SearchResult[] = rawResults.map((row) => ({
    id: row.id,
    chunkText: row.chunk_text,
    chunkType: row.chunk_type as ChunkType | null,
    keywords: row.keywords || [],
    similarity: row.similarity,
    documentId: row.document_id,
  }));

  return results;
}

/**
 * Search for specific types of content (e.g., only pricing chunks)
 */
export async function searchByType(
  projectId: string,
  query: string,
  chunkType: ChunkType,
  limit: number = 5
): Promise<SearchResult[]> {
  return semanticSearch(projectId, query, {
    chunkTypes: [chunkType],
    limit,
    threshold: 0.45,
  });
}

/**
 * Get the most relevant context for answering a question
 * Returns combined text from top results
 */
export async function getRelevantContext(
  projectId: string,
  question: string,
  maxChunks: number = 10
): Promise<string> {
  const results = await semanticSearch(projectId, question, {
    limit: maxChunks,
    threshold: 0.45,
  });

  if (results.length === 0) {
    return "";
  }

  // Combine chunk texts
  const context = results.map((r) => r.chunkText).join("\n\n");

  return context;
}

/**
 * Search with highlighting of matched keywords
 */
export async function searchWithHighlights(
  projectId: string,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<Array<SearchResult & { highlights: string[] }>> {
  const results = await semanticSearch(projectId, query, options);

  // Extract query keywords for highlighting
  const queryKeywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  return results.map((result) => ({
    ...result,
    highlights: result.keywords.filter((kw) =>
      queryKeywords.some((qk) => kw.includes(qk) || qk.includes(kw))
    ),
  }));
}
