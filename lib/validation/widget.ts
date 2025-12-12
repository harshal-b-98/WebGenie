/**
 * Widget Routes Validation Schemas
 *
 * Validation schemas for public widget API routes including
 * chat, page generation, and lead capture.
 * These routes are accessed from external websites.
 */

import { z } from "zod";
import { messageSchema, emailSchema, safeText } from "./common";

// Project ID (site ID in widget context) - UUID format
export const projectIdSchema = z
  .string()
  .uuid("Invalid project ID format")
  .describe("Project/Site identifier");

// Session ID for tracking widget sessions
export const sessionIdSchema = z.string().max(100, "Session ID too long").optional();

// Conversation history item for widget chat
export const widgetMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: messageSchema,
});

// Widget chat request schema
export const widgetChatRequestSchema = z.object({
  projectId: projectIdSchema,
  message: messageSchema,
  conversationHistory: z.array(widgetMessageSchema).max(20).optional(),
  versionId: z.string().uuid().optional(),
});

// Page type for dynamic generation
export const pageTypeSchema = z.enum(["segment", "detail"]);

// Segment type schema
export const segmentTypeSchema = z.enum([
  "features",
  "solutions",
  "platform",
  "faq",
  "about",
  "pricing",
  "contact",
  "industries",
  "resources",
]);

// Behavior signals for persona detection
export const behaviorSignalsSchema = z
  .object({
    pagesVisited: z.array(z.string().max(200)).max(50).optional(),
    timeOnSections: z.record(z.string(), z.number().min(0).max(3600)).optional(),
    clickedElements: z.array(z.string().max(200)).max(100).optional(),
    scrollDepth: z.record(z.string(), z.number().min(0).max(100)).optional(),
  })
  .partial();

// Generate page request schema
export const generatePageRequestSchema = z
  .object({
    siteId: projectIdSchema,
    pageType: pageTypeSchema,
    segment: z.string().max(100).optional(),
    topic: z.string().max(200).optional(),
    sessionId: sessionIdSchema,
    behaviorSignals: behaviorSignalsSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.pageType === "segment" && !data.segment) {
        return false;
      }
      return true;
    },
    { message: "segment is required for segment pages", path: ["segment"] }
  )
  .refine(
    (data) => {
      if (data.pageType === "detail" && (!data.segment || !data.topic)) {
        return false;
      }
      return true;
    },
    {
      message: "segment and topic are required for detail pages",
      path: ["topic"],
    }
  );

// Lead capture request schema
export const leadCaptureRequestSchema = z.object({
  projectId: projectIdSchema,
  email: emailSchema,
  name: safeText(100).optional(),
  company: safeText(200).optional(),
  message: safeText(2000).optional(),
  source: z.enum(["chat", "form", "cta"]).default("form").optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Stream generation request (widget version)
export const widgetGenerateStreamRequestSchema = z.object({
  siteId: projectIdSchema,
  pageType: pageTypeSchema,
  segment: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
  sessionId: sessionIdSchema,
});

// Export types
export type ProjectId = z.infer<typeof projectIdSchema>;
export type WidgetMessage = z.infer<typeof widgetMessageSchema>;
export type WidgetChatRequest = z.infer<typeof widgetChatRequestSchema>;
export type PageType = z.infer<typeof pageTypeSchema>;
export type SegmentType = z.infer<typeof segmentTypeSchema>;
export type BehaviorSignals = z.infer<typeof behaviorSignalsSchema>;
export type GeneratePageRequest = z.infer<typeof generatePageRequestSchema>;
export type LeadCaptureRequest = z.infer<typeof leadCaptureRequestSchema>;
