"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create workspace
      const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const { data: workspace, error } = await supabase
        .from("workspaces")
        .insert({
          name: workspaceName,
          slug: `${slug}-${Date.now()}`, // Ensure uniqueness for now
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add user as owner in members
      const { error: memberError } = await supabase.from("workspace_members").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

      if (memberError) throw memberError;

      router.push(`/dashboard`);
    } catch (error) {
      console.error("Error creating workspace:", error);
      alert("Failed to create workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to NextGenWeb</CardTitle>
          <CardDescription>Let&apos;s set up your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="workspace-name" className="text-sm font-medium">
                Workspace Name
              </label>
              <Input
                id="workspace-name"
                placeholder="My Awesome Agency"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateWorkspace}
              disabled={!workspaceName.trim() || loading}
            >
              {loading ? "Creating..." : "Create Workspace"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
