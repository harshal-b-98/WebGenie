import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import * as documentService from "@/lib/services/document-service";
import { formatErrorResponse } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const siteId = formData.get("siteId") as string;

    if (!file) {
      return NextResponse.json({ error: { message: "No file provided" } }, { status: 400 });
    }

    if (!siteId) {
      return NextResponse.json({ error: { message: "No siteId provided" } }, { status: 400 });
    }

    // Verify user owns the site
    const supabase = await createClient();
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      console.error("Site verification failed:", siteError, { siteId, userId: user.id });
      return NextResponse.json(
        {
          error: {
            message: `Site not found or access denied. Error: ${siteError?.message || "not found"}`,
          },
        },
        { status: 403 }
      );
    }

    // Upload to Supabase Storage
    // Sanitize filename: replace spaces and special chars
    const sanitizedFileName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "")
      .toLowerCase();

    const fileName = `${siteId}/${Date.now()}-${sanitizedFileName}`;

    // Use service role client to bypass RLS for now
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");

    // Debug: Check if env vars are loaded
    console.log("Supabase URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Service key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("Service key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

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

    const { error: uploadError } = await serviceSupabase.storage
      .from("documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      console.error("Bucket:", "documents", "File:", fileName);
      throw uploadError;
    }

    // Create document record
    // Simplify file type to just extension
    const simpleType = file.name.endsWith(".pdf")
      ? "pdf"
      : file.name.endsWith(".docx")
        ? "docx"
        : file.type.substring(0, 50);

    const document = await documentService.createDocument(siteId, user.id, {
      filename: file.name,
      fileType: simpleType,
      fileSize: file.size,
      storagePath: fileName,
    });

    // Process document SYNCHRONOUSLY so it completes before returning
    try {
      await documentService.processDocument(document.id);
    } catch (error) {
      console.error("Failed to process document:", error);
      // Continue even if processing fails
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
