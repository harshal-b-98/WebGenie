/**
 * Generation Statistics Service
 *
 * Tracks and retrieves generation performance metrics.
 */

import { createClient } from "@/lib/supabase/server";

export interface GenerationStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageTimeMs: number;
  fastestTimeMs: number | null;
  slowestTimeMs: number | null;
  successRate: number;
  lastGeneratedAt: string | null;
}

export interface SiteGenerationStats extends GenerationStats {
  siteId: string;
  siteName: string;
}

/**
 * Get generation statistics for a specific site
 */
export async function getSiteGenerationStats(siteId: string): Promise<GenerationStats | null> {
  const supabase = await createClient();

  // Get all versions for the site to calculate stats
  const { data: versions, error } = await supabase
    .from("website_versions")
    .select("id, created_at, generation_time_ms, status")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching generation stats:", error);
    return null;
  }

  if (!versions || versions.length === 0) {
    return {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageTimeMs: 0,
      fastestTimeMs: null,
      slowestTimeMs: null,
      successRate: 0,
      lastGeneratedAt: null,
    };
  }

  // Calculate statistics
  const successfulVersions = versions.filter(
    (v) => v.status === "active" || v.status === "current"
  );
  const failedVersions = versions.filter((v) => v.status === "failed");
  const generationTimes = versions
    .map((v) => v.generation_time_ms)
    .filter((t): t is number => t !== null && t > 0);

  const totalGenerations = versions.length;
  const successfulGenerations = successfulVersions.length;
  const failedGenerations = failedVersions.length;

  let averageTimeMs = 0;
  let fastestTimeMs: number | null = null;
  let slowestTimeMs: number | null = null;

  if (generationTimes.length > 0) {
    averageTimeMs = Math.round(generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length);
    fastestTimeMs = Math.min(...generationTimes);
    slowestTimeMs = Math.max(...generationTimes);
  }

  return {
    totalGenerations,
    successfulGenerations,
    failedGenerations,
    averageTimeMs,
    fastestTimeMs,
    slowestTimeMs,
    successRate:
      totalGenerations > 0 ? Math.round((successfulGenerations / totalGenerations) * 100) : 0,
    lastGeneratedAt: versions[0]?.created_at || null,
  };
}

/**
 * Get global generation statistics for a user
 */
export async function getUserGenerationStats(userId: string): Promise<GenerationStats | null> {
  const supabase = await createClient();

  // First get all sites for the user
  const { data: sites, error: sitesError } = await supabase
    .from("sites")
    .select("id")
    .eq("user_id", userId);

  if (sitesError) {
    console.error("Error fetching user sites:", sitesError);
    return null;
  }

  if (!sites || sites.length === 0) {
    return {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageTimeMs: 0,
      fastestTimeMs: null,
      slowestTimeMs: null,
      successRate: 0,
      lastGeneratedAt: null,
    };
  }

  const siteIds = sites.map((s) => s.id);

  // Get all versions for user's sites
  const { data: versions, error } = await supabase
    .from("website_versions")
    .select("id, created_at, generation_time_ms, status")
    .in("site_id", siteIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching generation stats:", error);
    return null;
  }

  if (!versions || versions.length === 0) {
    return {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageTimeMs: 0,
      fastestTimeMs: null,
      slowestTimeMs: null,
      successRate: 0,
      lastGeneratedAt: null,
    };
  }

  // Calculate statistics
  const successfulVersions = versions.filter(
    (v) => v.status === "active" || v.status === "current"
  );
  const failedVersions = versions.filter((v) => v.status === "failed");
  const generationTimes = versions
    .map((v) => v.generation_time_ms)
    .filter((t): t is number => t !== null && t > 0);

  const totalGenerations = versions.length;
  const successfulGenerations = successfulVersions.length;
  const failedGenerations = failedVersions.length;

  let averageTimeMs = 0;
  let fastestTimeMs: number | null = null;
  let slowestTimeMs: number | null = null;

  if (generationTimes.length > 0) {
    averageTimeMs = Math.round(generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length);
    fastestTimeMs = Math.min(...generationTimes);
    slowestTimeMs = Math.max(...generationTimes);
  }

  return {
    totalGenerations,
    successfulGenerations,
    failedGenerations,
    averageTimeMs,
    fastestTimeMs,
    slowestTimeMs,
    successRate:
      totalGenerations > 0 ? Math.round((successfulGenerations / totalGenerations) * 100) : 0,
    lastGeneratedAt: versions[0]?.created_at || null,
  };
}

/**
 * Format generation time for display
 */
export function formatGenerationTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
