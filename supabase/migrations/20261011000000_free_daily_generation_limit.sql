create table if not exists public.daily_generation_usage (
  owner_id text not null,
  usage_date date not null,
  generation_count integer not null check (generation_count between 1 and 5),
  primary key (owner_id, usage_date)
);

alter table public.daily_generation_usage enable row level security;
revoke all on table public.daily_generation_usage from public, anon, authenticated;
grant all on table public.daily_generation_usage to service_role;

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