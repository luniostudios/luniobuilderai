alter table next_auth.users
  add column if not exists role text not null default 'FREE';

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
