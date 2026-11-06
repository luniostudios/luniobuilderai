create table if not exists public.site_cms_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  collection_id text not null,
  record_data jsonb not null check (jsonb_typeof(record_data) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.site_cms_entries enable row level security;
revoke all on table public.site_cms_entries from public, anon, authenticated;
grant all on table public.site_cms_entries to service_role;

create index if not exists site_cms_entries_collection_created_idx
  on public.site_cms_entries (project_id, collection_id, created_at desc);