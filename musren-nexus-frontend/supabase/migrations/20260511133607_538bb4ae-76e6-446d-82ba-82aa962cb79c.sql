
-- Tighten user_roles policies: only superadmins can manage privileged roles
drop policy if exists "admins manage roles" on public.user_roles;

create policy "superadmins manage privileged roles" on public.user_roles
  for all to authenticated
  using (
    public.has_role(auth.uid(),'superadmin')
    or (
      public.has_role(auth.uid(),'admin')
      and role not in ('admin','superadmin')
    )
  )
  with check (
    public.has_role(auth.uid(),'superadmin')
    or (
      public.has_role(auth.uid(),'admin')
      and role not in ('admin','superadmin')
    )
  );

-- grant_role: superadmin can grant any; admin can grant non-privileged
create or replace function public.grant_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'not authenticated'; end if;
  if _role in ('admin','superadmin') then
    if not public.has_role(v_caller,'superadmin') then
      raise exception 'only super admins can grant % role', _role;
    end if;
  else
    if not (public.has_role(v_caller,'superadmin') or public.has_role(v_caller,'admin')) then
      raise exception 'admin role required';
    end if;
  end if;
  insert into public.user_roles(user_id, role)
    values (_user_id, _role)
    on conflict (user_id, role) do nothing;
end $$;

create or replace function public.revoke_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_remaining int;
begin
  if v_caller is null then raise exception 'not authenticated'; end if;
  if _role in ('admin','superadmin') then
    if not public.has_role(v_caller,'superadmin') then
      raise exception 'only super admins can revoke % role', _role;
    end if;
  else
    if not (public.has_role(v_caller,'superadmin') or public.has_role(v_caller,'admin')) then
      raise exception 'admin role required';
    end if;
  end if;
  -- prevent removing the last superadmin
  if _role = 'superadmin' then
    select count(*) into v_remaining from public.user_roles where role = 'superadmin' and user_id <> _user_id;
    if v_remaining = 0 then
      raise exception 'cannot remove the last super admin';
    end if;
  end if;
  delete from public.user_roles where user_id = _user_id and role = _role;
end $$;

-- List users with at least one role (admins + superadmins only)
create or replace function public.list_users_with_roles()
returns table(user_id uuid, email text, roles public.app_role[])
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin')) then
    raise exception 'admin role required';
  end if;
  return query
  select ur.user_id,
         (select au.email from auth.users au where au.id = ur.user_id) as email,
         array_agg(ur.role order by ur.role) as roles
  from public.user_roles ur
  group by ur.user_id
  order by 2 nulls last;
end $$;

-- Bootstrap: first signed-in user can claim superadmin if none exists
create or replace function public.claim_first_superadmin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_caller uuid := auth.uid(); v_exists int;
begin
  if v_caller is null then raise exception 'not authenticated'; end if;
  select count(*) into v_exists from public.user_roles where role = 'superadmin';
  if v_exists > 0 then return false; end if;
  insert into public.user_roles(user_id, role) values (v_caller,'superadmin')
    on conflict do nothing;
  insert into public.user_roles(user_id, role) values (v_caller,'admin')
    on conflict do nothing;
  return true;
end $$;

revoke execute on function public.grant_role(uuid, public.app_role) from public, anon;
revoke execute on function public.revoke_role(uuid, public.app_role) from public, anon;
revoke execute on function public.list_users_with_roles() from public, anon;
revoke execute on function public.claim_first_superadmin() from public, anon;
grant execute on function public.grant_role(uuid, public.app_role) to authenticated;
grant execute on function public.revoke_role(uuid, public.app_role) to authenticated;
grant execute on function public.list_users_with_roles() to authenticated;
grant execute on function public.claim_first_superadmin() to authenticated;
