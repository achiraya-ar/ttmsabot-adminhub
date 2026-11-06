-- =====================================================================
--  TTMSA Admin Hub access
--  Run this AFTER:
--  ttmsabot-personalworkschedule/supabase/migrations/20261027000000_add_app_access_permissions.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Permission flag for the admin hub
--    Backfill Managers only on the first run, so re-running this
--    migration does not re-grant access that an admin revoked.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'can_access_adminhub'
  ) then
    execute 'alter table public.profiles add column can_access_adminhub boolean not null default false';

    update public.profiles
    set can_access_adminhub = true
    where role = 'Manager';
  end if;
end $$;

comment on column public.profiles.can_access_adminhub is
  'Allow this user to sign in to ttmsabot-adminhub';

-- ---------------------------------------------------------------------
-- 2) Update the shared RLS helper to know about adminhub
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
      else false
    end
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

revoke all on function public.has_app_access(text) from public;
grant execute on function public.has_app_access(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3) Optional RLS policies for the admin hub
--    These are dormant if RLS is disabled on the table.
--    They grant full access to adminhub users when RLS is enabled.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_adminhub_manage" on public.profiles;
create policy "profiles_adminhub_manage"
  on public.profiles
  for all
  to authenticated
  using (public.has_app_access('adminhub'))
  with check (public.has_app_access('adminhub'));

drop policy if exists "holidays_adminhub_manage" on public.holidays;
create policy "holidays_adminhub_manage"
  on public.holidays
  for all
  to authenticated
  using (public.has_app_access('adminhub'))
  with check (public.has_app_access('adminhub'));

commit;

notify pgrst, 'reload schema';

-- =====================================================================
-- 4) Grant/revoke Admin Hub access
-- =====================================================================

-- ดูรายชื่อผู้ดูแล
-- select username, full_name, role, can_access_adminhub
-- from public.profiles
-- where can_access_adminhub = true
-- order by username;

-- เพิ่มสิทธิ์ Admin Hub รายคน
-- update public.profiles
-- set can_access_adminhub = true
-- where username = 'admin01';

-- เพิกถอนสิทธิ์ Admin Hub
-- update public.profiles
-- set can_access_adminhub = false
-- where username = 'admin02';
