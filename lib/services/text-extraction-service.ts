import mammoth from "mammoth";
import { logger } from "@/lib/utils/logger";

// pdf-parse needs special handling in Next.js
let pdfParse: ((buffer: Buffer) => Promise<{ text: string; numpages: number }>) | null = null;

async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import("pdf-parse")).default;
  }
  return pdfParse;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Try to load pdf-parse with better error handling
    let parse;
    try {
      const pdfModule = await import("pdf-parse");
      parse = pdfModule.default || pdfModule;
    } catch (importError) {
      console.error("Failed to import pdf-parse:", importError);
      throw new Error("PDF library not available");
    }

    const data = await parse(buffer);
    logger.info("PDF text extracted", { pages: data.numpages, textLength: data.text.length });
    return data.text || "";
  } catch (error) {
    console.error("PDF extraction error details:", error);
    logger.error("Failed to extract text from PDF", error);
    // Return empty string instead of throwing to allow upload to continue
    return "";
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    logger.info("DOCX text extracted", { textLength: result.value.length });
    return result.value;
  } catch (error) {
    logger.error("Failed to extract text from DOCX", error);
    throw new Error("Failed to extract text from DOCX");
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
    // Plain text - just convert buffer to string
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
