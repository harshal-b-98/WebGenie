-- Add missing columns to workspaces table

alter table public.workspaces
  add column if not exists description text,
  add column if not exists settings jsonb default '{}'::jsonb;
