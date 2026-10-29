create type public.food_requirement as enum ('with_food', 'empty_stomach', 'no_preference');
create type public.dose_status as enum ('taken', 'skipped', 'missed');

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  dosage text not null default '',
  food_requirement public.food_requirement not null default 'no_preference',
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  hour smallint not null check (hour between 0 and 23),
  minute smallint not null check (minute between 0 and 59),
  days_of_week smallint[] not null check (
    cardinality(days_of_week) > 0
    and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  grace_minutes integer not null default 60 check (grace_minutes between 1 and 1440),
  updated_at timestamptz not null default now()
);

create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  schedule_id uuid references public.schedules (id) on delete set null,
  scheduled_for timestamptz not null,
  status public.dose_status not null,
  taken_at timestamptz,
  with_food boolean,
  device text,
  updated_at timestamptz not null default now(),
  unique (user_id, schedule_id, scheduled_for)
);

alter table public.medications enable row level security;
alter table public.schedules enable row level security;
alter table public.dose_logs enable row level security;

create policy medications_owner on public.medications
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy schedules_owner on public.schedules
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy dose_logs_owner on public.dose_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.medications to authenticated;
grant select, insert, update, delete on public.schedules to authenticated;
grant select, insert, update, delete on public.dose_logs to authenticated;

alter table public.medications replica identity full;
alter table public.schedules replica identity full;
alter table public.dose_logs replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.medications;
    alter publication supabase_realtime add table public.schedules;
    alter publication supabase_realtime add table public.dose_logs;
  end if;
end $$;
