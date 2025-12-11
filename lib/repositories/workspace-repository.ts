// Workspace repository - ready to use after schema is run
// This file uses type assertions to work before Supabase types are generated

import { createClient } from "@/lib/db/server";
import { DatabaseError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getWorkspacesByUserId(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to get workspaces", error, { userId });
    throw new DatabaseError("Unable to load your projects. Please refresh the page and try again.");
  }

  return data;
}

export async function getWorkspaceById(workspaceId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error("Failed to get workspace", error, { workspaceId, userId });
    throw new DatabaseError("Failed to get workspace");
  }

  return data;
}

export async function createWorkspace(userId: string, name: string, description?: string) {
  const supabase = await createClient();

  const slug = slugify(name);

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userId,
      name,
      slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
      description: description || null,
      settings: {},
    } as never)
    .select()
    .single();

  if (error) {
    logger.error("Failed to create workspace", error, { userId, name });

    // Provide specific error messages based on error code
    if (error.code === "23505") {
      throw new DatabaseError(
        "A project with this name already exists. Please choose a different name."
      );
    }
    if (error.code === "23503") {
      throw new DatabaseError("User profile not found. Please refresh the page and try again.");
    }
    if (error.code === "42P17") {
      throw new DatabaseError("Database configuration error. Please contact support.");
    }

    throw new DatabaseError("Unable to create project. Please try again.");
  }

  logger.info("Workspace created", { workspaceId: (data as { id: string }).id, userId });
  return data;
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  updates: { name?: string; description?: string; settings?: Record<string, unknown> }
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { ...updates };
  if (updates.name) {
    updateData.slug = slugify(updates.name);
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update(updateData as never)
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update workspace", error, { workspaceId, userId });
    throw new DatabaseError("Failed to update workspace");
  }

  logger.info("Workspace updated", { workspaceId, userId });
  return data;
}

export async function softDeleteWorkspace(workspaceId: string, userId: string) {
  const supabase = await createClient();

  // Use hard delete for now due to RLS policy issues with UPDATE
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("owner_id", userId);

  if (error) {
    console.error("Database error deleting workspace:", error);
    logger.error("Failed to delete workspace", error, { workspaceId, userId });
    throw new DatabaseError(`Failed to delete workspace: ${error.message}`);
  }

  logger.info("Workspace deleted", { workspaceId, userId });
}

export async function countWorkspacesByUserId(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("workspaces")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .is("deleted_at", null);

  if (error) {
    logger.error("Failed to count workspaces", error, { userId });
    throw new DatabaseError("Unable to check project limit. Please try again.");
  }

  return count || 0;
}
