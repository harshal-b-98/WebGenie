import * as workspaceRepository from "@/lib/repositories/workspace-repository";
import { CreateWorkspaceInput, UpdateWorkspaceInput } from "@/lib/validation/workspace";
import { logger } from "@/lib/utils/logger";
import { AuthorizationError } from "@/lib/utils/errors";
import { createClient } from "@/lib/db/server";

const MAX_WORKSPACES_PER_USER = 10;

export async function getUserWorkspaces(userId: string) {
  return workspaceRepository.getWorkspacesByUserId(userId);
}

export async function getWorkspace(workspaceId: string, userId: string) {
  const workspace = await workspaceRepository.getWorkspaceById(workspaceId, userId);

  if (!workspace) {
    throw new AuthorizationError("Workspace not found or access denied");
  }

  return workspace;
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  // Check workspace limit
  const count = await workspaceRepository.countWorkspacesByUserId(userId);

  if (count >= MAX_WORKSPACES_PER_USER) {
    throw new AuthorizationError(`Maximum ${MAX_WORKSPACES_PER_USER} workspaces allowed per user`);
  }

  logger.info("Creating workspace", { userId, name: input.name });
  const workspace = await workspaceRepository.createWorkspace(
    userId,
    input.name,
    input.description
  );

  // Also create a site record for this workspace
  const supabase = await createClient();
  const workspaceId = (workspace as { id: string }).id;

  await supabase.from("sites").insert({
    id: workspaceId, // Use same ID as workspace
    workspace_id: workspaceId,
    user_id: userId,
    title: input.name,
    description: input.description || null,
    status: "draft",
  } as never);

  logger.info("Site record created for workspace", { workspaceId });

  return workspace;
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput
) {
  // Verify ownership
  await getWorkspace(workspaceId, userId);

  logger.info("Updating workspace", { workspaceId, userId });
  return workspaceRepository.updateWorkspace(workspaceId, userId, input);
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  // Verify ownership
  await getWorkspace(workspaceId, userId);

  logger.info("Deleting workspace", { workspaceId, userId });

  // Try to delete the associated site (if it exists)
  const supabase = await createClient();
  try {
    await supabase.from("sites").delete().eq("id", workspaceId).eq("user_id", userId);
  } catch (error) {
    // Site might not exist for old workspaces - that's okay
    logger.warn("Could not delete site, might not exist", { workspaceId, error });
  }

  // Then soft delete the workspace
  await workspaceRepository.softDeleteWorkspace(workspaceId, userId);

  logger.info("Workspace deleted", { workspaceId });
}

export async function canCreateWorkspace(userId: string): Promise<boolean> {
  const count = await workspaceRepository.countWorkspacesByUserId(userId);
  return count < MAX_WORKSPACES_PER_USER;
}
