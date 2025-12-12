/**
 * Cache Types
 *
 * Type definitions for the caching system.
 */

/**
 * Time-to-live presets in seconds
 */
export const CacheTTL = {
  /** 30 seconds - for rapidly changing data */
  SHORT: 30,
  /** 5 minutes - default for most API responses */
  MEDIUM: 300,
  /** 1 hour - for semi-static data */
  LONG: 3600,
  /** 24 hours - for static data */
  DAY: 86400,
  /** 7 days - for rarely changing data */
  WEEK: 604800,
} as const;

export type CacheTTL = (typeof CacheTTL)[keyof typeof CacheTTL];

/**
 * Cache options for memory cache
 */
export interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Maximum number of items in cache */
  maxSize?: number;
}

/**
 * Cached item wrapper with metadata
 */
export interface CachedItem<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * Next.js cache configuration
 */
export interface NextCacheConfig {
  /** Cache tags for revalidation */
  tags?: string[];
  /** Revalidation time in seconds */
  revalidate?: number | false;
}
