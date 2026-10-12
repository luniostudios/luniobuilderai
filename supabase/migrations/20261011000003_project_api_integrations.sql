create table if not exists public.project_integrations (
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id text not null,
  provider text not null check (provider = 'unsplash'),
  encrypted_key text not null,
  updated_at timestamptz not null default now(),
  primary key (project_id, provider)
);

alter table public.project_integrations enable row level security;
revoke all on table public.project_integrations from public, anon, authenticated;
grant all on table public.project_integrations to service_role;