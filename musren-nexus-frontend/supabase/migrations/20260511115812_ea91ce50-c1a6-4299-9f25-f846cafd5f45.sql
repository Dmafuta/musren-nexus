
drop policy if exists "anyone can submit inquiry" on public.corporate_topup_inquiries;

create policy "anyone can submit inquiry" on public.corporate_topup_inquiries
  for insert to anon, authenticated
  with check (
    status = 'new'
    and assigned_to is null
    and contacted_at is null
    and qualified_at is null
    and status_notes is null
    and length(company) between 2 and 200
    and length(contact_name) between 2 and 200
    and length(email) between 3 and 320
    and length(phone) between 5 and 40
    and array_length(use_cases, 1) between 1 and 20
  );
