import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

interface SiteOnboardingData {
  site_type: string | null;
  target_audience: string | null;
  main_goal: string | null;
  requirements: Record<string, unknown> | null;
}

/**
 * POST /api/sites/[siteId]/onboarding
 * Save onboarding metadata for a site
 */
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    await requireUser();
    const { siteId } = await params;
    const body = await request.json();

    const { websiteType, industry, targetAudience, mainGoal } = body;

    const supabase = await createClient();

    // Build requirements object with onboarding data
    const onboardingData = {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
      industry,
    };

    // Update site with onboarding metadata using existing columns
    const { error } = await supabase
      .from("sites")
      .update({
        site_type: websiteType,
        target_audience: targetAudience,
        main_goal: mainGoal,
        requirements: onboardingData,
      } as unknown as Record<string, unknown>)
      .eq("id", siteId);

    if (error) {
      logger.error("Failed to save onboarding data", error, { siteId });
      throw error;
    }

    logger.info("Onboarding data saved", { siteId, websiteType });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

/**
 * GET /api/sites/[siteId]/onboarding
 * Get onboarding status for a site
 */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    await requireUser();
    const { siteId } = await params;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sites")
      .select("site_type, target_audience, main_goal, requirements")
      .eq("id", siteId)
      .single();

    if (error) {
      throw error;
    }

    const siteData = data as unknown as SiteOnboardingData | null;
    const requirements = siteData?.requirements as {
      onboardingCompleted?: boolean;
      industry?: string;
    } | null;

    return NextResponse.json({
      completed: requirements?.onboardingCompleted ?? false,
      data: {
        websiteType: siteData?.site_type,
        targetAudience: siteData?.target_audience,
        mainGoal: siteData?.main_goal,
        industry: requirements?.industry,
      },
    });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
