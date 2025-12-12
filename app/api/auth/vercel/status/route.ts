import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import * as deploymentService from "@/lib/services/deployment-service";

/**
 * GET /api/auth/vercel/status
 * Check if user has a Vercel connection and get connection details
 */
export async function GET() {
  try {
    const user = await requireUser();

    const connection = await deploymentService.getVercelConnection(user.id);

    if (!connection) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      email: connection.email,
      username: connection.username,
      teamId: connection.vercel_team_id,
      teamSlug: connection.vercel_team_slug,
      connectedAt: connection.created_at,
    });
  } catch (error) {
    logger.error("Failed to get Vercel connection status", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
