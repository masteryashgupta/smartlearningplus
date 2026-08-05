-- ============================================================
-- Migration: user_extra_slots
-- Allows individual students to add one-off extra classes/labs
-- for themselves on a specific date, without touching the
-- shared admin timetable.
-- Run this once against your database.
-- ============================================================

create table if not exists user_extra_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  subject_id uuid references subjects(id) on delete set null,
  type text not null check (type in ('class', 'lab')),
  slot_label text,          -- e.g. "08:30–09:30"
  batch text check (batch in ('G1', 'G2')),  -- only for labs
  status text not null default 'present' check (status in ('present', 'absent', 'cancelled')),
  created_at timestamptz default now()
);

create index if not exists idx_user_extra_slots_user_date on user_extra_slots(user_id, date);
