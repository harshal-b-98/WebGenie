/**
 * In-Memory LRU Cache
 *
 * Provides fast in-memory caching using LRU (Least Recently Used) eviction.
 * Best for: Rate limiting, session data, hot API responses, computed values.
 *
 * Note: Cache is per-instance and resets on server restart.
 * For serverless, each instance has its own cache.
 */

import { LRUCache } from "lru-cache";
import { CacheTTL, CacheStats } from "./types";
import { logger } from "@/lib/utils/logger";

/**
 * Memory cache configuration
 */
interface MemoryCacheConfig {
  /** Maximum number of items */
  max: number;
  /** Default TTL in milliseconds */
  ttl: number;
  /** Whether to update age on get */
  updateAgeOnGet?: boolean;
  /** Whether to update age on has */
  updateAgeOnHas?: boolean;
}

/**
 * Default cache configurations for different use cases
 */
const CACHE_CONFIGS = {
  /** For rate limiting - small, short TTL */
  rateLimit: {
    max: 10000,
    ttl: 60 * 1000, // 1 minute
  },
  /** For API responses - medium size, medium TTL */
  api: {
    max: 1000,
    ttl: CacheTTL.MEDIUM * 1000, // 5 minutes
  },
  /** For embeddings/search results - larger, longer TTL */
  embeddings: {
    max: 500,
    ttl: CacheTTL.LONG * 1000, // 1 hour
  },
  /** For site data - medium size, longer TTL */
  sites: {
    max: 200,
    ttl: CacheTTL.MEDIUM * 1000, // 5 minutes
  },
  /** For content structure - small, long TTL */
  content: {
    max: 100,
    ttl: CacheTTL.LONG * 1000, // 1 hour
  },
} as const;

type CacheType = keyof typeof CACHE_CONFIGS;

/**
 * Generic memory cache class with statistics tracking
 */
export class MemoryCache<T extends NonNullable<unknown> = NonNullable<unknown>> {
  private cache: LRUCache<string, T>;
  private stats = { hits: 0, misses: 0 };
  private name: string;

  constructor(name: string, config: Partial<MemoryCacheConfig> = {}) {
    this.name = name;
    const defaultConfig = CACHE_CONFIGS.api;

    this.cache = new LRUCache<string, T>({
      max: config.max ?? defaultConfig.max,
      ttl: config.ttl ?? defaultConfig.ttl,
      updateAgeOnGet: config.updateAgeOnGet ?? true,
      updateAgeOnHas: config.updateAgeOnHas ?? false,
    });
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return undefined;
  }

  /**
   * Set a value in cache with optional custom TTL
   */
  set(key: string, value: T, ttlMs?: number): void {
    if (ttlMs !== undefined) {
      this.cache.set(key, value, { ttl: ttlMs });
    } else {
      this.cache.set(key, value);
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    logger.info(`Cache cleared: ${this.name}`);
  }

  /**
   * Delete all entries matching a prefix
   */
  deleteByPrefix(prefix: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      logger.debug(`Deleted ${deleted} cache entries with prefix: ${prefix}`);
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Get remaining TTL for a key in milliseconds
   */
  getRemainingTTL(key: string): number {
    return this.cache.getRemainingTTL(key);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValue = Record<string, any> | any[];

/**
 * Pre-configured cache instances for different use cases
 */
export const memoryCache = {
  /** Rate limiting cache - tracks request counts per IP/user */
  rateLimit: new MemoryCache<{ count: number }>("rateLimit", CACHE_CONFIGS.rateLimit),

  /** API response cache - caches expensive API responses */
  api: new MemoryCache<AnyValue>("api", CACHE_CONFIGS.api),

  /** Embeddings cache - caches vector search results */
  embeddings: new MemoryCache<AnyValue>("embeddings", CACHE_CONFIGS.embeddings),

  /** Sites cache - caches site data and settings */
  sites: new MemoryCache<AnyValue>("sites", CACHE_CONFIGS.sites),

  /** Content structure cache - caches AI-discovered content */
  content: new MemoryCache<AnyValue>("content", CACHE_CONFIGS.content),

  /**
   * Create a custom cache instance
   */
  create: <T extends NonNullable<unknown>>(name: string, config?: Partial<MemoryCacheConfig>) =>
    new MemoryCache<T>(name, config),

  /**
   * Get all cache statistics
   */
  getAllStats: () => ({
    rateLimit: memoryCache.rateLimit.getStats(),
    api: memoryCache.api.getStats(),
    embeddings: memoryCache.embeddings.getStats(),
    sites: memoryCache.sites.getStats(),
    content: memoryCache.content.getStats(),
  }),

  /**
   * Clear all caches
   */
  clearAll: () => {
    memoryCache.rateLimit.clear();
    memoryCache.api.clear();
    memoryCache.embeddings.clear();
    memoryCache.sites.clear();
    memoryCache.content.clear();
    logger.info("All memory caches cleared");
  },
};

/**
 * Decorator for caching function results
 * Usage: const cachedFn = withMemoryCache(myFn, 'myFn', cache.api)
 */
export function withMemoryCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyPrefix: string,
  cache: MemoryCache<Awaited<ReturnType<T>>>,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator
      ? `${keyPrefix}:${keyGenerator(...args)}`
      : `${keyPrefix}:${JSON.stringify(args)}`;

    return cache.getOrSet(key, () => fn(...args) as Promise<Awaited<ReturnType<T>>>);
  }) as T;
}
