/**
 * GET /api/sites/[siteId]/stats
 *
 * Get generation statistics for a site.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteGenerationStats } from "@/lib/services/generation-stats";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;

    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, user_id")
      .eq("id", siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    if (site.user_id !== user.id) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 403 });
    }

    // Get generation stats
    const stats = await getSiteGenerationStats(siteId);

    if (!stats) {
      return NextResponse.json({ error: { message: "Failed to fetch stats" } }, { status: 500 });
    }

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching generation stats:", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
