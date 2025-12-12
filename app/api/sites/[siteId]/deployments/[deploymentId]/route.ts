import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { validateParams } from "@/lib/validation";
import * as deploymentService from "@/lib/services/deployment-service";

const paramsSchema = z.object({
  siteId: z.string().uuid("Invalid site ID"),
  deploymentId: z.string().uuid("Invalid deployment ID"),
});

/**
 * GET /api/sites/[siteId]/deployments/[deploymentId]
 * Get deployment status and details
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; deploymentId: string }> }
) {
  try {
    const user = await requireUser();
    const rawParams = await params;

    // Validate route parameters
    const validation = validateParams(rawParams, paramsSchema);
    if (validation.error) return validation.error;
    const { siteId, deploymentId } = validation.data;

    const supabase = await createClient();

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    // Get deployment
    const deployment = await deploymentService.getDeployment(deploymentId);

    if (!deployment || deployment.site_id !== siteId) {
      return NextResponse.json({ error: { message: "Deployment not found" } }, { status: 404 });
    }

    return NextResponse.json({
      id: deployment.id,
      status: deployment.status,
      provider: deployment.provider,
      deploymentUrl: deployment.deployment_url,
      productionUrl: deployment.production_url,
      previewUrl: deployment.preview_url,
      vercelDeploymentId: deployment.vercel_deployment_id,
      buildStartedAt: deployment.build_started_at,
      buildCompletedAt: deployment.build_completed_at,
      buildDurationMs: deployment.build_duration_ms,
      errorMessage: deployment.error_message,
      errorCode: deployment.error_code,
      createdAt: deployment.created_at,
      updatedAt: deployment.updated_at,
    });
  } catch (error) {
    logger.error("Failed to get deployment", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

/**
 * DELETE /api/sites/[siteId]/deployments/[deploymentId]
 * Cancel a deployment (if still in progress)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; deploymentId: string }> }
) {
  try {
    const user = await requireUser();
    const rawParams = await params;

    // Validate route parameters
    const validation = validateParams(rawParams, paramsSchema);
    if (validation.error) return validation.error;
    const { siteId, deploymentId } = validation.data;

    const supabase = await createClient();

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    // Get deployment
    const deployment = await deploymentService.getDeployment(deploymentId);

    if (!deployment || deployment.site_id !== siteId) {
      return NextResponse.json({ error: { message: "Deployment not found" } }, { status: 404 });
    }

    // Only cancel if still in progress
    if (deployment.status !== "pending" && deployment.status !== "building") {
      return NextResponse.json(
        { error: { message: "Deployment cannot be canceled - it has already completed" } },
        { status: 400 }
      );
    }

    // Cancel the deployment
    await deploymentService.cancelDeployment(deploymentId);

    // TODO: Also cancel on Vercel if we have the connection
    // This would require getting the Vercel connection and calling vercel.cancelDeployment()

    logger.info("Deployment canceled", { deploymentId });

    return NextResponse.json({ message: "Deployment canceled" });
  } catch (error) {
    logger.error("Failed to cancel deployment", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
