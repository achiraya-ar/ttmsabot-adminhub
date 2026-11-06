-- =====================================================================
--  Allow the Staff role in public.profiles
--
--  The existing profiles_role_check constraint only allows
--  Manager and Therapist. Staff is used for non-therapist users
--  (for example, staff who only need the booking or admin systems).
-- =====================================================================

begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('Manager', 'Therapist', 'Staff'));

commit;

notify pgrst, 'reload schema';
