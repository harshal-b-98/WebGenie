"use client";

import { WorkspaceCard } from "./workspace-card";

interface WorkspaceGridProps {
  workspaces: Array<{
    id: string;
    name: string;
    description?: string | null;
    status?: string;
    created_at: string;
  }>;
  onDelete: (id: string) => void;
}

export function WorkspaceGrid({ workspaces, onDelete }: WorkspaceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace) => (
        <WorkspaceCard key={workspace.id} workspace={workspace} onDelete={onDelete} />
      ))}
    </div>
  );
}
