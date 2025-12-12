/**
 * AI Routes Validation Schemas
 *
 * Validation schemas for AI-related API routes including
 * chat, generation, refinement, and streaming endpoints.
 */

import { z } from "zod";
import { siteIdSchema, conversationIdSchema, versionIdSchema, messageSchema } from "./common";

// Chat message role
export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

// Conversation message schema
export const conversationMessageSchema = z.object({
  role: messageRoleSchema,
  content: messageSchema,
});

// Chat request schema
export const chatRequestSchema = z.object({
  message: messageSchema,
  siteId: siteIdSchema,
  conversationId: conversationIdSchema.optional(),
});

// Generate website request schema
export const generateRequestSchema = z.object({
  siteId: siteIdSchema,
  conversationId: conversationIdSchema.optional(),
});

// Refine website request schema
export const refineRequestSchema = z.object({
  message: messageSchema,
  siteId: siteIdSchema,
  currentVersionId: versionIdSchema,
});

// Stream generation request schema
export const generateStreamRequestSchema = z.object({
  siteId: siteIdSchema,
  conversationId: conversationIdSchema.optional(),
  includeProgress: z.boolean().default(false).optional(),
});

// Chat history for context
export const chatHistorySchema = z
  .array(conversationMessageSchema)
  .max(50, "Chat history too long");

// Generation options schema
export const generationOptionsSchema = z
  .object({
    temperature: z.number().min(0).max(2).default(0.7).optional(),
    maxTokens: z.number().int().min(100).max(16000).default(8000).optional(),
    includeChat: z.boolean().default(false).optional(),
  })
  .partial();

// Export types
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type RefineRequest = z.infer<typeof refineRequestSchema>;
export type GenerateStreamRequest = z.infer<typeof generateStreamRequestSchema>;
export type ChatHistory = z.infer<typeof chatHistorySchema>;
export type GenerationOptions = z.infer<typeof generationOptionsSchema>;
