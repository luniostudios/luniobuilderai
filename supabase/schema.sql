create table if not exists public.users (
  id text primary key,
  name text,
  email text,
  image text
);

create schema if not exists next_auth;
grant usage on schema next_auth to service_role;
grant all on schema next_auth to postgres;

create table if not exists next_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

create table if not exists next_auth.accounts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  "userId" uuid references next_auth.users(id) on delete cascade,
  unique (provider, "providerAccountId")
);

create table if not exists next_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  expires timestamptz not null,
  "sessionToken" text not null unique,
  "userId" uuid references next_auth.users(id) on delete cascade
);

create table if not exists next_auth.verification_tokens (
  identifier text not null,
  token text not null unique,
  expires timestamptz not null,
  primary key (identifier, token)
);

grant all on table next_auth.users to postgres, service_role;
grant all on table next_auth.accounts to postgres, service_role;
grant all on table next_auth.sessions to postgres, service_role;
grant all on table next_auth.verification_tokens to postgres, service_role;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null default 'Untitled site',
  html text not null default '',
  published_slug text,
  published_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.projects add column if not exists published_slug text;
alter table public.projects add column if not exists published_at timestamptz;

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
create unique index if not exists projects_published_slug_idx
  on public.projects (published_slug)
  where published_slug is not null;
create index if not exists messages_project_created_idx
  on public.messages (project_id, created_date);

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;