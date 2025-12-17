import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

// POST - Upload logo
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: { message: "No file provided" } }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { message: "Invalid file type. Only JPEG, PNG, SVG, and WebP are allowed." } },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: { message: "File too large. Maximum size is 5MB." } },
        { status: 400 }
      );
    }

    // Verify user owns the site
    const supabase = await createClient();
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, brand_assets")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: { message: "Site not found or access denied" } },
        { status: 404 }
      );
    }

    // Type the site data
    const siteData = site as { id: string; brand_assets: { logo?: { url?: string } } | null };

    // Use service role client for storage operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate filename
    const extension = file.name.split(".").pop() || "png";
    const fileName = `${siteId}/logo-${Date.now()}.${extension}`;

    // Delete old logo if exists
    const existingLogo = siteData.brand_assets?.logo?.url;
    if (existingLogo) {
      // Extract path from URL
      const urlParts = existingLogo.split("/site-logos/");
      if (urlParts[1]) {
        await serviceSupabase.storage.from("site-logos").remove([urlParts[1]]);
      }
    }

    // Upload new logo
    const { error: uploadError } = await serviceSupabase.storage
      .from("site-logos")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      logger.error("Logo upload failed", uploadError);
      return NextResponse.json(
        { error: { message: `Upload failed: ${uploadError.message}` } },
        { status: 500 }
      );
    }

    // Get public URL - always use production Supabase URL for logos (not localhost)
    // This ensures logos work in production deployments
    const productionSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost") ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")
        ? "https://cfhssgueszhoracjeyou.supabase.co"
        : process.env.NEXT_PUBLIC_SUPABASE_URL;

    const {
      data: { publicUrl: tempUrl },
    } = serviceSupabase.storage.from("site-logos").getPublicUrl(fileName);

    // Replace localhost URL with production URL
    const publicUrl = tempUrl.replace(
      /http:\/\/(127\.0\.0\.1|localhost):[0-9]+/,
      productionSupabaseUrl!
    );

    // Update site's brand_assets with new logo
    const currentBrandAssets = (siteData.brand_assets as Record<string, unknown>) || {};
    const updatedBrandAssets = {
      ...currentBrandAssets,
      logo: {
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from("sites")
      .update({ brand_assets: updatedBrandAssets } as never)
      .eq("id", siteId);

    if (updateError) {
      logger.error("Failed to update site with logo", updateError);
      throw updateError;
    }

    logger.info("Logo uploaded successfully", { siteId, fileName });

    return NextResponse.json({
      url: publicUrl,
      message: "Logo uploaded successfully",
    });
  } catch (error) {
    logger.error("Logo upload failed", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

// DELETE - Remove logo
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const user = await requireUser();
    const { siteId } = await params;

    const supabase = await createClient();

    // Verify user owns the site and get current logo
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, brand_assets")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: { message: "Site not found or access denied" } },
        { status: 404 }
      );
    }

    // Type the site data
    const siteDataDel = site as { id: string; brand_assets: { logo?: { url?: string } } | null };
    const existingLogo = siteDataDel.brand_assets?.logo?.url;

    if (existingLogo) {
      // Use service role client for storage operations
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Extract path and delete from storage
      const urlParts = existingLogo.split("/site-logos/");
      if (urlParts[1]) {
        await serviceSupabase.storage.from("site-logos").remove([urlParts[1]]);
      }
    }

    // Update site's brand_assets to remove logo
    const currentBrandAssets = (siteDataDel.brand_assets as Record<string, unknown>) || {};
    const { logo: _removedLogo, ...restBrandAssets } = currentBrandAssets;

    const { error: updateError } = await supabase
      .from("sites")
      .update({ brand_assets: restBrandAssets } as never)
      .eq("id", siteId);

    if (updateError) {
      logger.error("Failed to update site after logo removal", updateError);
      throw updateError;
    }

    logger.info("Logo removed successfully", { siteId });

    return NextResponse.json({ message: "Logo removed successfully" });
  } catch (error) {
    logger.error("Logo removal failed", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
