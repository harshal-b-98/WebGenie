import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

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

    // Get all versions for this site
    const { data: versions } = await supabase
      .from("site_versions")
      .select("*")
      .eq("site_id", siteId)
      .order("version_number", { ascending: false });

    return NextResponse.json(versions || []);
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
