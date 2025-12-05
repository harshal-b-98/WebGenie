import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; versionId: string }> }
) {
  try {
    const user = await requireUser();
    const { siteId, versionId } = await params;

    const supabase = await createClient();

    // Verify site ownership
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Verify version belongs to this site
    const { data: version } = await supabase
      .from("site_versions")
      .select("id, site_id")
      .eq("id", versionId)
      .eq("site_id", siteId)
      .single();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Update site's current_version_id
    const { error: updateError } = await supabase
      .from("sites")
      .update({ current_version_id: versionId } as never)
      .eq("id", siteId);

    if (updateError) {
      throw updateError;
    }

    // Return success response
    return NextResponse.json({ success: true, versionId });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
