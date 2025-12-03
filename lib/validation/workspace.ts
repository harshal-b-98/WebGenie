import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(255, "Workspace name is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const createSiteSchema = z.object({
  title: z.string().min(1, "Site title is required").max(255, "Title is too long"),
  description: z.string().max(1000).optional(),
  site_type: z.string().max(100).optional(),
});

export const updateSiteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  site_type: z.string().max(100).optional(),
  status: z.enum(["draft", "generating", "generated", "published", "archived"]).optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
  target_audience: z.string().optional(),
  main_goal: z.string().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
