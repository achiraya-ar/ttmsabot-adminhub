-- =====================================================================
--  Add self-booking approval flag to bookings_register
--
--  ใช้กำหนดว่าผู้ป่วยรายนี้ได้รับอนุมัติให้จองคิวเองผ่านหน้าเว็บหรือไม่
--  - ผู้ป่วยเดิมทุกคนจะถูกตั้งเป็น true (อนุญาต)
--  - ผู้ป่วยใหม่ค่าเริ่มต้นเป็น false (ยังไม่อนุญาต)
--  - ตั้งค่าได้จากหน้า ลงทะเบียนผู้ป่วยใหม่ และ แก้ไขข้อมูลผู้ป่วย
--  - หน้าจองคิวของ ttmsabot-workschedule จะตรวจสอบค่านี้ก่อนจอง
-- =====================================================================

begin;

alter table public.bookings_register
  add column if not exists can_self_book boolean;

update public.bookings_register
set can_self_book = true
where can_self_book is distinct from true;

alter table public.bookings_register
  alter column can_self_book set default false;

alter table public.bookings_register
  alter column can_self_book set not null;

comment on column public.bookings_register.can_self_book is
  'Existing patients default to allowed; new patients must be approved by an admin';

commit;

notify pgrst, 'reload schema';
