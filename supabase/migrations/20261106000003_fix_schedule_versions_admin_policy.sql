-- =====================================================================
--  Fix AdminHub write access to public.schedule_versions
--
--  ใช้เมื่อบันทึกตารางเวลาแล้วขึ้น error:
--  "new row violates row-level security policy" หรือ code 42501
--
--  สิ่งที่ migration นี้ทำ:
--  - อัปเดตฟังก์ชัน public.has_app_access() ให้รู้จัก adminhub
--  - เปิด RLS และ grant สิทธิ์ให้ authenticated
--  - สร้าง policy สำหรับอ่าน และ policy สำหรับผู้ดูแล AdminHub
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Shared access helper
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
-- 2) Table grants and RLS
-- ---------------------------------------------------------------------
alter table public.schedule_versions enable row level security;

grant select on public.schedule_versions to anon, authenticated;
grant insert, update, delete on public.schedule_versions to authenticated;

-- ---------------------------------------------------------------------
-- 3) Policies
-- ---------------------------------------------------------------------
drop policy if exists "schedule_versions_read" on public.schedule_versions;
create policy "schedule_versions_read"
  on public.schedule_versions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "schedule_versions_manage_adminhub" on public.schedule_versions;
create policy "schedule_versions_manage_adminhub"
  on public.schedule_versions
  for all
  to authenticated
  using (public.has_app_access('adminhub'))
  with check (public.has_app_access('adminhub'));

commit;

notify pgrst, 'reload schema';
