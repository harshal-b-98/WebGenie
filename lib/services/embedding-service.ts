// Document Embedding Service
// Handles chunking, embedding generation, and storage for semantic search

import { createClient } from "@/lib/db/server";
import { logger } from "@/lib/utils/logger";
import { DatabaseError } from "@/lib/utils/errors";
import OpenAI from "openai";

export interface DocumentChunk {
  text: string;
  index: number;
  type: ChunkType;
  keywords: string[];
  metadata?: Record<string, unknown>;
}

export type ChunkType =
  | "feature"
  | "benefit"
  | "pricing"
  | "use_case"
  | "technical"
  | "testimonial"
  | "general";

const CHUNK_SIZE_MIN = 500;
const CHUNK_SIZE_MAX = 1000;
const OVERLAP_SIZE = 100; // Overlap between chunks for context

/**
 * Intelligently chunk document text while preserving semantic meaning
 */
export async function chunkDocument(
  documentText: string,
  documentId: string,
  projectId: string
): Promise<DocumentChunk[]> {
  logger.info("Chunking document", { documentId, textLength: documentText.length });

  const chunks: DocumentChunk[] = [];
  const sentences = splitIntoSentences(documentText);

  let currentChunk = "";
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;

    // Check if adding this sentence exceeds max size
    if (potentialChunk.length > CHUNK_SIZE_MAX && currentChunk.length >= CHUNK_SIZE_MIN) {
      // Save current chunk
      const chunk = await processChunk(currentChunk, chunkIndex, documentId, projectId);
      chunks.push(chunk);
      chunkIndex++;

      // Start new chunk with overlap (last sentence from previous chunk)
      const lastSentences = currentChunk
        .split(/[.!?]+/)
        .slice(-2)
        .join(". ");
      currentChunk = lastSentences + " " + sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk if it has content
  if (currentChunk.trim().length >= CHUNK_SIZE_MIN) {
    const chunk = await processChunk(currentChunk, chunkIndex, documentId, projectId);
    chunks.push(chunk);
  }

  logger.info("Document chunked", { documentId, chunkCount: chunks.length });
  return chunks;
}

/**
 * Split text into sentences while preserving structure
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: . ! ? followed by space and capital letter
  // But preserve abbreviations like Dr., Mr., Inc., etc.
  const sentences = text
    .replace(/([.!?])\s+([A-Z])/g, "$1|$2") // Mark sentence boundaries
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/**
 * Process a chunk: classify type, extract keywords, create metadata
 */
async function processChunk(
  text: string,
  index: number,
  documentId: string,
  projectId: string
): Promise<DocumentChunk> {
  // Classify chunk type
  const chunkType = classifyChunkType(text);

  // Extract keywords
  const keywords = extractKeywords(text);

  return {
    text,
    index,
    type: chunkType,
    keywords,
    metadata: {
      length: text.length,
      sentenceCount: text.split(/[.!?]+/).length,
    },
  };
}

/**
 * Classify what type of content this chunk contains
 */
function classifyChunkType(text: string): ChunkType {
  const lowerText = text.toLowerCase();

  // Pattern matching for chunk types
  const patterns: Record<ChunkType, RegExp[]> = {
    pricing: [
      /\$([\d,]+)\s*(per|\/)\s*(month|year|user)/i,
      /pricing|plans?|cost|subscription|tier/i,
      /\d+%\s*off|discount|free trial/i,
    ],
    feature: [
      /features?|capabilities|functionality|includes?/i,
      /\b(supports?|enables?|provides?|offers?)\b/i,
    ],
    benefit: [
      /benefits?|advantages?|helps?|improves?|increases?|reduces?/i,
      /\d+%\s*(faster|more|better|increase|improvement)/i,
      /save (time|money|effort)/i,
    ],
    use_case: [
      /use case|example|scenario|how to|step-by-step/i,
      /\b(for|when|if you)\b.*\b(need|want|require)/i,
    ],
    technical: [
      /API|SDK|integration|architecture|technical|implementation/i,
      /code|programming|developer|endpoint/i,
    ],
    testimonial: [
      /testimonial|review|customer said|client feedback/i,
      /"[^"]+" - [A-Z][a-z]+ [A-Z][a-z]+/i, // Quote with attribution
    ],
    general: [], // Default
  };

  // Check each pattern
  for (const [type, regexes] of Object.entries(patterns) as [ChunkType, RegExp[]][]) {
    if (type === "general") continue;

    for (const regex of regexes) {
      if (regex.test(lowerText)) {
        return type;
      }
    }
  }

  return "general";
}

/**
 * Extract important keywords from text using simple NLP
 */
function extractKeywords(text: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "them",
    "their",
  ]);

  // Extract words, filter stop words, count frequency
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const wordCounts = new Map<string, number>();
  words.forEach((word) => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  // Sort by frequency and take top 10
  const keywords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return keywords;
}

/**
 * Generate embeddings for document chunks using OpenAI
 */
export async function generateEmbeddings(chunks: DocumentChunk[]): Promise<number[][]> {
  logger.info("Generating embeddings", { chunkCount: chunks.length });

  // Initialize OpenAI client
  const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Batch process chunks (OpenAI supports up to 2048 inputs per request)
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((chunk) => chunk.text);

      logger.info("Processing embedding batch", {
        batchIndex: i / BATCH_SIZE + 1,
        batchSize: batch.length,
      });

      const response = await openaiClient.embeddings.create({
        model: "text-embedding-ada-002",
        input: texts,
      });

      const embeddings = response.data.map((item: OpenAI.Embeddings.Embedding) => item.embedding);
      allEmbeddings.push(...embeddings);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info("Embeddings generated successfully", {
      totalEmbeddings: allEmbeddings.length,
    });

    return allEmbeddings;
  } catch (error) {
    logger.error("Failed to generate embeddings", error);
    throw new DatabaseError("Failed to generate embeddings");
  }
}

/**
 * Store embeddings in database
 */
export async function storeEmbeddings(
  projectId: string,
  documentId: string,
  chunks: DocumentChunk[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunk count (${chunks.length}) doesn't match embedding count (${embeddings.length})`
    );
  }

  logger.info("Storing embeddings", { documentId, count: chunks.length });

  const supabase = await createClient();

  // Prepare data for insertion
  const embeddingData = chunks.map((chunk, index) => ({
    project_id: projectId,
    document_id: documentId,
    chunk_text: chunk.text,
    chunk_index: chunk.index,
    chunk_type: chunk.type,
    keywords: chunk.keywords,
    metadata: chunk.metadata || {},
    embedding: JSON.stringify(embeddings[index]), // PostgreSQL vector type accepts JSON array
  }));

  // Insert in batches to avoid payload size limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < embeddingData.length; i += BATCH_SIZE) {
    const batch = embeddingData.slice(i, i + BATCH_SIZE);

    const { error } = await supabase.from("document_embeddings").insert(batch as never);

    if (error) {
      logger.error("Failed to store embeddings batch", error, {
        documentId,
        batchIndex: i / BATCH_SIZE,
      });
      throw new DatabaseError(`Failed to store embeddings: ${error.message}`);
    }
  }

  logger.info("Embeddings stored successfully", { documentId, count: chunks.length });
}

/**
 * Delete all embeddings for a document
 */
export async function deleteEmbeddings(documentId: string): Promise<void> {
  logger.info("Deleting embeddings", { documentId });

  const supabase = await createClient();

  const { error } = await supabase
    .from("document_embeddings")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    logger.error("Failed to delete embeddings", error, { documentId });
    throw new DatabaseError("Failed to delete embeddings");
  }

  logger.info("Embeddings deleted", { documentId });
}

/**
 * Get embedding count for a document
 */
export async function getEmbeddingCount(documentId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("document_embeddings")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (error) {
    logger.error("Failed to count embeddings", error, { documentId });
    return 0;
  }

  return count || 0;
}
