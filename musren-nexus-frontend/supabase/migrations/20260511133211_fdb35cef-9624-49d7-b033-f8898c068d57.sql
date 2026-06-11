
drop view if exists public.current_user_consents;
create view public.current_user_consents
with (security_invoker = on) as
select distinct on (user_id, category)
  user_id, category, granted, policy_version, created_at
from public.user_consents
order by user_id, category, created_at desc;
grant select on public.current_user_consents to authenticated;

revoke execute on function public.record_user_consents(jsonb, text, text) from public, anon;
grant execute on function public.record_user_consents(jsonb, text, text) to authenticated;
