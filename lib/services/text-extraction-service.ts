import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { logger } from "@/lib/utils/logger";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdf = pdfParse as unknown as (
      buffer: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const data = await pdf(buffer);
    logger.info("PDF text extracted", { pages: data.numpages, textLength: data.text.length });
    return data.text;
  } catch (error) {
    logger.error("Failed to extract text from PDF", error);
    throw new Error("Failed to extract text from PDF");
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
  switch (fileType.toLowerCase()) {
    case "pdf":
    case "application/pdf":
      return extractTextFromPDF(buffer);

    case "docx":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractTextFromDOCX(buffer);

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
