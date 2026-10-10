drop table if exists public.users;

create schema if not exists next_auth;
grant usage on schema next_auth to service_role;
grant all on schema next_auth to postgres;

create table if not exists next_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  role text not null default 'FREE'
);

alter table next_auth.users add column if not exists role text not null default 'FREE';

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
  cms_data jsonb not null default '{"collections": []}'::jsonb,
  published_slug text,
  published_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.projects add column if not exists published_slug text;
alter table public.projects add column if not exists published_at timestamptz;
alter table public.projects add column if not exists cms_data jsonb not null default '{"collections": []}'::jsonb;

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

create or replace function public.enforce_project_role_limit()
returns trigger
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  account_role text;
  role_limit integer;
  project_count integer;
begin
  select role
    into account_role
    from next_auth.users
    where id::text = new.owner_id
    for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'PROJECT_ACCOUNT_NOT_FOUND';
  end if;

  case account_role
    when 'FREE' then role_limit := 1;
    when 'PRO' then role_limit := 5;
    when 'BUSINESS' then role_limit := 25;
    when 'STAFF' then role_limit := null;
    when 'ADMIN' then role_limit := null;
    when 'MANAGER' then role_limit := null;
    when 'OWNER' then role_limit := null;
    else raise exception using errcode = 'P0001', message = 'UNSUPPORTED_ACCOUNT_ROLE';
  end case;

  if role_limit is not null then
    select count(*)::integer
      into project_count
      from public.projects
      where owner_id = new.owner_id;

    if project_count >= role_limit then
      raise exception using errcode = 'P0001', message = 'PROJECT_LIMIT_REACHED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_project_role_limit on public.projects;
create trigger enforce_project_role_limit
  before insert on public.projects
  for each row execute function public.enforce_project_role_limit();

alter table public.projects enable row level security;
alter table public.messages enable row level security;