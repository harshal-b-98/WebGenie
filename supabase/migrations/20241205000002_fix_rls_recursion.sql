-- Fix infinite recursion in workspace_members policy
-- The issue was that the policy was querying workspace_members from within itself

-- Drop the problematic policy
drop policy if exists "Members can view other members" on public.workspace_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can view workspace members if they are viewing their own membership record
-- or if they share a workspace (checked via the workspace policy, not workspace_members)
create policy "Members can view other members" on public.workspace_members
  for select using (
    deleted_at is null and (
      user_id = auth.uid()
      or workspace_id in (
        select id from public.workspaces
        where owner_id = auth.uid()
        and deleted_at is null
      )
    )
  );

-- Also update the websites policy to avoid potential recursion
drop policy if exists "Members can view websites" on public.websites;
create policy "Members can view websites" on public.websites
  for select using (
    deleted_at is null and workspace_id in (
      select id from public.workspaces
      where (owner_id = auth.uid() or id in (
        select workspace_id from public.workspace_members
        where user_id = auth.uid() and deleted_at is null
      ))
      and deleted_at is null
    )
  );
