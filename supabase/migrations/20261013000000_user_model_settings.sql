create table if not exists public.user_model_settings (
  owner_id text primary key,
  selected_model text not null default 'auto'
    check (selected_model in ('auto', 'gemini-3.5-flash-lite', 'gpt-4.1-mini', 'claude-sonnet-5-5')),
  encrypted_google_key text,
  encrypted_openai_key text,
  encrypted_anthropic_key text,
  updated_at timestamptz not null default now()
);

alter table public.user_model_settings enable row level security;
revoke all on table public.user_model_settings from public, anon, authenticated;
grant all on table public.user_model_settings to service_role;
