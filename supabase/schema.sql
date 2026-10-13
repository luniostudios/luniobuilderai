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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public profile images are readable" on storage.objects;
create policy "Public profile images are readable"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null default 'Untitled site',
  html text not null default '',
  cms_data jsonb not null default '{"collections": []}'::jsonb,
  site_metadata jsonb not null default '{"title":"","description":"","keywords":"","author":"","faviconUrl":"","socialImageUrl":"","themeColor":""}'::jsonb,
  stripe_connect_account_id text,
  encrypted_vercel_token text,
  published_slug text,
  published_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.projects add column if not exists published_slug text;
alter table public.projects add column if not exists published_at timestamptz;
alter table public.projects add column if not exists cms_data jsonb not null default '{"collections": []}'::jsonb;
alter table public.projects add column if not exists site_metadata jsonb not null default '{"title":"","description":"","keywords":"","author":"","faviconUrl":"","socialImageUrl":"","themeColor":""}'::jsonb;
alter table public.projects add column if not exists encrypted_vercel_token text;
alter table public.projects add column if not exists stripe_connect_account_id text;

create table if not exists public.site_memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  auth_user_id uuid not null,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, auth_user_id)
);

create table if not exists public.site_private_pages (
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null,
  title text not null,
  html text not null,
  access_mode text not null check (access_mode in ('members', 'password')),
  password_salt text,
  password_hash text,
  updated_at timestamptz not null default now(),
  primary key (project_id, path),
  check ((access_mode = 'members' and password_salt is null and password_hash is null)
    or (access_mode = 'password' and ((password_salt is null and password_hash is null)
      or (password_salt is not null and password_hash is not null))))
);

create table if not exists public.site_subscribers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  source text not null default 'website',
  consent_at timestamptz not null default now(),
  unsubscribe_token_hash text not null unique,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create table if not exists public.site_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sku text not null,
  name text not null,
  description text not null default '',
  image_url text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  requires_shipping boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, sku)
);

create table if not exists public.site_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  checkout_session_id text not null unique,
  payment_intent_id text,
  customer_email text,
  status text not null check (status in ('paid', 'refunded', 'payment_failed')),
  amount_total integer not null check (amount_total >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  items jsonb not null default '[]'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.site_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject text not null,
  from_email text not null,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  status text not null check (status in ('sending', 'sent', 'partial', 'failed')),
  provider_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.site_form_rate_limits (
  project_id uuid not null references public.projects(id) on delete cascade,
  ip_hash text not null,
  window_started timestamptz not null,
  request_count integer not null default 1,
  primary key (project_id, ip_hash, window_started)
);

alter table public.site_memberships enable row level security;
alter table public.site_private_pages enable row level security;
alter table public.site_subscribers enable row level security;
alter table public.site_products enable row level security;
alter table public.site_orders enable row level security;
alter table public.site_campaigns enable row level security;
alter table public.site_products add column if not exists requires_shipping boolean not null default false;
alter table public.site_orders add column if not exists shipping_address jsonb not null default '{}'::jsonb;
alter table public.site_form_rate_limits enable row level security;
revoke all on table public.site_memberships, public.site_private_pages, public.site_subscribers,
  public.site_products, public.site_orders, public.site_form_rate_limits from public, anon, authenticated;
revoke all on table public.site_campaigns from public, anon, authenticated;
grant all on table public.site_memberships, public.site_private_pages, public.site_subscribers,
  public.site_products, public.site_orders, public.site_form_rate_limits to service_role;
grant all on table public.site_campaigns to service_role;

create or replace function public.reserve_site_form_submission(
  p_project_id uuid,
  p_ip_hash text,
  p_window_started timestamptz,
  p_limit integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  insert into public.site_form_rate_limits (project_id, ip_hash, window_started, request_count)
  values (p_project_id, p_ip_hash, p_window_started, 1)
  on conflict (project_id, ip_hash, window_started)
  do update set request_count = public.site_form_rate_limits.request_count + 1
  returning request_count into current_count;
  return current_count <= greatest(1, least(p_limit, 20));
end;
$$;
revoke all on function public.reserve_site_form_submission(uuid, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.reserve_site_form_submission(uuid, text, timestamptz, integer) to service_role;

create index if not exists site_subscribers_project_created_idx
  on public.site_subscribers (project_id, created_at desc);
create index if not exists site_products_project_active_idx
  on public.site_products (project_id, active);
create index if not exists site_orders_project_created_idx
  on public.site_orders (project_id, created_at desc);
create index if not exists site_campaigns_project_created_idx
  on public.site_campaigns (project_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_date timestamptz not null default now()
);

create table if not exists public.daily_generation_usage (
  owner_id text not null,
  usage_date date not null,
  generation_count integer not null check (generation_count between 1 and 5),
  primary key (owner_id, usage_date)
);

alter table public.daily_generation_usage enable row level security;
revoke all on table public.daily_generation_usage from public, anon, authenticated;
grant all on table public.daily_generation_usage to service_role;

create table if not exists public.project_integrations (
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id text not null,
  provider text not null check (provider in ('unsplash', 'resend')),
  encrypted_key text not null,
  updated_at timestamptz not null default now(),
  primary key (project_id, provider)
);

alter table public.project_integrations drop constraint if exists project_integrations_provider_check;
alter table public.project_integrations add constraint project_integrations_provider_check check (provider in ('unsplash', 'resend'));

create table if not exists public.user_model_settings (
  owner_id text primary key,
  selected_model text not null default 'auto'
    check (selected_model in ('auto', 'gemini-3.5-flash-lite', 'gpt-4.1-mini', 'claude-sonnet-5-5')),
  encrypted_google_key text,
  encrypted_openai_key text,
  encrypted_anthropic_key text,
  updated_at timestamptz not null default now()
);

alter table public.project_integrations enable row level security;
revoke all on table public.project_integrations from public, anon, authenticated;
grant all on table public.project_integrations to service_role;
alter table public.user_model_settings enable row level security;
revoke all on table public.user_model_settings from public, anon, authenticated;
grant all on table public.user_model_settings to service_role;

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

create or replace function public.reserve_daily_generation(p_owner_id text)
returns boolean
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  account_role text;
  usage_count integer;
  today_utc date := (now() at time zone 'UTC')::date;
begin
  select role
    into account_role
    from next_auth.users
    where id::text = p_owner_id
    for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'GENERATION_ACCOUNT_NOT_FOUND';
  end if;

  if account_role <> 'FREE' then
    return true;
  end if;

  insert into public.daily_generation_usage (owner_id, usage_date, generation_count)
    values (p_owner_id, today_utc, 1)
    on conflict (owner_id, usage_date) do update
      set generation_count = public.daily_generation_usage.generation_count + 1
      where public.daily_generation_usage.generation_count < 5
    returning generation_count into usage_count;

  if not found then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.reserve_daily_generation(text) from public, anon, authenticated;
grant execute on function public.reserve_daily_generation(text) to service_role;

alter table public.projects enable row level security;
alter table public.messages enable row level security;