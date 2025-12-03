import { createClient } from "@/lib/db/server";
import { Database } from "@/lib/db/types";
import { DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { extractText } from "./text-extraction-service";
import { generateText } from "ai";
import { defaultChatModel } from "@/lib/ai/client";

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
  const supabase = await createClient();

  try {
    // Update status to processing
    await supabase
      .from("documents")
      .update({ processing_status: "processing" } as never)
      .eq("id", documentId);

    // Get document
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error("Document not found");
    }

    const document = doc as Document;

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download file");
    }

    // Extract text
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extractedText = await extractText(buffer, document.file_type);

    // Generate AI summary
    console.log("Generating AI summary for document...");
    const { text: summary } = await generateText({
      model: defaultChatModel,
      prompt: `Summarize the following document in 2-3 sentences, focusing on key business information, target audience, and main value propositions:\n\n${extractedText.substring(0, 4000)}`,
    });
    console.log("AI summary generated:", summary.substring(0, 100));

    // Update document with extracted text and summary
    await supabase
      .from("documents")
      .update({
        extracted_text: extractedText,
        summary,
        processing_status: "completed",
      } as never)
      .eq("id", documentId);

    logger.info("Document processed successfully", {
      documentId,
      textLength: extractedText.length,
    });
  } catch (error) {
    logger.error("Failed to process document", error, { documentId });

    // Update status to failed
    await supabase
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
