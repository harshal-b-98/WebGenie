import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { logger } from "@/lib/utils/logger";
import * as deploymentService from "@/lib/services/deployment-service";
import { VercelClient } from "@/lib/services/vercel-api";

const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  team_id?: string;
}

/**
 * GET /api/auth/vercel/callback
 * Handle Vercel OAuth callback - exchange code for tokens
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      logger.error("Vercel OAuth error", { error, errorDescription });
      const errorUrl = new URL("/dashboard/settings", APP_URL);
      errorUrl.searchParams.set("vercel_error", errorDescription || error);
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!code) {
      const errorUrl = new URL("/dashboard/settings", APP_URL);
      errorUrl.searchParams.set("vercel_error", "No authorization code received");
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!VERCEL_CLIENT_ID || !VERCEL_CLIENT_SECRET) {
      const errorUrl = new URL("/dashboard/settings", APP_URL);
      errorUrl.searchParams.set("vercel_error", "Vercel OAuth not configured");
      return NextResponse.redirect(errorUrl.toString());
    }

    // Exchange code for access token
    const redirectUri = `${APP_URL}/api/auth/vercel/callback`;

    const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: VERCEL_CLIENT_ID,
        client_secret: VERCEL_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      logger.error("Failed to exchange Vercel token", {
        status: tokenResponse.status,
        error: errorData,
      });
      const errorUrl = new URL("/dashboard/settings", APP_URL);
      errorUrl.searchParams.set("vercel_error", "Failed to connect to Vercel");
      return NextResponse.redirect(errorUrl.toString());
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    // Get user info from Vercel
    const vercel = new VercelClient(tokenData.access_token, tokenData.team_id);
    const vercelUser = await vercel.getUser();

    // Get teams if available
    let teams: { id: string; slug: string; name: string }[] = [];
    try {
      teams = await vercel.listTeams();
    } catch {
      // Teams may not be accessible, that's okay
    }

    // Save connection to database
    await deploymentService.saveVercelConnection(user.id, {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      vercelUserId: vercelUser.id,
      vercelTeamId: tokenData.team_id,
      vercelTeamSlug: teams.find((t) => t.id === tokenData.team_id)?.slug,
      email: vercelUser.email,
      username: vercelUser.username,
    });

    logger.info("Vercel account connected", {
      userId: user.id,
      vercelUserId: vercelUser.id,
      username: vercelUser.username,
    });

    // Redirect to settings with success
    const successUrl = new URL("/dashboard/settings", APP_URL);
    successUrl.searchParams.set("vercel_connected", "true");
    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error("Vercel OAuth callback failed", error);
    const errorUrl = new URL("/dashboard/settings", APP_URL);
    errorUrl.searchParams.set("vercel_error", "Failed to connect Vercel account");
    return NextResponse.redirect(errorUrl.toString());
  }
}
