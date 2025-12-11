import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

    const supabase = await createClient();

    // Get site with settings fields
    const { data: site, error } = await supabase
      .from("sites")
      .select(
        "id, title, description, brand_assets, chat_widget_enabled, chat_widget_config, dynamic_pages_enabled, persona_detection_enabled, persona_detection_config"
      )
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (error || !site) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    return NextResponse.json(site);
  } catch (error) {
    logger.error("Failed to get site settings", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;
    const body = await request.json();

    const supabase = await createClient();

    // Verify site ownership first
    const { data: existingSite, error: fetchError } = await supabase
      .from("sites")
      .select("id, brand_assets")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingSite) {
      return NextResponse.json({ error: { message: "Site not found" } }, { status: 404 });
    }

    // Type the site data
    const siteData = existingSite as { id: string; brand_assets: object | null };

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.brand_assets !== undefined) {
      // Merge with existing brand assets to preserve logo info
      updateData.brand_assets = {
        ...(siteData.brand_assets || {}),
        ...body.brand_assets,
      };
    }

    if (body.chat_widget_enabled !== undefined) {
      updateData.chat_widget_enabled = body.chat_widget_enabled;
    }

    if (body.chat_widget_config !== undefined) {
      updateData.chat_widget_config = body.chat_widget_config;
    }

    if (body.dynamic_pages_enabled !== undefined) {
      updateData.dynamic_pages_enabled = body.dynamic_pages_enabled;
    }

    if (body.persona_detection_enabled !== undefined) {
      updateData.persona_detection_enabled = body.persona_detection_enabled;
    }

    if (body.persona_detection_config !== undefined) {
      updateData.persona_detection_config = body.persona_detection_config;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: { message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    // Update site
    const { data: updatedSite, error: updateError } = await supabase
      .from("sites")
      .update(updateData as never)
      .eq("id", siteId)
      .select(
        "id, title, description, brand_assets, chat_widget_enabled, chat_widget_config, dynamic_pages_enabled, persona_detection_enabled, persona_detection_config"
      )
      .single();

    if (updateError) {
      logger.error("Failed to update site settings", updateError);
      throw updateError;
    }

    logger.info("Site settings updated", { siteId });

    return NextResponse.json(updatedSite);
  } catch (error) {
    logger.error("Failed to update site settings", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
