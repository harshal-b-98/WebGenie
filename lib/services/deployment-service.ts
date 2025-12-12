// Deployment Service
// Handles website deployments to Vercel and other providers

import { createClient } from "@/lib/db/server";
import { Database } from "@/lib/db/types";
import { DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type Deployment = Database["public"]["Tables"]["deployments"]["Row"];
type DeploymentInsert = Database["public"]["Tables"]["deployments"]["Insert"];
type DeploymentUpdate = Database["public"]["Tables"]["deployments"]["Update"];
type CustomDomain = Database["public"]["Tables"]["custom_domains"]["Row"];
type VercelConnection = Database["public"]["Tables"]["vercel_connections"]["Row"];

export type DeploymentStatus = "pending" | "building" | "ready" | "error" | "canceled";

export interface CreateDeploymentParams {
  siteId: string;
  userId: string;
  versionId?: string;
  provider?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
}

export interface DeploymentWithVersion extends Deployment {
  version_number?: number;
}

/**
 * Create a new deployment record
 */
export async function createDeployment(params: CreateDeploymentParams): Promise<Deployment> {
  const supabase = await createClient();

  const deploymentData: DeploymentInsert = {
    site_id: params.siteId,
    user_id: params.userId,
    version_id: params.versionId || null,
    provider: params.provider || "vercel",
    status: "pending",
    vercel_project_id: params.vercelProjectId || null,
    vercel_team_id: params.vercelTeamId || null,
  };

  const { data, error } = await supabase
    .from("deployments")
    .insert(deploymentData as never)
    .select()
    .single();

  if (error) {
    logger.error("Failed to create deployment", error, { siteId: params.siteId });
    throw new DatabaseError("Failed to create deployment");
  }

  logger.info("Deployment created", {
    deploymentId: (data as Deployment).id,
    siteId: params.siteId,
  });
  return data as Deployment;
}

/**
 * Update deployment status and related fields
 */
export async function updateDeployment(
  deploymentId: string,
  updates: DeploymentUpdate
): Promise<Deployment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deployments")
    .update(updates as never)
    .eq("id", deploymentId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update deployment", error, { deploymentId });
    throw new DatabaseError("Failed to update deployment");
  }

  logger.info("Deployment updated", { deploymentId, status: updates.status });
  return data as Deployment;
}

/**
 * Update deployment to building status
 */
export async function markDeploymentBuilding(
  deploymentId: string,
  vercelDeploymentId: string,
  deploymentUrl?: string
): Promise<Deployment> {
  return updateDeployment(deploymentId, {
    status: "building",
    vercel_deployment_id: vercelDeploymentId,
    deployment_url: deploymentUrl || null,
    build_started_at: new Date().toISOString(),
  });
}

/**
 * Update deployment to ready status
 */
export async function markDeploymentReady(
  deploymentId: string,
  productionUrl: string,
  previewUrl?: string
): Promise<Deployment> {
  const buildCompletedAt = new Date().toISOString();

  // Get deployment to calculate build duration
  const supabase = await createClient();
  const { data: deployment } = await supabase
    .from("deployments")
    .select("build_started_at")
    .eq("id", deploymentId)
    .single();

  let buildDurationMs: number | null = null;
  const deploymentData = deployment as { build_started_at: string | null } | null;
  if (deploymentData?.build_started_at) {
    const startTime = new Date(deploymentData.build_started_at).getTime();
    buildDurationMs = Date.now() - startTime;
  }

  return updateDeployment(deploymentId, {
    status: "ready",
    production_url: productionUrl,
    preview_url: previewUrl || null,
    build_completed_at: buildCompletedAt,
    build_duration_ms: buildDurationMs,
  });
}

/**
 * Update deployment to error status
 */
export async function markDeploymentError(
  deploymentId: string,
  errorMessage: string,
  errorCode?: string
): Promise<Deployment> {
  return updateDeployment(deploymentId, {
    status: "error",
    error_message: errorMessage,
    error_code: errorCode || null,
    build_completed_at: new Date().toISOString(),
  });
}

/**
 * Cancel a deployment
 */
export async function cancelDeployment(deploymentId: string): Promise<Deployment> {
  return updateDeployment(deploymentId, {
    status: "canceled",
    build_completed_at: new Date().toISOString(),
  });
}

/**
 * Get deployment by ID
 */
export async function getDeployment(deploymentId: string): Promise<Deployment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deployments")
    .select("*")
    .eq("id", deploymentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Failed to get deployment", error, { deploymentId });
    throw new DatabaseError("Failed to get deployment");
  }

  return data as Deployment;
}

/**
 * Get latest deployment for a site
 */
export async function getLatestDeployment(siteId: string): Promise<Deployment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deployments")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Failed to get latest deployment", error, { siteId });
    throw new DatabaseError("Failed to get latest deployment");
  }

  return data as Deployment;
}

/**
 * Get deployment history for a site
 */
export async function getDeploymentHistory(
  siteId: string,
  limit: number = 10
): Promise<DeploymentWithVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deployments")
    .select(
      `
      *,
      site_versions!left(version_number)
    `
    )
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to get deployment history", error, { siteId });
    throw new DatabaseError("Failed to get deployment history");
  }

  // Transform to include version_number at top level
  return (data as Array<Deployment & { site_versions: { version_number: number } | null }>).map(
    (d) => ({
      ...d,
      version_number: d.site_versions?.version_number,
    })
  );
}

/**
 * Update site with deployment info after successful deployment
 */
export async function updateSiteDeploymentInfo(
  siteId: string,
  deploymentId: string,
  productionUrl: string,
  vercelProjectId?: string,
  vercelProjectName?: string
): Promise<void> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    last_deployment_id: deploymentId,
    last_deployed_at: new Date().toISOString(),
    production_url: productionUrl,
    status: "published",
  };

  if (vercelProjectId) {
    updateData.vercel_project_id = vercelProjectId;
  }
  if (vercelProjectName) {
    updateData.vercel_project_name = vercelProjectName;
  }

  const { error } = await supabase
    .from("sites")
    .update(updateData as never)
    .eq("id", siteId);

  if (error) {
    logger.error("Failed to update site deployment info", error, { siteId, deploymentId });
    throw new DatabaseError("Failed to update site deployment info");
  }

  logger.info("Site deployment info updated", { siteId, deploymentId, productionUrl });
}

// ============================================
// Vercel Connection Management
// ============================================

/**
 * Get user's Vercel connection
 */
export async function getVercelConnection(userId: string): Promise<VercelConnection | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vercel_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    logger.error("Failed to get Vercel connection", error, { userId });
    throw new DatabaseError("Failed to get Vercel connection");
  }

  return data as VercelConnection;
}

/**
 * Save or update Vercel connection
 */
export async function saveVercelConnection(
  userId: string,
  connectionData: {
    accessToken: string;
    tokenType?: string;
    scope?: string;
    vercelUserId?: string;
    vercelTeamId?: string;
    vercelTeamSlug?: string;
    email?: string;
    username?: string;
    expiresAt?: Date;
    refreshToken?: string;
  }
): Promise<VercelConnection> {
  const supabase = await createClient();

  const insertData = {
    user_id: userId,
    access_token: connectionData.accessToken,
    token_type: connectionData.tokenType || "Bearer",
    scope: connectionData.scope || null,
    vercel_user_id: connectionData.vercelUserId || null,
    vercel_team_id: connectionData.vercelTeamId || null,
    vercel_team_slug: connectionData.vercelTeamSlug || null,
    email: connectionData.email || null,
    username: connectionData.username || null,
    expires_at: connectionData.expiresAt?.toISOString() || null,
    refresh_token: connectionData.refreshToken || null,
    is_active: true,
  };

  // Upsert - update if exists, insert if not
  const { data, error } = await supabase
    .from("vercel_connections")
    .upsert(insertData as never, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    logger.error("Failed to save Vercel connection", error, { userId });
    throw new DatabaseError("Failed to save Vercel connection");
  }

  logger.info("Vercel connection saved", { userId });
  return data as VercelConnection;
}

/**
 * Delete Vercel connection
 */
export async function deleteVercelConnection(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("vercel_connections").delete().eq("user_id", userId);

  if (error) {
    logger.error("Failed to delete Vercel connection", error, { userId });
    throw new DatabaseError("Failed to delete Vercel connection");
  }

  logger.info("Vercel connection deleted", { userId });
}

// ============================================
// Custom Domain Management
// ============================================

/**
 * Get custom domains for a site
 */
export async function getCustomDomains(siteId: string): Promise<CustomDomain[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("custom_domains")
    .select("*")
    .eq("site_id", siteId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Failed to get custom domains", error, { siteId });
    throw new DatabaseError("Failed to get custom domains");
  }

  return data as CustomDomain[];
}

/**
 * Add a custom domain
 */
export async function addCustomDomain(
  siteId: string,
  userId: string,
  domain: string,
  subdomain?: string
): Promise<CustomDomain> {
  const supabase = await createClient();

  // Check if this is the first domain (make it primary)
  const { count } = await supabase
    .from("custom_domains")
    .select("*", { count: "exact", head: true })
    .eq("site_id", siteId);

  const { data, error } = await supabase
    .from("custom_domains")
    .insert({
      site_id: siteId,
      user_id: userId,
      domain,
      subdomain: subdomain || null,
      is_primary: count === 0,
      status: "pending",
    } as never)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new DatabaseError("Domain already exists");
    }
    logger.error("Failed to add custom domain", error, { siteId, domain });
    throw new DatabaseError("Failed to add custom domain");
  }

  logger.info("Custom domain added", { siteId, domain });
  return data as CustomDomain;
}

/**
 * Update custom domain status
 */
export async function updateCustomDomainStatus(
  domainId: string,
  status: CustomDomain["status"],
  errorMessage?: string
): Promise<CustomDomain> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "active") {
    updateData.verified_at = new Date().toISOString();
  }
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { data, error } = await supabase
    .from("custom_domains")
    .update(updateData as never)
    .eq("id", domainId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update custom domain status", error, { domainId });
    throw new DatabaseError("Failed to update custom domain status");
  }

  return data as CustomDomain;
}

/**
 * Delete a custom domain
 */
export async function deleteCustomDomain(domainId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("custom_domains").delete().eq("id", domainId);

  if (error) {
    logger.error("Failed to delete custom domain", error, { domainId });
    throw new DatabaseError("Failed to delete custom domain");
  }

  logger.info("Custom domain deleted", { domainId });
}

/**
 * Set primary domain for a site
 */
export async function setPrimaryDomain(siteId: string, domainId: string): Promise<void> {
  const supabase = await createClient();

  // First, unset all primary flags for this site
  await supabase
    .from("custom_domains")
    .update({ is_primary: false } as never)
    .eq("site_id", siteId);

  // Then set the new primary
  const { error } = await supabase
    .from("custom_domains")
    .update({ is_primary: true } as never)
    .eq("id", domainId);

  if (error) {
    logger.error("Failed to set primary domain", error, { siteId, domainId });
    throw new DatabaseError("Failed to set primary domain");
  }

  logger.info("Primary domain set", { siteId, domainId });
}
