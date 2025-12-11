// API endpoint to reprocess document and generate embeddings for existing documents

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/db/server";
import * as embeddingService from "@/lib/services/embedding-service";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const user = await requireUser();
    const { documentId } = await params;
    const supabase = await createClient();

    // Verify user owns this document
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("*, site:sites!inner(*)")
      .eq("id", documentId)
      .eq("site.user_id", user.id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: { message: "Document not found or access denied" } },
        { status: 404 }
      );
    }

    const document = doc as {
      id: string;
      site_id: string;
      extracted_text: string;
      processing_status: string;
    };

    // Check if document has extracted text
    if (!document.extracted_text) {
      return NextResponse.json(
        { error: { message: "Document must be processed first (no extracted text)" } },
        { status: 400 }
      );
    }

    logger.info("Reprocessing document for embeddings", { documentId, userId: user.id });

    // Delete existing embeddings
    await embeddingService.deleteEmbeddings(documentId);

    // Generate new embeddings
    const chunks = await embeddingService.chunkDocument(
      document.extracted_text,
      documentId,
      document.site_id
    );

    const embeddings = await embeddingService.generateEmbeddings(chunks);

    await embeddingService.storeEmbeddings(document.site_id, documentId, chunks, embeddings);

    logger.info("Document reprocessed successfully", {
      documentId,
      chunkCount: chunks.length,
    });

    return NextResponse.json({
      success: true,
      chunkCount: chunks.length,
      message: `Generated ${chunks.length} embeddings`,
    });
  } catch (error) {
    logger.error("Failed to reprocess document", error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
