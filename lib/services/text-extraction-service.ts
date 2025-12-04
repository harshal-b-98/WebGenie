import mammoth from "mammoth";
import { logger } from "@/lib/utils/logger";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let tempPath: string | null = null;

  try {
    // PDFLoader needs a file path, so create a temp file
    tempPath = join(tmpdir(), `pdf-${Date.now()}.pdf`);
    writeFileSync(tempPath, buffer);

    // Use LangChain's PDFLoader - much more reliable
    const loader = new PDFLoader(tempPath);
    const docs = await loader.load();

    // Combine all pages
    const text = docs.map((doc) => doc.pageContent).join("\n\n");

    logger.info("PDF text extracted via LangChain", {
      pages: docs.length,
      textLength: text.length,
    });

    return text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    logger.error("Failed to extract text from PDF", error);
    return "";
  } finally {
    // Clean up temp file
    if (tempPath) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    logger.info("DOCX text extracted", { textLength: result.value.length });
    return result.value;
  } catch (error) {
    logger.error("Failed to extract text from DOCX", error);
    return "";
  }
}

export async function extractTextFromTXT(buffer: Buffer): Promise<string> {
  try {
    const text = buffer.toString("utf-8");
    logger.info("TXT file read", { textLength: text.length });
    return text;
  } catch (error) {
    logger.error("Failed to read TXT file", error);
    return "";
  }
}

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  const type = fileType.toLowerCase();

  if (type === "pdf" || type === "application/pdf") {
    return extractTextFromPDF(buffer);
  }

  if (
    type === "docx" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractTextFromDOCX(buffer);
  }

  if (type === "txt" || type === "text/plain") {
    return extractTextFromTXT(buffer);
  }

  // Unknown type - try as text
  logger.warn("Unknown file type, treating as text", { fileType });
  return extractTextFromTXT(buffer);
}
