import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/sites/[siteId]/onboarding
 * Save onboarding metadata for a site
 */
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    await requireUser();
    const { siteId } = await params;
    const body = await request.json();

    const { completed, websiteType, industry, targetAudience, mainGoal } = body;

    const supabase = await createClient();

    // Update site with onboarding metadata
    const { error } = await supabase
      .from("sites")
      .update({
        onboarding_completed: completed,
        onboarding_data: {
          websiteType,
          industry,
          targetAudience,
          mainGoal,
          completedAt: new Date().toISOString(),
        },
      } as never)
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
      .select("onboarding_completed, onboarding_data")
      .eq("id", siteId)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      completed: data?.onboarding_completed ?? false,
      data: data?.onboarding_data ?? null,
    });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
