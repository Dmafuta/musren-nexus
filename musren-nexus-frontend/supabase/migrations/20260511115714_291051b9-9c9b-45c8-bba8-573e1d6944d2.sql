
-- Enums
create type public.app_role as enum ('admin', 'staff', 'user');
create type public.inquiry_status as enum ('new', 'contacted', 'qualified', 'rejected');
create type public.preferred_contact as enum ('Email', 'Phone call', 'WhatsApp');

-- Roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Inquiries table
create table public.corporate_topup_inquiries (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  industry text,
  contact_name text not null,
  email text not null,
  phone text not null,
  role text,
  network text not null,
  estimated_volume text not null,
  frequency text not null,
  use_cases text[] not null default '{}',
  preferred_contact preferred_contact not null,
  notes text,
  status inquiry_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  contacted_at timestamptz,
  qualified_at timestamptz,
  status_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.corporate_topup_inquiries enable row level security;

-- Anyone (incl. anon) can submit an inquiry
create policy "anyone can submit inquiry" on public.corporate_topup_inquiries
  for insert to anon, authenticated with check (true);

-- Only admins/staff can read & update
create policy "staff read inquiries" on public.corporate_topup_inquiries
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

create policy "staff update inquiries" on public.corporate_topup_inquiries
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff'));

create policy "admins delete inquiries" on public.corporate_topup_inquiries
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger set_updated_at_corporate_topup_inquiries
before update on public.corporate_topup_inquiries
for each row execute function public.tg_set_updated_at();

create index corporate_topup_inquiries_status_idx on public.corporate_topup_inquiries(status);
create index corporate_topup_inquiries_created_at_idx on public.corporate_topup_inquiries(created_at desc);
