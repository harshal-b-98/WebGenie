import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { siteParamsSchema, validateParams } from "@/lib/validation";
import * as deploymentService from "@/lib/services/deployment-service";

/**
 * GET /api/sites/[siteId]/deployments
 * List deployment history for a site
 */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const rawParams = await params;

    // Validate route parameters
    const validation = validateParams(rawParams, siteParamsSchema);
    if (validation.error) return validation.error;
    const { siteId } = validation.data;

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

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

    // Get deployment history
    const deployments = await deploymentService.getDeploymentHistory(siteId, limit);

    return NextResponse.json({
      deployments: deployments.map((d) => ({
        id: d.id,
        status: d.status,
        versionNumber: d.version_number,
        deploymentUrl: d.deployment_url,
        productionUrl: d.production_url,
        previewUrl: d.preview_url,
        buildDurationMs: d.build_duration_ms,
        errorMessage: d.error_message,
        createdAt: d.created_at,
        buildCompletedAt: d.build_completed_at,
      })),
    });
  } catch (error) {
    logger.error("Failed to get deployments", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
