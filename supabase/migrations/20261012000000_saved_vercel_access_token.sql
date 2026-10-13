alter table public.projects
  add column if not exists encrypted_vercel_token text;