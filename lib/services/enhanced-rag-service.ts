/**
 * Enhanced RAG (Retrieval-Augmented Generation) Service
 *
 * Implements multi-stage retrieval with re-ranking for improved content relevance.
 * Features:
 * 1. Multi-stage retrieval (broad -> narrow)
 * 2. Re-ranking based on relevance scores
 * 3. Context deduplication
 * 4. Topic-specific retrieval strategies
 * 5. Caching for performance
 */

import { semanticSearch, SearchResult } from "./semantic-search-service";
import type { ChunkType } from "./embedding-service";
import { LRUCache } from "lru-cache";
import { logger } from "@/lib/utils/logger";

// Cache for retrieval results
const retrievalCache = new LRUCache<string, EnhancedSearchResult[]>({
  max: 200,
  ttl: 1000 * 60 * 10, // 10 minutes
});

export interface EnhancedSearchResult extends SearchResult {
  relevanceScore: number;
  topicMatch: number;
  deduplicationKey: string;
}

export interface MultiStageRetrievalOptions {
  // Stage 1: Broad retrieval
  broadLimit?: number;
  broadThreshold?: number;

  // Stage 2: Narrow retrieval
  narrowLimit?: number;
  narrowThreshold?: number;

  // Re-ranking
  enableReranking?: boolean;
  rerankTopK?: number;

  // Deduplication
  enableDeduplication?: boolean;
  similarityThreshold?: number;

  // Topic-specific
  topic?: string;
  preferredChunkTypes?: ChunkType[];
}

/**
 * Topic-specific retrieval strategies
 * Valid ChunkTypes: feature, benefit, pricing, use_case, technical, testimonial, general
 */
const TOPIC_STRATEGIES: Record<string, { chunkTypes: ChunkType[]; boost: number }> = {
  pricing: {
    chunkTypes: ["pricing", "feature"],
    boost: 1.5,
  },
  features: {
    chunkTypes: ["feature", "benefit"],
    boost: 1.3,
  },
  company: {
    chunkTypes: ["general", "benefit"],
    boost: 1.4,
  },
  contact: {
    chunkTypes: ["general"],
    boost: 1.6,
  },
  testimonials: {
    chunkTypes: ["testimonial"],
    boost: 1.4,
  },
  faq: {
    chunkTypes: ["general", "use_case"],
    boost: 1.2,
  },
  services: {
    chunkTypes: ["feature", "benefit", "use_case"],
    boost: 1.3,
  },
  products: {
    chunkTypes: ["feature", "pricing", "technical"],
    boost: 1.3,
  },
  technical: {
    chunkTypes: ["technical", "feature"],
    boost: 1.4,
  },
  benefits: {
    chunkTypes: ["benefit", "feature"],
    boost: 1.3,
  },
  use_cases: {
    chunkTypes: ["use_case", "testimonial"],
    boost: 1.3,
  },
};

/**
 * Multi-stage retrieval with re-ranking
 */
export async function enhancedRetrieval(
  projectId: string,
  query: string,
  options: MultiStageRetrievalOptions = {}
): Promise<EnhancedSearchResult[]> {
  const {
    broadLimit = 30,
    broadThreshold = 0.6,
    narrowLimit = 15,
    // narrowThreshold reserved for future multi-stage filtering
    enableReranking = true,
    rerankTopK = 10,
    enableDeduplication = true,
    similarityThreshold = 0.85,
    topic,
    preferredChunkTypes,
  } = options;

  // Check cache
  const cacheKey = generateCacheKey(projectId, query, options);
  const cached = retrievalCache.get(cacheKey);
  if (cached) {
    logger.debug("RAG cache hit", { projectId, query: query.substring(0, 50) });
    return cached;
  }

  logger.info("Starting enhanced retrieval", {
    projectId,
    query: query.substring(0, 100),
    topic,
  });

  try {
    // Stage 1: Broad retrieval
    const broadResults = await semanticSearch(projectId, query, {
      limit: broadLimit,
      threshold: broadThreshold,
      chunkTypes: preferredChunkTypes,
    });

    logger.debug("Stage 1 (broad) results", { count: broadResults.length });

    if (broadResults.length === 0) {
      return [];
    }

    // Stage 2: Filter and enhance
    let enhancedResults = broadResults.map((result) => enhanceResult(result, query, topic));

    // Apply topic-specific boosting
    if (topic && TOPIC_STRATEGIES[topic.toLowerCase()]) {
      enhancedResults = applyTopicBoost(enhancedResults, topic);
    }

    // Re-ranking
    if (enableReranking) {
      enhancedResults = rerank(enhancedResults, query);
    }

    // Sort by relevance score
    enhancedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Narrow down to top results
    enhancedResults = enhancedResults.slice(0, narrowLimit);

    // Deduplication
    if (enableDeduplication) {
      enhancedResults = deduplicate(enhancedResults, similarityThreshold);
    }

    // Final top-K selection
    const finalResults = enhancedResults.slice(0, rerankTopK);

    // Cache results
    retrievalCache.set(cacheKey, finalResults);

    logger.info("Enhanced retrieval completed", {
      projectId,
      broadResults: broadResults.length,
      finalResults: finalResults.length,
    });

    return finalResults;
  } catch (error) {
    logger.error("Enhanced retrieval failed", error, { projectId, query });
    throw error;
  }
}

/**
 * Get optimized context for generation
 */
export async function getOptimizedContext(
  projectId: string,
  query: string,
  options: MultiStageRetrievalOptions & { maxTokens?: number } = {}
): Promise<{
  context: string;
  sources: EnhancedSearchResult[];
  tokenEstimate: number;
}> {
  const { maxTokens = 4000 } = options;

  const results = await enhancedRetrieval(projectId, query, options);

  if (results.length === 0) {
    return { context: "", sources: [], tokenEstimate: 0 };
  }

  // Build context with token budget
  const chunks: string[] = [];
  let totalTokens = 0;
  const includedSources: EnhancedSearchResult[] = [];

  for (const result of results) {
    const chunkTokens = estimateTokens(result.chunkText);
    if (totalTokens + chunkTokens <= maxTokens) {
      chunks.push(formatChunk(result));
      totalTokens += chunkTokens;
      includedSources.push(result);
    }
  }

  const context = chunks.join("\n\n---\n\n");

  return {
    context,
    sources: includedSources,
    tokenEstimate: totalTokens,
  };
}

/**
 * Topic-specific retrieval
 */
export async function retrieveByTopic(
  projectId: string,
  topic: string,
  query?: string
): Promise<EnhancedSearchResult[]> {
  const strategy = TOPIC_STRATEGIES[topic.toLowerCase()];
  const searchQuery = query || `${topic} information`;

  return enhancedRetrieval(projectId, searchQuery, {
    topic,
    preferredChunkTypes: strategy?.chunkTypes,
    enableReranking: true,
    rerankTopK: 8,
  });
}

/**
 * Batch retrieval for multiple queries
 */
export async function batchRetrieval(
  projectId: string,
  queries: string[],
  options: MultiStageRetrievalOptions = {}
): Promise<Map<string, EnhancedSearchResult[]>> {
  const results = new Map<string, EnhancedSearchResult[]>();

  // Run retrievals in parallel (with limit)
  const batchSize = 5;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((query) => enhancedRetrieval(projectId, query, options))
    );

    batch.forEach((query, idx) => {
      results.set(query, batchResults[idx]);
    });
  }

  return results;
}

// Helper functions

function enhanceResult(result: SearchResult, query: string, topic?: string): EnhancedSearchResult {
  const queryKeywords = extractKeywords(query);
  const chunkKeywords = result.keywords || [];

  // Calculate keyword overlap
  const keywordMatch =
    queryKeywords.filter((qk) => chunkKeywords.some((ck) => ck.includes(qk) || qk.includes(ck)))
      .length / Math.max(queryKeywords.length, 1);

  // Calculate topic match
  let topicMatch = 0;
  if (topic && result.chunkType) {
    const strategy = TOPIC_STRATEGIES[topic.toLowerCase()];
    if (strategy?.chunkTypes.includes(result.chunkType)) {
      topicMatch = 1;
    }
  }

  // Combined relevance score
  const relevanceScore = result.similarity * 0.6 + keywordMatch * 0.25 + topicMatch * 0.15;

  return {
    ...result,
    relevanceScore,
    topicMatch,
    deduplicationKey: generateDeduplicationKey(result.chunkText),
  };
}

function applyTopicBoost(results: EnhancedSearchResult[], topic: string): EnhancedSearchResult[] {
  const strategy = TOPIC_STRATEGIES[topic.toLowerCase()];
  if (!strategy) return results;

  return results.map((result) => {
    if (result.chunkType && strategy.chunkTypes.includes(result.chunkType)) {
      return {
        ...result,
        relevanceScore: result.relevanceScore * strategy.boost,
      };
    }
    return result;
  });
}

function rerank(results: EnhancedSearchResult[], query: string): EnhancedSearchResult[] {
  const queryLower = query.toLowerCase();

  return results.map((result) => {
    let boost = 1;

    // Boost exact phrase matches
    if (result.chunkText.toLowerCase().includes(queryLower)) {
      boost *= 1.3;
    }

    // Boost shorter, more focused chunks
    const chunkLength = result.chunkText.length;
    if (chunkLength < 500) {
      boost *= 1.1;
    } else if (chunkLength > 2000) {
      boost *= 0.9;
    }

    // Boost chunks with higher keyword density
    const keywordDensity = result.keywords.length / Math.max(chunkLength / 100, 1);
    boost *= 1 + Math.min(keywordDensity * 0.1, 0.2);

    return {
      ...result,
      relevanceScore: result.relevanceScore * boost,
    };
  });
}

function deduplicate(results: EnhancedSearchResult[], threshold: number): EnhancedSearchResult[] {
  const seen = new Set<string>();
  const deduplicated: EnhancedSearchResult[] = [];

  for (const result of results) {
    // Check for exact duplicates
    if (seen.has(result.deduplicationKey)) {
      continue;
    }

    // Check for near-duplicates using simple text similarity
    let isDuplicate = false;
    for (const existing of deduplicated) {
      if (textSimilarity(result.chunkText, existing.chunkText) > threshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(result.deduplicationKey);
      deduplicated.push(result);
    }
  }

  return deduplicated;
}

function generateDeduplicationKey(text: string): string {
  // Create a simple hash from first 100 chars
  const normalized = text.toLowerCase().replace(/\s+/g, " ").substring(0, 100);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}

function textSimilarity(a: string, b: string): number {
  // Simple Jaccard similarity on word sets
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / Math.max(union.size, 1);
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
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
    "must",
    "can",
    "of",
    "in",
    "to",
    "for",
    "with",
    "on",
    "at",
    "by",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "and",
    "but",
    "or",
    "nor",
    "so",
    "yet",
    "both",
    "either",
    "neither",
    "not",
    "only",
    "own",
    "same",
    "than",
    "too",
    "very",
    "just",
    "also",
    "now",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "every",
    "both",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "what",
    "which",
    "who",
    "whom",
    "this",
    "that",
    "these",
    "those",
    "i",
    "me",
    "my",
    "we",
    "our",
    "you",
    "your",
    "he",
    "him",
    "his",
    "she",
    "her",
    "it",
    "its",
    "they",
    "them",
    "their",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function formatChunk(result: EnhancedSearchResult): string {
  const typeLabel = result.chunkType ? `[${result.chunkType.toUpperCase()}]` : "";
  return `${typeLabel}\n${result.chunkText}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function generateCacheKey(
  projectId: string,
  query: string,
  options: MultiStageRetrievalOptions
): string {
  const queryHash = query.substring(0, 50).replace(/\s+/g, "-");
  const optionsHash = JSON.stringify({
    t: options.topic,
    c: options.preferredChunkTypes,
    r: options.enableReranking,
  }).substring(0, 50);

  return `${projectId}:${queryHash}:${optionsHash}`;
}

/**
 * Clear the retrieval cache
 */
export function clearRetrievalCache(): void {
  retrievalCache.clear();
}

/**
 * Get cache statistics
 */
export function getRetrievalCacheStats(): { size: number; max: number } {
  return {
    size: retrievalCache.size,
    max: 200,
  };
}
