/**
 * Site Validation Schemas
 *
 * Validation schemas for site-related API routes including
 * settings, versions, logo uploads, and site management.
 */

import { z } from "zod";
import {
  siteIdSchema,
  versionIdSchema,
  siteStatusSchema,
  hexColorSchema,
  optionalUrlSchema,
  safeText,
  imageTypeSchema,
  imageSizeSchema,
} from "./common";

// Social media links schema
export const socialMediaSchema = z
  .object({
    linkedin: optionalUrlSchema,
    twitter: optionalUrlSchema,
    facebook: optionalUrlSchema,
    instagram: optionalUrlSchema,
    youtube: optionalUrlSchema,
  })
  .partial();

// Logo schema
export const logoSchema = z.object({
  url: optionalUrlSchema,
  filename: z.string().max(255).optional(),
  storagePath: z.string().max(500).optional(),
});

// Brand assets schema
export const brandAssetsSchema = z
  .object({
    logo: logoSchema.optional(),
    socialMedia: socialMediaSchema.optional(),
    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
  })
  .partial();

// Chat widget position
export const chatWidgetPositionSchema = z.enum(["bottom-right", "bottom-left"]);

// Chat widget configuration schema
export const chatWidgetConfigSchema = z
  .object({
    position: chatWidgetPositionSchema.optional(),
    primaryColor: hexColorSchema.optional(),
    welcomeMessage: z.string().max(500).optional(),
  })
  .partial();

// Persona detection configuration
export const personaDetectionConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    personas: z.array(z.string()).max(10).optional(),
  })
  .partial();

// Site settings update schema
export const updateSiteSettingsSchema = z
  .object({
    description: z
      .string()
      .max(2000)
      .transform((val) => val.trim())
      .optional(),
    brand_assets: brandAssetsSchema.optional(),
    chat_widget_enabled: z.boolean().optional(),
    chat_widget_config: chatWidgetConfigSchema.optional(),
    dynamic_pages_enabled: z.boolean().optional(),
    persona_detection_enabled: z.boolean().optional(),
    persona_detection_config: personaDetectionConfigSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided for update");

// Create site schema
export const createSiteSchema = z.object({
  title: z
    .string()
    .min(1, "Site title is required")
    .max(255, "Title is too long")
    .transform((val) => val.trim()),
  description: safeText(2000).optional(),
  site_type: z.string().max(100).optional(),
  workspace_id: z.string().uuid().optional(),
});

// Update site schema
export const updateSiteSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: safeText(2000).optional(),
    site_type: z.string().max(100).optional(),
    status: siteStatusSchema.optional(),
    requirements: z.record(z.string(), z.unknown()).optional(),
    target_audience: z.string().max(500).optional(),
    main_goal: z.string().max(500).optional(),
  })
  .partial();

// Site ID params schema
export const siteParamsSchema = z.object({
  siteId: siteIdSchema,
});

// Version params schema
export const versionParamsSchema = z.object({
  siteId: siteIdSchema,
  versionId: versionIdSchema,
});

// Logo upload schema
export const logoUploadSchema = z.object({
  file: z.object({
    name: z.string().min(1, "Filename is required"),
    size: imageSizeSchema,
    type: imageTypeSchema,
  }),
  siteId: siteIdSchema,
});

// Preview query schema
export const previewQuerySchema = z.object({
  versionId: versionIdSchema.optional(),
});

// Export types
export type SocialMediaInput = z.infer<typeof socialMediaSchema>;
export type BrandAssetsInput = z.infer<typeof brandAssetsSchema>;
export type ChatWidgetConfig = z.infer<typeof chatWidgetConfigSchema>;
export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
export type SiteParams = z.infer<typeof siteParamsSchema>;
export type VersionParams = z.infer<typeof versionParamsSchema>;
