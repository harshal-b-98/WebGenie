import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { siteParamsSchema, validateParams } from "@/lib/validation";
import * as deploymentService from "@/lib/services/deployment-service";
import {
  VercelClient,
  prepareDeploymentFiles,
  generateProjectName,
  mapVercelStateToStatus,
  VercelApiError,
} from "@/lib/services/vercel-api";

/**
 * POST /api/sites/[siteId]/deploy
 * Trigger a deployment of the site to Vercel
 */
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const rawParams = await params;

    // Validate route parameters
    const validation = validateParams(rawParams, siteParamsSchema);
    if (validation.error) return validation.error;
    const { siteId } = validation.data;

    const supabase = await createClient();

    // Get site with current version
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select(
        `
        id,
        title,
        description,
        user_id,
        current_version_id,
        vercel_project_id,
        vercel_project_name,
        site_versions!sites_current_version_id_fkey (
          id,
          version_number,
          html_content,
          css_content,
          js_content
        )
      `
      )
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    // Type the site data
    const siteData = site as {
      id: string;
      title: string;
      description: string | null;
      user_id: string;
      current_version_id: string | null;
      vercel_project_id: string | null;
      vercel_project_name: string | null;
      site_versions: {
        id: string;
        version_number: number;
        html_content: string;
        css_content: string | null;
        js_content: string | null;
      } | null;
    };

    if (!siteData.site_versions) {
      return NextResponse.json(
        { error: { message: "Site has no generated content to deploy" } },
        { status: 400 }
      );
    }

    // Get user's Vercel connection
    const vercelConnection = await deploymentService.getVercelConnection(user.id);

    if (!vercelConnection) {
      return NextResponse.json(
        {
          error: {
            message: "Vercel account not connected. Please connect your Vercel account first.",
          },
        },
        { status: 400 }
      );
    }

    // Create Vercel client
    const vercel = new VercelClient(
      vercelConnection.access_token,
      vercelConnection.vercel_team_id || undefined
    );

    // Create deployment record
    const deployment = await deploymentService.createDeployment({
      siteId,
      userId: user.id,
      versionId: siteData.current_version_id || undefined,
      vercelProjectId: siteData.vercel_project_id || undefined,
      vercelTeamId: vercelConnection.vercel_team_id || undefined,
    });

    try {
      // Prepare files for deployment
      const files = prepareDeploymentFiles(
        siteData.site_versions.html_content,
        siteData.site_versions.css_content || undefined,
        siteData.site_versions.js_content || undefined
      );

      // Generate project name if not exists
      const projectName =
        siteData.vercel_project_name || generateProjectName(siteData.title, siteId);

      // Create deployment on Vercel
      const vercelDeployment = await vercel.createDeployment({
        projectId: siteData.vercel_project_id || undefined,
        projectName,
        files,
        target: "production",
        meta: {
          siteId,
          versionNumber: String(siteData.site_versions.version_number),
          deployedBy: user.id,
        },
      });

      // Update deployment with Vercel info
      await deploymentService.markDeploymentBuilding(
        deployment.id,
        vercelDeployment.uid,
        `https://${vercelDeployment.url}`
      );

      logger.info("Deployment started", {
        deploymentId: deployment.id,
        vercelDeploymentId: vercelDeployment.uid,
        url: vercelDeployment.url,
      });

      // Poll for deployment completion in background
      pollDeploymentStatus(
        vercel,
        vercelDeployment.uid,
        deployment.id,
        siteId,
        projectName,
        vercelDeployment.name
      );

      return NextResponse.json({
        deploymentId: deployment.id,
        vercelDeploymentId: vercelDeployment.uid,
        status: "building",
        previewUrl: `https://${vercelDeployment.url}`,
      });
    } catch (deployError) {
      // Mark deployment as failed
      const errorMessage = deployError instanceof Error ? deployError.message : "Unknown error";
      const errorCode = deployError instanceof VercelApiError ? deployError.code : undefined;

      await deploymentService.markDeploymentError(deployment.id, errorMessage, errorCode);

      throw deployError;
    }
  } catch (error) {
    logger.error("Failed to deploy site", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

/**
 * Background function to poll deployment status
 */
async function pollDeploymentStatus(
  vercel: VercelClient,
  vercelDeploymentId: string,
  deploymentId: string,
  siteId: string,
  projectName: string,
  vercelProjectId: string
): Promise<void> {
  try {
    const finalDeployment = await vercel.waitForDeployment(vercelDeploymentId, {
      timeout: 300000, // 5 minutes
      pollInterval: 3000,
      onStatusChange: async (state) => {
        const status = mapVercelStateToStatus(state);
        logger.debug("Deployment status changed", { deploymentId, state, status });
      },
    });

    if (finalDeployment.state === "READY") {
      // Get the production URL from aliases
      const productionUrl = finalDeployment.alias?.[0]
        ? `https://${finalDeployment.alias[0]}`
        : `https://${finalDeployment.url}`;

      // Mark deployment as ready
      await deploymentService.markDeploymentReady(
        deploymentId,
        productionUrl,
        `https://${finalDeployment.url}`
      );

      // Update site with deployment info
      await deploymentService.updateSiteDeploymentInfo(
        siteId,
        deploymentId,
        productionUrl,
        vercelProjectId,
        projectName
      );

      logger.info("Deployment completed", { deploymentId, productionUrl });
    } else {
      // Deployment failed or was canceled
      await deploymentService.markDeploymentError(
        deploymentId,
        `Deployment ${finalDeployment.state.toLowerCase()}`,
        finalDeployment.state
      );

      logger.error("Deployment failed", { deploymentId, state: finalDeployment.state });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await deploymentService.markDeploymentError(deploymentId, errorMessage);
    logger.error("Deployment polling failed", error, { deploymentId });
  }
}
