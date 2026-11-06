-- =====================================================================
--  PayPerCase access
--  Run this AFTER:
--  ttmsabot-personalworkschedule/supabase/migrations/20261027000000_add_app_access_permissions.sql
--  ttmsabot-adminhub/supabase/migrations/20261027000001_add_adminhub_access.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Permission flag for ttmsabot-paypercase-webapp
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists can_access_paypercase boolean not null default false;

comment on column public.profiles.can_access_paypercase is
  'Allow this user to sign in to ttmsabot-paypercase-webapp';

-- ---------------------------------------------------------------------
-- 2) Update the shared RLS helper to know about paypercase
-- ---------------------------------------------------------------------
create or replace function public.has_app_access(p_app text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case lower(btrim(p_app))
      when 'personalworkschedule' then p.can_access_personalworkschedule
      when 'workschedule' then p.can_access_workschedule
      when 'bookingportalmanager' then p.can_access_bookingportalmanager
      when 'adminhub' then p.can_access_adminhub
      when 'paypercase' then p.can_access_paypercase
      else false
    end
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

revoke all on function public.has_app_access(text) from public;
grant execute on function public.has_app_access(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3) Optional RLS policies for patient_record
--    These are dormant if RLS is disabled on the table.
--    - PayPerCase users can read/write.
--    - Personal work schedule users can read (records page).
-- ---------------------------------------------------------------------
drop policy if exists "patient_record_paypercase_read" on public.patient_record;
create policy "patient_record_paypercase_read"
  on public.patient_record
  for select
  to authenticated
  using (
    public.has_app_access('paypercase')
    or public.has_app_access('personalworkschedule')
  );

drop policy if exists "patient_record_paypercase_write" on public.patient_record;
create policy "patient_record_paypercase_write"
  on public.patient_record
  for all
  to authenticated
  using (public.has_app_access('paypercase'))
  with check (public.has_app_access('paypercase'));

commit;

notify pgrst, 'reload schema';

-- =====================================================================
-- 4) Grant/revoke PayPerCase access
-- =====================================================================

-- เพิ่มสิทธิ์ PayPerCase รายคน
-- update public.profiles
-- set can_access_paypercase = true
-- where username = 'user01';

-- เพิกถอนสิทธิ์ PayPerCase
-- update public.profiles
-- set can_access_paypercase = false
-- where username = 'user02';

-- ดูรายชื่อผู้ใช้ที่เข้า PayPerCase ได้
-- select username, full_name, role, can_access_paypercase
-- from public.profiles
-- where can_access_paypercase = true
-- order by username;
