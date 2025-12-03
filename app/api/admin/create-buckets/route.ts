// Create storage buckets
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create documents bucket
    const { data: docsBucket, error: docsError } = await supabase.storage.createBucket(
      "documents",
      {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      }
    );

    // Create assets bucket
    const { data: assetsBucket, error: assetsError } = await supabase.storage.createBucket(
      "assets",
      {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      }
    );

    return NextResponse.json({
      success: true,
      documents: docsError ? { error: docsError.message } : { created: true },
      assets: assetsError ? { error: assetsError.message } : { created: true },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create buckets" },
      { status: 500 }
    );
  }
}
