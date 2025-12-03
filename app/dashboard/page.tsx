"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorkspaceGrid } from "@/components/features/workspace/workspace-grid";
import { EmptyState } from "@/components/features/workspace/empty-state";
import { CreateWorkspaceDialog } from "@/components/features/workspace/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<
    Array<{
      id: string;
      name: string;
      description?: string | null;
      status?: string;
      created_at: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to load workspaces");
      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch {
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workspace?")) return;

    try {
      const response = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");

      setWorkspaces(workspaces.filter((w) => w.id !== id));
      toast.success("Workspace deleted");
    } catch {
      toast.error("Failed to delete workspace");
    }
  };

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage your AI-powered websites</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            + New Project
          </Button>
        </div>

        {/* Search */}
        {workspaces.length > 0 && (
          <div className="max-w-md">
            <Input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-40 w-full" />
              </div>
            ))}
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          searchQuery ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No projects match your search</p>
            </div>
          ) : (
            <div className="py-12">
              <EmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
            </div>
          )
        ) : (
          <WorkspaceGrid workspaces={filteredWorkspaces} onDelete={handleDelete} />
        )}
      </div>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadWorkspaces}
      />
    </DashboardLayout>
  );
}
