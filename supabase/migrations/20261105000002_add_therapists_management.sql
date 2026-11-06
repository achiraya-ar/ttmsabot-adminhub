-- =====================================================================
--  Therapist management permissions
--  ให้ Admin Hub เพิ่ม/แก้ไขข้อมูลในตาราง therapists
-- =====================================================================

begin;

alter table public.therapists enable row level security;

grant select on public.therapists to anon, authenticated;
grant insert, update, delete on public.therapists to authenticated;

do $$
begin
  if to_regclass('public.therapists_id_seq') is not null then
    execute 'grant usage, select on sequence public.therapists_id_seq to authenticated';
  end if;
end $$;

drop policy if exists "therapists_read" on public.therapists;
create policy "therapists_read"
  on public.therapists
  for select
  to anon, authenticated
  using (true);

drop policy if exists "therapists_manage_adminhub" on public.therapists;
create policy "therapists_manage_adminhub"
  on public.therapists
  for all
  to authenticated
  using (public.has_app_access('adminhub'))
  with check (public.has_app_access('adminhub'));

commit;

notify pgrst, 'reload schema';
