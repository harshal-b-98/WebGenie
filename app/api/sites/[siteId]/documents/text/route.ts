import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import * as embeddingService from "@/lib/services/embedding-service";

interface DocumentRecord {
  id: string;
  filename: string;
  file_size: number;
}

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

    // Create document record with type assertion
    const { data, error: insertError } = await supabase
      .from("documents")
      .insert({
        site_id: siteId,
        user_id: user.id,
        filename: filename,
        file_type: "text/plain",
        file_size: content.length,
        storage_path: storagePath,
        processing_status: "processing",
        extracted_text: content,
      } as never)
      .select("id, filename, file_size")
      .single();

    if (insertError) {
      logger.error("Failed to create document record", insertError, { siteId });
      throw insertError;
    }

    const document = data as unknown as DocumentRecord;

    // Process embeddings in background (don't await to avoid timeout)
    processEmbeddingsAsync(document.id, content, siteId).catch((err) => {
      logger.error("Background embedding processing failed", err, { documentId: document.id });
    });

    logger.info("Text document created", {
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
 * Process embeddings asynchronously
 */
async function processEmbeddingsAsync(
  documentId: string,
  content: string,
  siteId: string
): Promise<void> {
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Chunk the document
    const chunks = await embeddingService.chunkDocument(documentId, siteId, content);

    // Generate embeddings
    const embeddings = await embeddingService.generateEmbeddings(chunks);

    // Store embeddings
    await embeddingService.storeEmbeddings(siteId, documentId, chunks, embeddings);

    // Mark as completed
    await serviceSupabase
      .from("documents")
      .update({
        processing_status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    logger.info("Text document embedding processing completed", { documentId });
  } catch (error) {
    logger.error("Text document embedding processing failed", error, { documentId });

    // Mark as failed
    await serviceSupabase
      .from("documents")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", documentId);
  }
}
