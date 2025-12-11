-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable Vector extension for embeddings
create extension if not exists "vector";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workspaces table
create table public.workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workspace Members table
create table public.workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, user_id)
);

-- Websites table
create table public.websites (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  slug text not null unique,
  status text not null default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies

-- Profiles: Users can view their own profile
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Workspaces: Members can view
alter table public.workspaces enable row level security;
create policy "Members can view workspaces" on public.workspaces
  for select using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
      and user_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

-- Workspace Members: Members can view other members
alter table public.workspace_members enable row level security;
create policy "Members can view other members" on public.workspace_members
  for select using (
    exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Websites: Members can view websites
alter table public.websites enable row level security;
create policy "Members can view websites" on public.websites
  for select using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = websites.workspace_id
      and user_id = auth.uid()
    )
  );

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
