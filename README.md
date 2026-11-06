# TTM-AdminHub

เว็บสำหรับผู้ดูแลระบบ ใช้จัดการ:

- ตาราง `profiles` — ข้อมูลผู้ใช้ บทบาท และสิทธิ์การเข้าถึงทั้ง 5 ระบบ
- ตาราง `holidays` — วันหยุดของโรงพยาบาล

สร้างด้วย Vue 3 + Vite + TypeScript + Tailwind CSS v4 + Supabase

## สิทธิ์การเข้าใช้งาน

ผู้ใช้ต้องมี:

1. บัญชี Supabase Auth ที่ใช้อีเมลเดียวกับ `profiles.email`
2. `profiles.can_access_adminhub = true`

ค่าเริ่มต้นของ `can_access_adminhub` คือ `false` และ migration จะให้สิทธิ์ผู้ที่มี `role = 'Manager'` เดิมก่อน

## 1. ตั้งค่า Environment

คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าเดียวกับโปรเจกต์อื่น:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://gojpvtermnfsdvklcrzp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

> ใช้เฉพาะ anon key ใน frontend ห้ามใส่ service role key ใน `.env` ของ Vite

## 2. รัน SQL Migration

ถ้ายังไม่ได้รัน migration ของสิทธิ์รายแอป ให้รันไฟล์นี้ก่อน:

```
ttmsabot-personalworkschedule/supabase/migrations/20261027000000_add_app_access_permissions.sql
```

จากนั้นรัน migration ของ Admin Hub ใน Supabase Dashboard > SQL Editor ตามลำดับ:

```
supabase/migrations/20261027000001_add_adminhub_access.sql
supabase/migrations/20261028000000_add_paypercase_access.sql
supabase/migrations/20261105000001_migrate_schedules_to_versions.sql
supabase/migrations/20261105000002_add_therapists_management.sql
```

Migration เหล่านี้จะ:

- เพิ่มคอลัมน์ `profiles.can_access_adminhub`
- ให้สิทธิ์ Admin Hub กับผู้ใช้ที่ `role = 'Manager'` เดิม
- เพิ่มคอลัมน์ `profiles.can_access_paypercase`
- อัปเดตฟังก์ชัน `has_app_access()` ให้รู้จัก `adminhub` และ `paypercase`
- เพิ่ม RLS policies สำหรับให้ผู้ดูแลจัดการ `profiles`, `holidays`
  และให้ผู้ใช้ PayPerCase/ตารางงานส่วนตัวเข้าถึง `patient_record`
  (มีผลเมื่อเปิด RLS บนตารางนั้น)
- สร้างตาราง `schedule_versions` สำหรับเว็บไซต์เวอร์ชันใหม่
- คัดลอกข้อมูลจาก `schedules` เดิมมาเป็นเวอร์ชันเริ่มต้น `effective_from = 2000-01-01`
- **ไม่ลบตาราง `schedules`** เพื่อให้เว็บไซต์เก่ายังใช้งานได้
- เพิ่มคอลัมน์ `slot_visibility` สำหรับกำหนด public/private รายช่วงเวลา
  โดยข้อมูลเดิมจะใช้ค่า `visibility` เดิมของทั้งวันเป็นค่าเริ่มต้น
- ลบฟีเจอร์ `app_settings.booking_start_date` และ RLS policies ที่เกี่ยวข้องออก
- เพิ่ม RLS policies ให้ Admin Hub แก้ไข `schedule_versions`
  และให้ทุกแอปที่อ่านตารางเวรอ่านเวอร์ชันตารางเวลาได้
- เพิ่ม RLS policies ให้ Admin Hub เพิ่มและแก้ไขข้อมูลในตาราง `therapists`

> เว็บไซต์เก่าที่ยังใช้ `schedules` จะไม่เห็นการเปลี่ยนเวลาแบบเวอร์ชันใหม่
> จนกว่าจะอัปเดตมาใช้ `schedule_versions` จากนั้นจึงค่อยลบ `schedules` แยกภายหลัง

หลังรันแล้ว ตรวจสอบ:

```sql
select
  username,
  full_name,
  role,
  can_access_adminhub,
  can_access_paypercase
from public.profiles
order by username;
```

ถ้าต้องการให้ใครเข้า Admin Hub หรือ PayPerCase เพิ่ม:

```sql
update public.profiles
set can_access_adminhub = true
where username = 'admin01';

update public.profiles
set can_access_paypercase = true
where username = 'user01';
```

> ผู้ใช้ PayPerCase ต้องมีบัญชี Supabase Auth ที่ใช้อีเมลเดียวกับ `profiles.email`
> และมี `can_access_paypercase = true` จึงจะเข้าสู่ระบบได้

## 3. Deploy Edge Function `admin-users`

Edge Function นี้ใช้ service role ฝั่ง server สำหรับ:

- สร้าง Supabase Auth user พร้อมโปรไฟล์
- เปลี่ยนอีเมลหรือรหัสผ่านของผู้ใช้
- ลบ Supabase Auth user พร้อมโปรไฟล์
- อ่านเวลาที่เข้าสู่ระบบล่าสุด (`last_sign_in_at`) จาก Supabase Auth

### วิธี deploy ผ่าน Supabase Dashboard

1. ไปที่ **Edge Functions** > **Deploy a new function**
2. ตั้งชื่อฟังก์ชันว่า `admin-users`
3. คัดลอกโค้ดจากไฟล์นี้ไปวาง:

```
supabase/functions/admin-users/index.ts
```

4. กด **Deploy**
5. ไม่ต้องตั้ง secret เพิ่ม เพราะ Supabase มี `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   และ `SUPABASE_SERVICE_ROLE_KEY` ให้อัตโนมัติ

> ถ้าเคย deploy `admin-users` เวอร์ชันก่อนแล้ว ต้อง deploy ใหม่หลังเพิ่ม action
> `last-sign-ins` สำหรับแสดงเวลาที่เข้าสู่ระบบล่าสุดในหน้า `profiles`

### วิธี deploy ผ่าน Supabase CLI

```bash
supabase link --project-ref gojpvtermnfsdvklcrzp
supabase functions deploy admin-users
```

### ถ้ายังไม่ deploy Edge Function

- ยังดูรายชื่อผู้ใช้และจัดการวันหยุดได้
- แต่จะเพิ่ม/แก้ไข/ลบผู้ใช้ไม่ได้ เพราะระบบใช้ Edge Function เป็นตัวตรวจสิทธิ์
  และเขียนทั้ง `profiles` กับ Supabase Auth ให้สอดคล้องกัน

## 4. รันในเครื่อง

```bash
npm install
npm run dev
```

## 5. Build

```bash
npm run build
```

ผลลัพธ์จะอยู่ใน `dist/`

## 6. Deploy

เป็น static site ปกติ สามารถ deploy ไป Vercel, Netlify หรือ hosting อื่นได้

แอปใช้ **hash routing** (`/#/profiles`, `/#/holidays`) จึงไม่ต้องตั้งค่า rewrite
สำหรับ SPA เพิ่มเติม

## โครงสร้างหลัก

```
src/
  components/
    AppLayout.vue          # sidebar + header + mobile drawer
    BaseModal.vue          # modal กลาง
    ProfileFormModal.vue   # ฟอร์มเพิ่ม/แก้ไขผู้ใช้
    HolidayFormModal.vue   # ฟอร์มเพิ่ม/แก้ไขวันหยุด
    PermissionBadges.vue   # badge สิทธิ์รายแอป
    StatCard.vue
  services/
    auth.ts                # login / session / permission check
    profiles.ts            # CRUD profiles + Edge Function
    holidays.ts            # CRUD holidays
  stores/auth.ts           # Pinia auth store
  views/
    LoginView.vue
    DashboardView.vue
    ProfilesView.vue
    HolidaysView.vue
supabase/
  migrations/
    20261027000001_add_adminhub_access.sql
  functions/
    admin-users/index.ts
```

## ข้อควรระวัง

- การเปลี่ยน `profiles.email` ต้องเปลี่ยนอีเมลใน Supabase Auth ด้วย
  Edge Function `admin-users` จัดการให้ทั้งสองฝั่ง
- ถ้าเปลี่ยนอีเมลใน `profiles` อย่างเดียว ผู้ใช้จะล็อกอินไม่ได้
- ไม่สามารถลบบัญชีของตัวเองหรือเพิกถอน `can_access_adminhub` ของตัวเองได้
- หากเปิด RLS และการเขียนตารางไม่ทำงาน ให้ตรวจว่า migration ส่วน RLS ถูก run แล้ว
  และผู้ใช้มี `can_access_adminhub = true`
- หากเปิด RLS บน `profiles` ต้องมี policy ให้ `anon` อ่านข้อมูลเพื่อค้นหา username
  ตอนล็อกอิน (แอปเดิมใช้วิธีนี้อยู่แล้ว) มิฉะนั้นจะล็อกอินไม่ได้
- การตรวจสิทธิ์ใน frontend ไม่ใช่การป้องกันระดับฐานข้อมูล ควรเปิด RLS
  สำหรับตารางที่มีข้อมูลสำคัญและตรวจ policy ให้รัดกุม
- ห้าม commit ไฟล์ `.env`

## Troubleshooting

### `column profiles.can_access_adminhub does not exist`

ยังไม่ได้รัน migration `20261027000001_add_adminhub_access.sql`

### `ยังไม่ได้ deploy Edge Function "admin-users"`

ยังไม่ได้ deploy Edge Function หรือ deploy ผิดชื่อ ให้ทำตามขั้นตอนที่ 3

### เข้า Admin Hub ไม่ได้

ตรวจสอบ:

```sql
select username, email, role, can_access_adminhub
from public.profiles
where username = 'ชื่อผู้ใช้';
```

- ต้องมี row ใน `profiles`
- `can_access_adminhub` ต้องเป็น `true`
- อีเมลใน `profiles` ต้องตรงกับอีเมลใน Supabase Auth

### เข้า PayPerCase ไม่ได้

ตรวจสอบ:

```sql
select username, email, role, can_access_paypercase
from public.profiles
where username = 'ชื่อผู้ใช้';
```

- ต้องรัน migration `20261028000000_add_paypercase_access.sql`
- `can_access_paypercase` ต้องเป็น `true`
- อีเมลใน `profiles` ต้องตรงกับอีเมลใน Supabase Auth
