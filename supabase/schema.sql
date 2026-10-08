create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null default 'Untitled site',
  html text not null default '',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_date timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_date desc);
create index if not exists messages_project_created_idx
  on public.messages (project_id, created_date);

alter table public.projects enable row level security;
alter table public.messages enable row level security;