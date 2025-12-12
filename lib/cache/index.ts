/**
 * Cache Library
 *
 * Provides caching utilities without requiring Redis.
 * Uses LRU cache for in-memory caching and Next.js unstable_cache for route caching.
 */

export { memoryCache, MemoryCache } from "./memory";
export { withCache, cacheConfig, revalidateCache } from "./next-cache";
export { generateCacheKey, CacheKeys, hashString, CacheTags } from "./keys";
export type { CacheOptions, CacheTTL } from "./types";
