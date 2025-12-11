-- Add INSERT, UPDATE, DELETE policies for workspaces table
-- Currently only have SELECT policy which prevents creating/updating/deleting

-- Allow users to create their own workspaces
create policy "Users can create workspaces" on public.workspaces
  for insert with check (
    owner_id = auth.uid()
  );

-- Allow owners to update their workspaces
create policy "Owners can update workspaces" on public.workspaces
  for update using (
    owner_id = auth.uid() and deleted_at is null
  );

-- Allow owners to delete their workspaces
create policy "Owners can delete workspaces" on public.workspaces
  for delete using (
    owner_id = auth.uid()
  );
