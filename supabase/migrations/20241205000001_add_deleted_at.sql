-- Add deleted_at column to workspaces table for soft deletes
alter table public.workspaces
add column deleted_at timestamp with time zone;

-- Add deleted_at column to workspace_members table for soft deletes
alter table public.workspace_members
add column deleted_at timestamp with time zone;

-- Add deleted_at column to websites table for soft deletes
alter table public.websites
add column deleted_at timestamp with time zone;

-- Update RLS policies to exclude soft-deleted records

-- Workspaces: Members can view (excluding deleted)
drop policy if exists "Members can view workspaces" on public.workspaces;
create policy "Members can view workspaces" on public.workspaces
  for select using (
    deleted_at is null and (
      exists (
        select 1 from public.workspace_members
        where workspace_id = workspaces.id
        and user_id = auth.uid()
        and deleted_at is null
      )
      or owner_id = auth.uid()
    )
  );

-- Workspace Members: Members can view other members (excluding deleted)
drop policy if exists "Members can view other members" on public.workspace_members;
create policy "Members can view other members" on public.workspace_members
  for select using (
    deleted_at is null and exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
    )
  );

-- Websites: Members can view websites (excluding deleted)
drop policy if exists "Members can view websites" on public.websites;
create policy "Members can view websites" on public.websites
  for select using (
    deleted_at is null and exists (
      select 1 from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      where wm.workspace_id = websites.workspace_id
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
      and w.deleted_at is null
    )
  );
