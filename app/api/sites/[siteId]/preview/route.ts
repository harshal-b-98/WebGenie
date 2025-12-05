import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

    // Get version ID from query params (optional)
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("version");

    const supabase = await createClient();

    // If specific version requested, load that version
    if (versionId) {
      // Verify user owns the site for this version
      const { data: version } = await supabase
        .from("site_versions")
        .select("html_content, site_id")
        .eq("id", versionId)
        .single();

      if (!version) {
        return NextResponse.json({ htmlContent: null });
      }

      const versionData = version as { html_content?: string; site_id: string };

      // Verify site ownership
      const { data: site } = await supabase
        .from("sites")
        .select("id")
        .eq("id", versionData.site_id)
        .eq("user_id", user.id)
        .single();

      if (!site) {
        return NextResponse.json({ htmlContent: null }, { status: 403 });
      }

      return NextResponse.json({
        htmlContent: versionData?.html_content || null,
      });
    }

    // Otherwise, load current version
    const { data: site } = await supabase
      .from("sites")
      .select("current_version_id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ htmlContent: null });
    }

    const siteData = site as { current_version_id?: string | null };

    if (!siteData.current_version_id) {
      return NextResponse.json({ htmlContent: null });
    }

    // Get version content
    const { data: version } = await supabase
      .from("site_versions")
      .select("html_content")
      .eq("id", siteData.current_version_id)
      .single();

    const versionData = version as { html_content?: string } | null;

    return NextResponse.json({
      htmlContent: versionData?.html_content || null,
    });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
