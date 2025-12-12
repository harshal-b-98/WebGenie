import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import * as deploymentService from "@/lib/services/deployment-service";

const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/vercel
 * Initiate Vercel OAuth flow - redirects to Vercel authorization page
 */
export async function GET() {
  try {
    await requireUser();

    if (!VERCEL_CLIENT_ID) {
      return NextResponse.json(
        { error: { message: "Vercel OAuth not configured" } },
        { status: 500 }
      );
    }

    const redirectUri = `${APP_URL}/api/auth/vercel/callback`;
    const state = crypto.randomUUID(); // In production, store this in session for CSRF protection

    const authUrl = new URL("https://vercel.com/integrations/oauth/authorize");
    authUrl.searchParams.set("client_id", VERCEL_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    // Request necessary scopes
    authUrl.searchParams.set("scope", "user:read deployments:write projects:write domains:write");

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error("Failed to initiate Vercel OAuth", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

/**
 * DELETE /api/auth/vercel
 * Disconnect Vercel account
 */
export async function DELETE() {
  try {
    const user = await requireUser();

    await deploymentService.deleteVercelConnection(user.id);

    return NextResponse.json({ message: "Vercel account disconnected" });
  } catch (error) {
    logger.error("Failed to disconnect Vercel", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
