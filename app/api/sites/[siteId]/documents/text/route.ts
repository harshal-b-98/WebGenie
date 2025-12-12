import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import * as embeddingService from "@/lib/services/embedding-service";
import * as contentDiscoveryService from "@/lib/services/content-discovery-service";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/sites/[siteId]/documents/text
 * Create a text-based document from direct content input
 */
export async function POST(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const user = await requireUser();
    const { siteId } = await params;
    const body = await request.json();

    const { content, title = "Business Information" } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: { message: "Content is required" } }, { status: 400 });
    }

    const supabase = await createClient();

    // Create text content as a blob and upload to storage
    const textBlob = new Blob([content], { type: "text/plain" });
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.txt`;
    const storagePath = `${siteId}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, textBlob, {
        contentType: "text/plain",
        upsert: false,
      });

    if (uploadError) {
      logger.error("Failed to upload text content", uploadError, { siteId });
      throw uploadError;
    }

    // Create document record
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        site_id: siteId,
        user_id: user.id,
        filename: filename,
        file_type: "text/plain",
        file_size: content.length,
        storage_path: storagePath,
        processing_status: "processing",
      } as never)
      .select()
      .single();

    if (insertError) {
      logger.error("Failed to create document record", insertError, { siteId });
      throw insertError;
    }

    // Process the document (extract content, create embeddings)
    await processTextDocument(document.id, content, siteId);

    logger.info("Text document created and processed", {
      documentId: document.id,
      siteId,
      contentLength: content.length,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        fileSize: document.file_size,
      },
    });
  } catch (error) {
    logger.error("Text document creation failed", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

/**
 * Process text document: extract content, classify, create embeddings
 */
async function processTextDocument(
  documentId: string,
  content: string,
  siteId: string
): Promise<void> {
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Update document with extracted text
    await serviceSupabase
      .from("documents")
      .update({
        extracted_text: content,
        processing_status: "processing",
      } as never)
      .eq("id", documentId);

    // Classify content
    const classifiedContent = await contentDiscoveryService.classifyContent(content);

    // Update document with classification
    await serviceSupabase
      .from("documents")
      .update({
        classification_data: classifiedContent,
      } as never)
      .eq("id", documentId);

    // Generate embeddings
    await embeddingService.processDocumentEmbeddings(
      documentId,
      siteId,
      content,
      classifiedContent
    );

    // Mark as completed
    await serviceSupabase
      .from("documents")
      .update({
        processing_status: "completed",
        processed_at: new Date().toISOString(),
      } as never)
      .eq("id", documentId);

    logger.info("Text document processing completed", { documentId });
  } catch (error) {
    logger.error("Text document processing failed", error, { documentId });

    // Mark as failed
    await serviceSupabase
      .from("documents")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message : "Unknown error",
      } as never)
      .eq("id", documentId);

    throw error;
  }
}
