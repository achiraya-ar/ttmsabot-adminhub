-- =====================================================================
--  Delete therapist (atomic)
--  ลบข้อมูลนักบำบัดและเวอร์ชันตารางเวลาของนักบำบัดคนนั้น
--  โดยไม่ลบข้อมูลการจองเดิมในตาราง bookings
-- =====================================================================

begin;

create or replace function public.delete_therapist(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.has_app_access('adminhub') then
    raise exception 'forbidden';
  end if;

  select btrim(name)
  into v_name
  from public.therapists
  where id = p_id;

  if v_name is null then
    return;
  end if;

  delete from public.schedule_versions
  where btrim(therapist_name) = v_name;

  -- เว็บไซต์เก่ายังใช้ตาราง schedules อยู่ จึงลบตารางเวลาของนักบำบัดคนนี้ออกด้วย
  if to_regclass('public.schedules') is not null then
    execute 'delete from public.schedules where btrim(therapist_name) = $1'
      using v_name;
  end if;

  delete from public.therapists
  where id = p_id;
end;
$$;

revoke all on function public.delete_therapist(bigint) from public;
grant execute on function public.delete_therapist(bigint) to authenticated;

commit;

notify pgrst, 'reload schema';
