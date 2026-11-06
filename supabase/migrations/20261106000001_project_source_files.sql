alter table public.projects
  add column if not exists source_files jsonb not null default '[]'::jsonb;