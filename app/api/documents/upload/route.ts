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
    const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Create document record
    const document = await documentService.createDocument(siteId, user.id, {
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: fileName,
    });

    // Process document asynchronously (extract text, generate summary)
    documentService.processDocument(document.id).catch((error) => {
      console.error("Failed to process document:", error);
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
