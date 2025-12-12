/**
 * Document Validation Schemas
 *
 * Validation schemas for document-related API routes including
 * upload, processing, and document management.
 */

import { z } from "zod";
import {
  siteIdSchema,
  documentIdSchema,
  allowedFileTypes,
  fileSizeSchema,
  documentStatusSchema,
} from "./common";

// Allowed file extensions mapped to MIME types
export const FILE_TYPE_MAP: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/x-markdown"],
};

// Get allowed extensions
export const ALLOWED_EXTENSIONS = Object.keys(FILE_TYPE_MAP);

// File metadata schema (extracted from FormData)
export const fileMetadataSchema = z.object({
  name: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename is too long")
    .refine(
      (name) => {
        const ext = name.split(".").pop()?.toLowerCase();
        return ext && ALLOWED_EXTENSIONS.includes(ext);
      },
      {
        message: `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      }
    ),
  size: fileSizeSchema,
  type: z
    .string()
    .refine((type) => allowedFileTypes.includes(type as (typeof allowedFileTypes)[number]), {
      message: `File type not supported. Allowed: PDF, DOCX, TXT, MD`,
    }),
});

// Document upload schema
export const documentUploadSchema = z.object({
  file: fileMetadataSchema,
  siteId: siteIdSchema,
});

// Document ID params schema
export const documentParamsSchema = z.object({
  documentId: documentIdSchema,
});

// Document list query schema
export const documentListQuerySchema = z
  .object({
    status: documentStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
    offset: z.coerce.number().int().min(0).default(0).optional(),
  })
  .partial();

// Reprocess document schema
export const reprocessDocumentSchema = z.object({
  force: z.boolean().default(false).optional(),
});

// Site documents params
export const siteDocumentsParamsSchema = z.object({
  siteId: siteIdSchema,
});

// Create document record schema (internal use)
export const createDocumentRecordSchema = z.object({
  siteId: siteIdSchema,
  filename: z.string().min(1).max(255),
  fileType: z.string().max(50),
  fileSize: z.number().int().positive(),
  storagePath: z.string().max(500),
});

// Export types
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type SiteDocumentsParams = z.infer<typeof siteDocumentsParamsSchema>;
