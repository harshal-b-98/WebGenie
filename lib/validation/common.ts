/**
 * Common Validation Schemas
 *
 * Reusable validation schemas for common patterns across all API routes.
 * These schemas provide consistent validation for UUIDs, pagination,
 * and other common input types.
 */

import { z } from "zod";

// UUID validation - matches standard UUID v4 format
export const uuidSchema = z
  .string()
  .uuid("Invalid UUID format")
  .describe("A valid UUID v4 identifier");

// Site ID validation
export const siteIdSchema = uuidSchema.describe("Site identifier");

// Document ID validation
export const documentIdSchema = uuidSchema.describe("Document identifier");

// Version ID validation
export const versionIdSchema = uuidSchema.describe("Version identifier");

// Conversation ID validation
export const conversationIdSchema = uuidSchema.describe("Conversation identifier");

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional(),
});

// Sort order schema
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

// Status schemas
export const siteStatusSchema = z.enum([
  "draft",
  "generating",
  "generated",
  "published",
  "archived",
]);

export const documentStatusSchema = z.enum(["pending", "processing", "processed", "failed"]);

// String validation helpers
export const nonEmptyString = z.string().min(1, "This field is required");

export const trimmedString = z.string().transform((val) => val.trim());

export const normalizedString = z.string().transform((val) => val.trim().replace(/\s+/g, " "));

// URL validation
export const urlSchema = z.string().url("Invalid URL format").max(2048, "URL is too long");

// Optional URL that allows empty strings (converts to undefined)
export const optionalUrlSchema = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().url("Invalid URL format").max(2048, "URL is too long").optional().nullable()
);

// Email validation
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .max(255, "Email is too long")
  .transform((val) => val.toLowerCase().trim());

// Color validation (hex format)
export const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color format");

// Safe text base - without transform for chainability
export const safeTextBase = z.string().max(10000, "Text is too long");

// Safe text - with trim transform (use when not chaining)
export const safeTextSchema = safeTextBase.transform((val) => val.trim());

// Helper to create safe text with custom max length
export const safeText = (maxLength: number) =>
  z
    .string()
    .max(maxLength, `Text cannot exceed ${maxLength} characters`)
    .transform((val) => val.trim());

// Message content for chat
export const messageSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(10000, "Message is too long")
  .transform((val) => val.trim());

// File validation schemas
export const allowedFileTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const fileTypeSchema = z.enum(allowedFileTypes);

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const fileSizeSchema = z
  .number()
  .int()
  .min(1, "File is empty")
  .max(MAX_FILE_SIZE, "File size exceeds 10MB limit");

// Image file types for logo upload
export const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const imageTypeSchema = z.enum(allowedImageTypes);

// Max image size: 5MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const imageSizeSchema = z
  .number()
  .int()
  .min(1, "Image is empty")
  .max(MAX_IMAGE_SIZE, "Image size exceeds 5MB limit");

// Route parameter schemas
export const routeParamsSchema = {
  siteId: z.object({ siteId: siteIdSchema }),
  documentId: z.object({ documentId: documentIdSchema }),
  versionId: z.object({ versionId: versionIdSchema }),
  siteAndVersion: z.object({
    siteId: siteIdSchema,
    versionId: versionIdSchema,
  }),
};

// Export types
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type SiteStatus = z.infer<typeof siteStatusSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
