-- ============================================================
-- Attendance Tracker — Schema (Postgres / Supabase)
-- ============================================================

create extension if not exists "pgcrypto";

-- Admins log in on the website only (email + password)
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Students use both Telegram and the dashboard
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,           -- null until they /start the bot
  telegram_username text,
  name text not null,
  email text unique,
  password_hash text,
  batch text not null check (batch in ('G1', 'G2')),   -- lab batch
  section text default '5CSG CS-5',
  dashboard_token text unique,          -- used for magic-link style dashboard login
  telegram_connect_token text unique,  -- used to connect telegram account after website registration
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Subjects / labs
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                            -- e.g. CD, CG, AOA
  name text not null,                   -- e.g. "Compiler Design"
  type text not null check (type in ('theory', 'lab')) default 'theory',
  color text default '#6D5EF5',         -- for dashboard chips
  created_at timestamptz default now()
);

-- One row per weekly recurring class slot. This IS the timetable.
-- Same for every student (admin-managed); batch column restricts
-- a slot to a lab batch when needed ('ALL' | 'G1' | 'G2').
create table if not exists timetable_slots (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun..6=Sat
  slot_number smallint not null,
  start_time time not null,
  end_time time not null,
  subject_id uuid references subjects(id) on delete cascade,
  batch text not null default 'ALL' check (batch in ('ALL', 'G1', 'G2')),
  label text,                           -- optional override e.g. "AOA LAB - MS (CP7)"
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (day_of_week, slot_number, batch)
);

-- Admin-declared holidays / cancellations.
-- If slot_id is null -> whole day off for everyone.
-- If slot_id is set  -> only that specific class is cancelled that day.
create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot_id uuid references timetable_slots(id) on delete cascade,
  reason text,
  created_by uuid references admins(id),
  created_at timestamptz default now(),
  unique(date, slot_id)
);

-- Actual attendance records. One per (user, slot, date).
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  slot_id uuid not null references timetable_slots(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'cancelled', 'holiday')),
  source text not null default 'bot' check (source in ('bot', 'dashboard', 'admin')),
  marked_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, slot_id, date)
);

create index if not exists idx_attendance_user_date on attendance(user_id, date);
create index if not exists idx_timetable_day on timetable_slots(day_of_week);
create index if not exists idx_holidays_date on holidays(date);

-- keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_attendance_updated on attendance;
create trigger trg_attendance_updated before update on attendance
for each row execute function set_updated_at();

-- ============================================================
-- Seed: subjects + timetable from JECRC 5CSG CS-5 2026-27 sheet
-- Edit freely from the Admin Panel afterwards — this is just a start.
-- ============================================================

insert into subjects (code, name, type, color) values
  ('HCI', 'HCI - PT', 'theory', '#6D5EF5'),
  ('CGM', 'CGM - CU', 'theory', '#22B8CF'),
  ('AOA', 'AOA - MS', 'theory', '#51CF66'),
  ('CD',  'CD - YP', 'theory', '#FCC419'),
  ('ITC', 'ITC - DR. YZU', 'theory', '#FF8787'),
  ('OS',  'OS - AS', 'theory', '#845EF7'),
  ('AOALAB', 'AOA Lab', 'lab', '#51CF66'),
  ('CGMLAB', 'CGM Lab', 'lab', '#22B8CF'),
  ('AJLAB', 'AJ Lab', 'lab', '#FF6B6B'),
  ('CDLAB', 'CD Lab', 'lab', '#FCC419')
on conflict (code) do update set name = excluded.name;

-- Timetable seed — 5CSG CS-5, 2026-27 (from the JECRC sheet).
-- Slots: 1=8:30-9:30 2=9:30-10:30 3=10:30-11:30 4=11:30-12:30
--        (BREAK 12:30-1:30, not a slot) 5=1:30-2:30 6=2:30-3:30
-- day_of_week: 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
-- Edit times/subjects any time from the Admin Panel — this just seeds it.

insert into timetable_slots (day_of_week, slot_number, start_time, end_time, subject_id, batch, label)
select 1, 1, '08:30'::time, '09:30'::time, id, 'ALL', 'HCI - PT' from subjects where code='HCI'
union all select 1, 2, '09:30'::time, '10:30'::time, id, 'ALL', 'CGM - CU' from subjects where code='CGM'
union all select 1, 3, '10:30'::time, '11:30'::time, id, 'ALL', 'AOA - MS' from subjects where code='AOA'
union all select 1, 4, '11:30'::time, '12:30'::time, id, 'ALL', 'CD - YP' from subjects where code='CD'

union all select 3, 1, '08:30'::time, '09:30'::time, id, 'ALL', 'CGM - CU' from subjects where code='CGM'
union all select 3, 3, '10:30'::time, '11:30'::time, id, 'ALL', 'AOA - MS' from subjects where code='AOA'
union all select 3, 4, '11:30'::time, '12:30'::time, id, 'ALL', 'OS - AS' from subjects where code='OS'
union all select 3, 5, '13:30'::time, '14:30'::time, id, 'ALL', 'ITC - DR. YZU' from subjects where code='ITC'

union all select 4, 1, '08:30'::time, '09:30'::time, id, 'ALL', 'CD - YP' from subjects where code='CD'
union all select 4, 2, '09:30'::time, '10:30'::time, id, 'ALL', 'HCI - PT' from subjects where code='HCI'
union all select 4, 3, '10:30'::time, '11:30'::time, id, 'ALL', 'OS - AS' from subjects where code='OS'
union all select 4, 4, '11:30'::time, '12:30'::time, id, 'ALL', 'AOA - MS' from subjects where code='AOA'
union all select 4, 5, '13:30'::time, '15:30'::time, id, 'G1', 'AJ Lab (BM-AS) - G1' from subjects where code='AJLAB'
union all select 4, 5, '13:30'::time, '15:30'::time, id, 'G2', 'CGM Lab-KK-CP1 - G2' from subjects where code='CGMLAB'

union all select 5, 1, '08:30'::time, '10:30'::time, id, 'G1', 'AoA Lab-MS-CP7 - G1' from subjects where code='AOALAB'
union all select 5, 3, '10:30'::time, '11:30'::time, id, 'ALL', 'CGM - CU' from subjects where code='CGM'
union all select 5, 4, '11:30'::time, '12:30'::time, id, 'ALL', 'ITC - DR. YZU' from subjects where code='ITC'
union all select 5, 5, '13:30'::time, '15:30'::time, id, 'G1', 'CD Lab-CP6-YP - G1' from subjects where code='CDLAB'
union all select 5, 5, '13:30'::time, '15:30'::time, id, 'G2', 'AJ Lab-CP8-AS - G2' from subjects where code='AJLAB'

union all select 6, 1, '08:30'::time, '10:30'::time, id, 'G2', 'AoA Lab-MS-CP7 - G2' from subjects where code='AOALAB'
union all select 6, 3, '10:30'::time, '11:30'::time, id, 'ALL', 'OS - AS' from subjects where code='OS'
union all select 6, 4, '11:30'::time, '12:30'::time, id, 'ALL', 'CD - YP' from subjects where code='CD'
union all select 6, 5, '13:30'::time, '15:30'::time, id, 'G1', 'CGM Lab-KK-CP8 - G1' from subjects where code='CGMLAB'
union all select 6, 5, '13:30'::time, '15:30'::time, id, 'G2', 'CD Lab-CP2-YP - G2' from subjects where code='CDLAB'
on conflict (day_of_week, slot_number, batch) do nothing;

-- Tuesday has no classes on the sheet — nothing seeded for day_of_week=2.
-- Note: slot 5/6 times seeded as 1:30-3:30 (after the 12:30-1:30 break),
-- matching the sheet even though the on-screen slot numbers read 5/6.
