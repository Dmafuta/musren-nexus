
-- Pin search_path on the trigger fn
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- Restrict direct PostgREST execution of has_role; RLS evaluation still works via SECURITY DEFINER context
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
