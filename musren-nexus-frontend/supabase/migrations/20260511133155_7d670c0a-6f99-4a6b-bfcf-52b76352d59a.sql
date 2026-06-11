
-- Consent categories and policy kinds
create type public.consent_category as enum ('necessary','analytics','marketing','personalization');
create type public.consent_policy_kind as enum ('privacy','terms','cookies');

-- Versioned policies (admin-managed)
create table public.consent_policies (
  id uuid primary key default gen_random_uuid(),
  kind public.consent_policy_kind not null,
  version text not null,
  summary text,
  content_url text,
  effective_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, version)
);

-- Per-user consent records (append-only history; latest per category wins)
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category public.consent_category not null,
  granted boolean not null,
  policy_version text not null,
  source text not null default 'banner',
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index on public.user_consents (user_id, category, created_at desc);

alter table public.consent_policies enable row level security;
alter table public.user_consents enable row level security;

create policy "anyone reads active policies" on public.consent_policies
  for select to authenticated, anon using (active);
create policy "admins manage policies" on public.consent_policies
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "owner reads own consents" on public.user_consents
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "owner inserts own consent" on public.user_consents
  for insert to authenticated with check (user_id = auth.uid());

-- Latest consent per (user, category)
create or replace view public.current_user_consents as
select distinct on (user_id, category)
  user_id, category, granted, policy_version, created_at
from public.user_consents
order by user_id, category, created_at desc;

grant select on public.current_user_consents to authenticated;

-- Seed initial v1.0 policies
insert into public.consent_policies (kind, version, summary) values
  ('privacy','1.0','Initial Musren privacy policy aligned with Kenya ODPC.'),
  ('terms','1.0','Initial Musren terms of service.'),
  ('cookies','1.0','Cookie usage and category definitions.')
on conflict do nothing;

-- Batch record consent (writes one row per category for an immutable audit trail)
create or replace function public.record_user_consents(_items jsonb, _policy_version text, _source text default 'banner')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  for v_item in select * from jsonb_array_elements(_items) loop
    insert into public.user_consents (user_id, category, granted, policy_version, source)
    values (
      v_user,
      (v_item->>'category')::public.consent_category,
      (v_item->>'granted')::boolean,
      _policy_version,
      coalesce(_source,'banner')
    );
  end loop;
end $$;
