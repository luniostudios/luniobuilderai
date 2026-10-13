alter table public.projects
  add column if not exists stripe_connect_account_id text;

alter table public.project_integrations drop constraint if exists project_integrations_provider_check;
alter table public.project_integrations add constraint project_integrations_provider_check check (provider in ('unsplash', 'resend'));

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

alter table public.site_products add column if not exists requires_shipping boolean not null default false;
alter table public.site_orders add column if not exists shipping_address jsonb not null default '{}'::jsonb;

alter table public.site_memberships enable row level security;
alter table public.site_private_pages enable row level security;
alter table public.site_subscribers enable row level security;
alter table public.site_products enable row level security;
alter table public.site_orders enable row level security;
alter table public.site_campaigns enable row level security;
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