import * as workspaceRepository from "@/lib/repositories/workspace-repository";
import { CreateWorkspaceInput, UpdateWorkspaceInput } from "@/lib/validation/workspace";
import { logger } from "@/lib/utils/logger";
import { AuthorizationError } from "@/lib/utils/errors";

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
  return workspaceRepository.createWorkspace(userId, input.name, input.description);
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
  await workspaceRepository.softDeleteWorkspace(workspaceId, userId);
}

export async function canCreateWorkspace(userId: string): Promise<boolean> {
  const count = await workspaceRepository.countWorkspacesByUserId(userId);
  return count < MAX_WORKSPACES_PER_USER;
}
