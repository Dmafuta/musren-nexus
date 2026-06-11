
create table public.consent_settings (
  id integer primary key default 1,
  active_policy_version text not null default '1.0',
  default_analytics boolean not null default false,
  default_marketing boolean not null default false,
  default_personalization boolean not null default false,
  reprompt_on_version_change boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint consent_settings_singleton check (id = 1)
);

alter table public.consent_settings enable row level security;

create policy "anyone reads consent settings" on public.consent_settings
  for select to authenticated, anon using (true);
create policy "admins update consent settings" on public.consent_settings
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

insert into public.consent_settings(id) values (1) on conflict do nothing;
