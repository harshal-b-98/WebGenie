import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { siteParamsSchema, validateParams } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const rawParams = await params;

    // Validate route parameters
    const validation = validateParams(rawParams, siteParamsSchema);
    if (validation.error) return validation.error;
    const { siteId } = validation.data;

    const supabase = await createClient();

    // Get site details
    const { data: site } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
