import { createClient } from "@/lib/db/server";
import { Database } from "@/lib/db/types";
import { DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { extractText } from "./text-extraction-service";
import { generateText } from "ai";
import { defaultChatModel } from "@/lib/ai/client";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import * as embeddingService from "./embedding-service";
import * as contentDiscoveryService from "./content-discovery-service";

type Document = Database["public"]["Tables"]["documents"]["Row"];

export async function createDocument(
  siteId: string,
  userId: string,
  file: {
    filename: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
  }
): Promise<Document> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      site_id: siteId,
      user_id: userId,
      filename: file.filename,
      file_type: file.fileType,
      file_size: file.fileSize,
      storage_path: file.storagePath,
      processing_status: "pending",
    } as never)
    .select()
    .single();

  if (error) {
    logger.error("Failed to create document", error, { siteId, userId });
    throw new DatabaseError("Failed to create document");
  }

  logger.info("Document created", { documentId: (data as Document).id, filename: file.filename });
  return data as Document;
}

export async function processDocument(documentId: string): Promise<void> {
  // Use service role to bypass RLS policies
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Update status to processing
    await serviceSupabase
      .from("documents")
      .update({ processing_status: "processing" } as never)
      .eq("id", documentId);

    // Get document
    const { data: doc, error: fetchError } = await serviceSupabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error("Document not found");
    }

    const document = doc as Document;

    // Download file from storage
    const { data: fileData, error: downloadError } = await serviceSupabase.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download file");
    }

    // Extract text
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extractedText = await extractText(buffer, document.file_type);

    console.log("Text extracted, length:", extractedText.length);

    // Generate AI summary
    console.log("Generating AI summary for document...");
    const { text: summary } = await generateText({
      model: defaultChatModel,
      prompt: `Summarize the following document in 2-3 sentences, focusing on key business information, target audience, and main value propositions:\n\n${extractedText.substring(0, 4000)}`,
    });
    console.log("AI summary generated:", summary.substring(0, 100));

    // NEW: Generate and store embeddings for semantic search
    try {
      console.log("Generating embeddings for document...");
      const chunks = await embeddingService.chunkDocument(
        extractedText,
        documentId,
        document.site_id
      );
      console.log(`Document chunked into ${chunks.length} chunks`);

      const embeddings = await embeddingService.generateEmbeddings(chunks);
      console.log(`Generated ${embeddings.length} embeddings`);

      await embeddingService.storeEmbeddings(document.site_id, documentId, chunks, embeddings);
      console.log("Embeddings stored successfully");
    } catch (embeddingError) {
      // Log error but don't fail the whole process
      console.error("Failed to generate embeddings:", embeddingError);
      logger.error("Embedding generation failed", embeddingError, { documentId });
      // Continue with document processing even if embeddings fail
    }

    // Update document with extracted text and summary
    const { error: updateError } = await serviceSupabase
      .from("documents")
      .update({
        extracted_text: extractedText,
        summary,
        processing_status: "completed",
      } as never)
      .eq("id", documentId);

    if (updateError) {
      console.error("Failed to update document with extracted text:", updateError);
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    console.log("Document updated successfully with text length:", extractedText.length);

    // NEW: Trigger content discovery analysis (automatic)
    // This analyzes all documents for the site and discovers the optimal website structure
    try {
      console.log("Triggering content discovery analysis...");
      const contentStructure = await contentDiscoveryService.analyzeContentStructure(
        document.site_id
      );
      console.log("Content discovery completed:", {
        segments: contentStructure.segments.length,
        businessType: contentStructure.businessType,
        confidence: contentStructure.analysisConfidence,
      });
    } catch (contentError) {
      // Log error but don't fail the whole process
      console.error("Content discovery failed:", contentError);
      logger.error("Content discovery analysis failed", contentError, {
        documentId,
        siteId: document.site_id,
      });
      // Continue - content discovery is non-critical
    }

    logger.info("Document processed successfully", {
      documentId,
      textLength: extractedText.length,
    });
  } catch (error) {
    logger.error("Failed to process document", error, { documentId });

    // Update status to failed
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

export async function getDocumentsForSite(siteId: string): Promise<Document[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to get documents", error, { siteId });
    throw new DatabaseError("Failed to get documents");
  }

  return data;
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Get document to verify ownership and get storage path
  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !doc) {
    throw new Error("Document not found or access denied");
  }

  const document = doc as Document;

  // Delete from storage
  await supabase.storage.from("documents").remove([document.storage_path]);

  // Delete from database
  const { error } = await supabase.from("documents").delete().eq("id", documentId);

  if (error) {
    logger.error("Failed to delete document", error, { documentId });
    throw new DatabaseError("Failed to delete document");
  }

  logger.info("Document deleted", { documentId });
}
