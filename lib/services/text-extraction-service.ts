import mammoth from "mammoth";
import { logger } from "@/lib/utils/logger";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse is tricky with ESM - use dynamic import and type assertion
    const pdfParse = await import("pdf-parse").then(
      (mod) =>
        (
          mod as unknown as {
            default: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
          }
        ).default
    );

    const data = await pdfParse(buffer);

    logger.info("PDF text extracted", {
      pages: data.numpages,
      textLength: data.text?.length || 0,
    });

    return data.text || "";
  } catch (error) {
    console.error("PDF extraction error:", error);
    logger.error("Failed to extract text from PDF", error);

    // Return empty string to allow upload to continue
    logger.warn("PDF text extraction failed, continuing with empty text");
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
