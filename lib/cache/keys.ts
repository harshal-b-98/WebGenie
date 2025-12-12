/**
 * Cache Key Generation
 *
 * Consistent cache key generation for all cached data.
 * Keys are structured as: namespace:entity:id[:subkey]
 */

/**
 * Cache key namespaces for different data types
 */
export const CacheKeys = {
  // Site-related keys
  site: (siteId: string) => `site:${siteId}`,
  siteSettings: (siteId: string) => `site:${siteId}:settings`,
  siteContent: (siteId: string) => `site:${siteId}:content`,
  siteVersions: (siteId: string) => `site:${siteId}:versions`,
  siteVersion: (siteId: string, versionId: string) => `site:${siteId}:version:${versionId}`,

  // Document-related keys
  document: (documentId: string) => `doc:${documentId}`,
  documentEmbeddings: (documentId: string) => `doc:${documentId}:embeddings`,
  siteDocuments: (siteId: string) => `site:${siteId}:documents`,

  // Embedding search keys
  embeddingSearch: (siteId: string, queryHash: string) => `embed:${siteId}:search:${queryHash}`,

  // Content structure keys
  contentStructure: (siteId: string) => `content:${siteId}`,

  // Page-related keys
  sitePage: (siteId: string, pageSlug: string, persona?: string) =>
    `page:${siteId}:${pageSlug}${persona ? `:${persona}` : ""}`,
  sitePages: (siteId: string) => `site:${siteId}:pages`,

  // Rate limiting keys
  rateLimit: (identifier: string, endpoint: string) => `rate:${endpoint}:${identifier}`,

  // User/session keys
  userSites: (userId: string) => `user:${userId}:sites`,
  session: (sessionId: string) => `session:${sessionId}`,

  // Workspace keys
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  workspaceMembers: (workspaceId: string) => `workspace:${workspaceId}:members`,
} as const;

/**
 * Generate a hash from a string for cache keys
 * Uses a simple but fast hash function
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a cache key from arbitrary data
 */
export function generateCacheKey(
  namespace: string,
  ...parts: (string | number | boolean | undefined | null)[]
): string {
  const validParts = parts.filter((p) => p !== undefined && p !== null) as (
    | string
    | number
    | boolean
  )[];
  return `${namespace}:${validParts.join(":")}`;
}

/**
 * Generate a cache key for a query with parameters
 * Useful for caching search/filter results
 */
export function generateQueryCacheKey(namespace: string, params: Record<string, unknown>): string {
  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((key) => `${key}=${JSON.stringify(params[key])}`).join("&");
  return `${namespace}:${hashString(queryString)}`;
}

/**
 * Cache tag helpers for Next.js revalidation
 */
export const CacheTags = {
  site: (siteId: string) => `site-${siteId}`,
  siteContent: (siteId: string) => `site-content-${siteId}`,
  sitePages: (siteId: string) => `site-pages-${siteId}`,
  document: (documentId: string) => `document-${documentId}`,
  user: (userId: string) => `user-${userId}`,
  workspace: (workspaceId: string) => `workspace-${workspaceId}`,
} as const;
