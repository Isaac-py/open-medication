create table if not exists medications (
  id text primary key not null,
  name text not null,
  dosage text not null,
  food_requirement text not null,
  note text,
  archived_at text,
  updated_at text not null
);

create table if not exists schedules (
  id text primary key not null,
  medication_id text not null references medications (id) on delete cascade,
  hour integer not null,
  minute integer not null,
  days_of_week text not null,
  grace_minutes integer not null,
  updated_at text not null
);

create table if not exists dose_logs (
  id text primary key not null,
  medication_id text not null references medications (id) on delete cascade,
  schedule_id text,
  scheduled_for text not null,
  status text not null,
  taken_at text,
  with_food integer,
  device text,
  updated_at text not null
);

create table if not exists snoozes (
  schedule_id text not null,
  scheduled_for text not null,
  until text not null,
  primary key (schedule_id, scheduled_for)
);
