-- PROPER fix for infinite recursion in RLS policies
-- The issue: workspaces checks workspace_members, workspace_members checks workspaces
-- Solution: Break the circular dependency by making workspaces policy simpler

-- Drop and recreate workspaces policy to only check owner
drop policy if exists "Members can view workspaces" on public.workspaces;
create policy "Owners can view workspaces" on public.workspaces
  for select using (
    deleted_at is null and owner_id = auth.uid()
  );

-- Keep the workspace_members policy as-is (it's already correct)
-- Users can view workspace members if they own the workspace
-- This doesn't cause recursion because workspaces policy no longer checks workspace_members
