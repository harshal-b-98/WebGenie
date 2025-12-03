import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

    const supabase = await createClient();

    // Get site with current version
    const { data: site } = await supabase
      .from("sites")
      .select("current_version_id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    const siteData = site as { current_version_id?: string | null };

    if (!site || !siteData.current_version_id) {
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
