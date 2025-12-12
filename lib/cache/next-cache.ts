/**
 * Next.js Cache Utilities
 *
 * Wraps Next.js unstable_cache for server-side data caching.
 * Provides tag-based revalidation and consistent cache configuration.
 */

import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { CacheTTL, NextCacheConfig } from "./types";
import { logger } from "@/lib/utils/logger";

/**
 * Default cache configurations by data type
 */
export const cacheConfig = {
  /** Site data - medium cache, revalidate on changes */
  site: {
    revalidate: CacheTTL.MEDIUM,
    tags: (siteId: string) => [`site-${siteId}`],
  },

  /** Site settings - longer cache */
  siteSettings: {
    revalidate: CacheTTL.LONG,
    tags: (siteId: string) => [`site-${siteId}`, `site-settings-${siteId}`],
  },

  /** Content structure - long cache, rarely changes */
  contentStructure: {
    revalidate: CacheTTL.LONG,
    tags: (siteId: string) => [`site-${siteId}`, `site-content-${siteId}`],
  },

  /** Site pages - medium cache */
  sitePage: {
    revalidate: CacheTTL.MEDIUM,
    tags: (siteId: string, pageSlug?: string) => [
      `site-${siteId}`,
      `site-pages-${siteId}`,
      ...(pageSlug ? [`page-${siteId}-${pageSlug}`] : []),
    ],
  },

  /** Site versions - longer cache, versions are immutable */
  siteVersion: {
    revalidate: CacheTTL.DAY,
    tags: (siteId: string, versionId?: string) => [
      `site-${siteId}`,
      `site-versions-${siteId}`,
      ...(versionId ? [`version-${versionId}`] : []),
    ],
  },

  /** Documents - medium cache */
  document: {
    revalidate: CacheTTL.MEDIUM,
    tags: (documentId: string, siteId?: string) => [
      `document-${documentId}`,
      ...(siteId ? [`site-${siteId}`, `site-documents-${siteId}`] : []),
    ],
  },

  /** User data - short cache for freshness */
  user: {
    revalidate: CacheTTL.SHORT,
    tags: (userId: string) => [`user-${userId}`],
  },

  /** Workspace data - medium cache */
  workspace: {
    revalidate: CacheTTL.MEDIUM,
    tags: (workspaceId: string) => [`workspace-${workspaceId}`],
  },
} as const;

/**
 * Wrap a function with Next.js caching
 *
 * @example
 * const getCachedSite = withCache(
 *   async (siteId: string) => await db.sites.findUnique({ where: { id: siteId } }),
 *   ['site'],
 *   { revalidate: 300, tags: ['site-123'] }
 * );
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  config: NextCacheConfig = {}
): T {
  return unstable_cache(fn, keyParts, {
    revalidate: config.revalidate ?? CacheTTL.MEDIUM,
    tags: config.tags,
  }) as T;
}

/**
 * Revalidate cache by tags
 * Call this when data changes to invalidate related caches
 * Note: Next.js 16 requires a profile parameter for revalidateTag
 */
export async function revalidateCache(
  tags: string | string[],
  profile: string = "default"
): Promise<void> {
  const tagArray = Array.isArray(tags) ? tags : [tags];

  for (const tag of tagArray) {
    try {
      revalidateTag(tag, profile);
      logger.debug(`Revalidated cache tag: ${tag}`);
    } catch (error) {
      logger.error(`Failed to revalidate cache tag: ${tag}`, { error });
    }
  }
}

/**
 * Revalidate all caches for a site
 */
export async function revalidateSiteCache(siteId: string): Promise<void> {
  await revalidateCache([
    `site-${siteId}`,
    `site-settings-${siteId}`,
    `site-content-${siteId}`,
    `site-pages-${siteId}`,
    `site-versions-${siteId}`,
    `site-documents-${siteId}`,
  ]);
}

/**
 * Revalidate all caches for a document
 */
export async function revalidateDocumentCache(documentId: string, siteId?: string): Promise<void> {
  const tags = [`document-${documentId}`];
  if (siteId) {
    tags.push(`site-documents-${siteId}`);
  }
  await revalidateCache(tags);
}

/**
 * Revalidate all caches for a user
 */
export async function revalidateUserCache(userId: string): Promise<void> {
  await revalidateCache(`user-${userId}`);
}

/**
 * Create a cached database query function
 *
 * @example
 * const getSiteById = createCachedQuery(
 *   'getSiteById',
 *   async (siteId: string) => {
 *     return await supabase.from('sites').select('*').eq('id', siteId).single();
 *   },
 *   (siteId) => cacheConfig.site.tags(siteId),
 *   cacheConfig.site.revalidate
 * );
 */
export function createCachedQuery<TArgs extends unknown[], TResult>(
  name: string,
  queryFn: (...args: TArgs) => Promise<TResult>,
  tagsFn: (...args: TArgs) => string[],
  revalidate: number = CacheTTL.MEDIUM
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const tags = tagsFn(...args);
    const cachedFn = unstable_cache(queryFn, [name, ...args.map(String)], {
      revalidate,
      tags,
    });
    return cachedFn(...args);
  };
}
