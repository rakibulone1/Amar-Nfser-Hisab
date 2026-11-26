-- Amar Nfser Hisab · consolidated master schema
-- Run once in the Supabase SQL Editor for a new project.
-- This file installs the current account, journal, tracker, goal, backup,
-- analytics, rate-limit and table-per-record workspace schema. The old snapshot
-- table is retained only as a one-time migration source and is not used at runtime.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 80),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 25)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'bn' check (language = 'bn'),
  theme text not null default 'light' check (theme in ('light','dark','system')),
  time_zone text not null default 'Asia/Dhaka',
  maghrib_time time,
  maghrib_day_rollover boolean not null default true,
  hijri_adjustment_days smallint not null default 0 check (hijri_adjustment_days between -2 and 2),
  asr_school text not null default 'hanafi' check (asr_school in ('hanafi')),
  jamaat_reminder_minutes smallint not null default 10 check (jamaat_reminder_minutes between 1 and 120),
  sleep_reminder_enabled boolean not null default false,
  sleep_time time not null default '22:30',
  prayer_city_label text,
  prayer_latitude double precision,
  prayer_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_latitude_range check (prayer_latitude is null or prayer_latitude between -90 and 90),
  constraint user_preferences_longitude_range check (prayer_longitude is null or prayer_longitude between -180 and 180)
);

-- Legacy archive from Releases 1.0–1.1. Release 1.2+ reads and writes per-record
-- workspace_* tables installed below. This table is retained only to migrate older data;
-- runtime application routes do not read or write this snapshot.
create table if not exists public.user_workspace_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 3 check (schema_version = 3),
  payload jsonb not null,
  payload_bytes integer not null default 0 check (payload_bytes between 0 and 5242880),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint workspace_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.self_purification_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  intention text,
  start_date date not null,
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index if not exists self_purification_one_active_per_user
  on public.self_purification_journeys(user_id) where status = 'active';

create table if not exists public.obstacle_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  unique(user_id, title), unique(id, user_id)
);

create table if not exists public.journey_obstacles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null,
  template_id uuid,
  title text not null check (char_length(title) between 1 and 120),
  happened_on date not null,
  context text,
  trigger_note text,
  response_note text,
  lesson text,
  intensity smallint check (intensity between 1 and 5),
  created_at timestamptz not null default now(),
  foreign key (journey_id, user_id) references public.self_purification_journeys(id, user_id) on delete cascade,
  foreign key (template_id, user_id) references public.obstacle_templates(id, user_id) on delete restrict
);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  reason text,
  plan text,
  start_date date not null,
  deadline date not null,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_goal_dates check (deadline >= start_date),
  unique(id, user_id)
);

create table if not exists public.learning_goal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  parent_task_id uuid,
  title text not null check (char_length(title) between 1 and 180),
  details text,
  due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.learning_goals(id, user_id) on delete cascade,
  foreign key (parent_task_id, user_id) references public.learning_goal_tasks(id, user_id) on delete cascade,
  unique(id, user_id)
);

create table if not exists public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  prayer_name text not null check (prayer_name in ('fajr','dhuhr','asr','maghrib','isha')),
  fard_method text not null check (fard_method in ('jamaat','individual','missed')),
  jamaat_result text check (jamaat_result is null or jamaat_result in ('takbir_ula','late_complete','missed_rakat')),
  missed_rakat smallint not null default 0 check (missed_rakat between 0 and 3),
  fard_reason text,
  performed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, journal_date, prayer_name),
  unique(id, user_id)
);

create table if not exists public.prayer_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_log_id uuid not null,
  component_key text not null check (component_key in ('fajr_sunnah','dhuhr_before','dhuhr_after','asr_before','maghrib_after','isha_after','isha_witr')),
  component_name text not null check (char_length(component_name) between 1 and 100),
  rakats smallint not null check (rakats between 1 and 4),
  performed boolean not null,
  omission_reason text,
  created_at timestamptz not null default now(),
  foreign key (prayer_log_id, user_id) references public.prayer_logs(id, user_id) on delete cascade,
  unique(prayer_log_id, component_key)
);

create table if not exists public.qada_obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_log_id uuid,
  prayer_name text not null check (prayer_name in ('fajr','dhuhr','asr','maghrib','isha')),
  missed_on date not null,
  rakats smallint not null default 0 check (rakats between 0 and 20),
  reason text,
  status text not null default 'pending' check (status in ('pending','settled')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  foreign key (prayer_log_id, user_id) references public.prayer_logs(id, user_id) on delete set null (prayer_log_id),
  unique(id, user_id)
);
create index if not exists qada_obligations_user_status_date on public.qada_obligations(user_id, status, missed_on desc);
create unique index if not exists qada_one_pending_per_prayer_day
  on public.qada_obligations(user_id, prayer_name, missed_on) where status = 'pending';

create table if not exists public.qada_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  obligation_id uuid not null,
  note text,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (obligation_id, user_id) references public.qada_obligations(id, user_id) on delete cascade,
  unique(obligation_id)
);

create table if not exists public.fasting_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  unique(user_id, title), unique(id, user_id)
);
create table if not exists public.fasting_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  fasting_type text not null check (fasting_type in ('obligatory','sunnah','nafl')),
  fasting_category text not null check (fasting_category in ('ramadan','qada','vow','monday','thursday','white_days','arafah','ashura','shawwal','custom')),
  custom_label text,
  custom_template_id uuid,
  status text not null check (status in ('completed','missed','excused')),
  reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (custom_template_id, user_id) references public.fasting_templates(id, user_id) on delete set null (custom_template_id),
  unique(user_id, journal_date)
);

create table if not exists public.quran_reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  surah_from smallint check (surah_from between 1 and 114),
  ayah_from smallint check (ayah_from between 1 and 300),
  surah_to smallint check (surah_to between 1 and 114),
  ayah_to smallint check (ayah_to between 1 and 300),
  page_from smallint check (page_from between 1 and 604),
  page_to smallint check (page_to between 1 and 604),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  note text,
  created_at timestamptz not null default now(),
  constraint quran_range_required check ((surah_from is not null and ayah_from is not null and surah_to is not null and ayah_to is not null) or (page_from is not null and page_to is not null))
);

create table if not exists public.dhikr_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'general' check (category in ('morning','evening','after_prayer','general','custom')),
  target_count integer check (target_count between 1 and 1000000),
  created_at timestamptz not null default now(),
  unique(user_id, title), unique(id, user_id)
);
create table if not exists public.dhikr_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid,
  title_snapshot text not null check (char_length(title_snapshot) between 1 and 120),
  count integer not null check (count between 1 and 1000000),
  journal_date date not null,
  performed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  foreign key (template_id, user_id) references public.dhikr_templates(id, user_id) on delete set null (template_id)
);

create table if not exists public.deed_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deed_type text not null check (deed_type in ('good','bad')),
  title text not null check (char_length(title) between 1 and 140),
  created_at timestamptz not null default now(),
  unique(user_id, deed_type, title), unique(id, user_id)
);
create table if not exists public.deed_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid,
  deed_type text not null check (deed_type in ('good','bad')),
  title_snapshot text not null check (char_length(title_snapshot) between 1 and 140),
  details text,
  journal_date date not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (template_id, user_id) references public.deed_templates(id, user_id) on delete set null (template_id)
);

create table if not exists public.daily_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  title text,
  mood text check (mood is null or mood in ('peaceful','grateful','hopeful','neutral','stressed','sad','tired')),
  energy_level smallint check (energy_level between 1 and 5),
  body text,
  reflection text,
  gratitude text,
  next_day_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, journal_date), unique(id, user_id)
);

create table if not exists public.journal_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('daily_journal','deed_log')),
  entity_id uuid not null,
  storage_path text,
  mime_type text not null,
  file_size integer not null check (file_size between 1 and 102400),
  created_at timestamptz not null default now()
);

create or replace function public.mark_qada_settled()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  update public.qada_obligations set status='settled', settled_at=new.performed_at
  where id=new.obligation_id and user_id=new.user_id;
  return new;
end;
$$;
drop trigger if exists qada_settlement_updates_obligation on public.qada_settlements;
create trigger qada_settlement_updates_obligation after insert on public.qada_settlements
for each row execute function public.mark_qada_settled();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  title text not null check (char_length(title) between 1 and 180),
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Login-throttle buckets are only reachable by the service role via fixed RPCs.
create table if not exists public.login_attempt_buckets (
  bucket_hash text primary key,
  bucket_kind text not null check (bucket_kind in ('email','ip')),
  failure_count integer not null default 0 check (failure_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists prayer_logs_user_date_idx on public.prayer_logs(user_id, journal_date desc, created_at desc);
create index if not exists quran_reading_logs_user_date_idx on public.quran_reading_logs(user_id, journal_date desc, created_at desc);
create index if not exists dhikr_logs_user_date_idx on public.dhikr_logs(user_id, journal_date desc, created_at desc);
create index if not exists deed_logs_user_date_idx on public.deed_logs(user_id, journal_date desc, created_at desc);
create index if not exists daily_journals_user_date_idx on public.daily_journals(user_id, journal_date desc);

-- Standard owner-scoped RLS on every user-owned table.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','user_workspace_snapshots','self_purification_journeys',
    'obstacle_templates','journey_obstacles','learning_goals','learning_goal_tasks','prayer_logs',
    'prayer_components','qada_obligations','fasting_templates','fasting_logs',
    'quran_reading_logs','dhikr_templates','dhikr_logs','deed_templates','deed_logs',
    'daily_journals','journal_attachments','notifications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Qada settlement rows are append-only: users may read and create them, but cannot rewrite history.
alter table public.qada_settlements enable row level security;
drop policy if exists "qada_settlements_select_own" on public.qada_settlements;
drop policy if exists "qada_settlements_insert_own" on public.qada_settlements;
drop policy if exists "qada_settlements_update_own" on public.qada_settlements;
drop policy if exists "qada_settlements_delete_own" on public.qada_settlements;
create policy "qada_settlements_select_own" on public.qada_settlements for select to authenticated using (user_id = auth.uid());
create policy "qada_settlements_insert_own" on public.qada_settlements for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Create owner policies for user_id-owned tables. Table names are internal constants above.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'user_preferences','user_workspace_snapshots','self_purification_journeys','obstacle_templates',
    'journey_obstacles','learning_goals','learning_goal_tasks','prayer_logs','prayer_components',
    'qada_obligations','fasting_templates','fasting_logs','quran_reading_logs',
    'dhikr_templates','dhikr_logs','deed_templates','deed_logs','daily_journals','journal_attachments','notifications'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', table_name || '_delete_own', table_name);
  end loop;
end $$;

alter table public.login_attempt_buckets enable row level security;
revoke all on public.login_attempt_buckets from anon, authenticated;
grant select, insert, update, delete on public.login_attempt_buckets to service_role;

-- Ensure profile and date preferences exist when an Auth account is created.
create or replace function public.create_user_workspace_defaults()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace after insert on auth.users
for each row execute function public.create_user_workspace_defaults();

-- A prayer row, its components and any resulting qada obligation are written atomically.
create or replace function public.save_prayer_entry(
  p_prayer_name text,
  p_journal_date date,
  p_fard_method text,
  p_jamaat_result text default null,
  p_missed_rakat integer default 0,
  p_fard_reason text default null,
  p_performed_at timestamptz default null,
  p_note text default null,
  p_components jsonb default '[]'::jsonb
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_log uuid;
  v_rakats integer;
  v_item jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_prayer_name not in ('fajr','dhuhr','asr','maghrib','isha') then raise exception 'invalid prayer'; end if;
  if p_fard_method not in ('jamaat','individual','missed') then raise exception 'invalid fard method'; end if;
  if p_missed_rakat < 0 or p_missed_rakat > 3 then raise exception 'invalid missed rakats'; end if;
  if jsonb_typeof(p_components) <> 'array' or jsonb_array_length(p_components) > 4 then raise exception 'invalid prayer components'; end if;

  insert into public.prayer_logs(user_id, journal_date, prayer_name, fard_method, jamaat_result, missed_rakat, fard_reason, performed_at, note)
  values (v_user, p_journal_date, p_prayer_name, p_fard_method, p_jamaat_result, p_missed_rakat, nullif(p_fard_reason,''), p_performed_at, nullif(p_note,''))
  on conflict (user_id, journal_date, prayer_name) do update set
    fard_method = excluded.fard_method, jamaat_result = excluded.jamaat_result,
    missed_rakat = excluded.missed_rakat, fard_reason = excluded.fard_reason,
    performed_at = excluded.performed_at, note = excluded.note, updated_at = now()
  returning id into v_log;

  delete from public.prayer_components where prayer_log_id = v_log and user_id = v_user;
  for v_item in select value from jsonb_array_elements(p_components) loop
    if coalesce(v_item->>'component_key','') not in ('fajr_sunnah','dhuhr_before','dhuhr_after','asr_before','maghrib_after','isha_after','isha_witr') then
      raise exception 'invalid component key';
    end if;
    insert into public.prayer_components(user_id, prayer_log_id, component_key, component_name, rakats, performed, omission_reason)
    values (v_user, v_log, v_item->>'component_key', left(coalesce(v_item->>'component_name','অংশ'),100),
      greatest(1, least(4, coalesce((v_item->>'rakats')::integer,1))), coalesce((v_item->>'performed')::boolean,false), nullif(v_item->>'omission_reason',''));
  end loop;

  if p_fard_method = 'missed' or p_missed_rakat > 0 then
    v_rakats := case p_fard_method
      when 'missed' then case p_prayer_name when 'fajr' then 2 when 'maghrib' then 3 else 4 end
      else greatest(0, least(3, p_missed_rakat))
    end;
    insert into public.qada_obligations(user_id, prayer_log_id, prayer_name, missed_on, rakats, reason, status)
    values (v_user, v_log, p_prayer_name, p_journal_date, greatest(1,least(20,v_rakats)), nullif(p_fard_reason,''), 'pending')
    on conflict (user_id, prayer_name, missed_on) where status = 'pending' do nothing;
  end if;
  return v_log;
end;
$$;

-- One bounded JSON RPC supplies the Nafs Mirror without many round trips.
create or replace function public.get_nafs_report_dataset(p_from date, p_to date, p_takbir_from date)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then raise exception 'invalid report range'; end if;
  return jsonb_build_object(
    'goals', coalesce((select jsonb_agg(to_jsonb(g)) from public.learning_goals g where g.user_id=v_user), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(to_jsonb(t)) from public.learning_goal_tasks t where t.user_id=v_user), '[]'::jsonb),
    'prayers', coalesce((select jsonb_agg(to_jsonb(p)) from public.prayer_logs p where p.user_id=v_user and p.journal_date between p_from and p_to), '[]'::jsonb),
    'components', coalesce((select jsonb_agg(to_jsonb(c)) from public.prayer_components c join public.prayer_logs p on p.id=c.prayer_log_id where c.user_id=v_user and p.journal_date between p_from and p_to), '[]'::jsonb),
    'fasts', coalesce((select jsonb_agg(to_jsonb(f)) from public.fasting_logs f where f.user_id=v_user and f.journal_date between p_from and p_to), '[]'::jsonb),
    'quran', coalesce((select jsonb_agg(to_jsonb(q)) from public.quran_reading_logs q where q.user_id=v_user and q.journal_date between p_from and p_to), '[]'::jsonb),
    'dhikr', coalesce((select jsonb_agg(to_jsonb(d)) from public.dhikr_logs d where d.user_id=v_user and d.journal_date between p_from and p_to), '[]'::jsonb),
    'deeds', coalesce((select jsonb_agg(to_jsonb(d)) from public.deed_logs d where d.user_id=v_user and d.journal_date between p_from and p_to), '[]'::jsonb),
    'journals', coalesce((select jsonb_agg(to_jsonb(j)) from public.daily_journals j where j.user_id=v_user and j.journal_date between p_from and p_to), '[]'::jsonb),
    'journey', (select to_jsonb(j) from public.self_purification_journeys j where j.user_id=v_user order by (j.status='active') desc, j.start_date desc limit 1),
    'obstacles', coalesce((select jsonb_agg(to_jsonb(o)) from public.journey_obstacles o where o.user_id=v_user and o.happened_on between p_from and p_to), '[]'::jsonb),
    'pendingQada', (select count(*) from public.qada_obligations q where q.user_id=v_user and q.status='pending'),
    'settledQada', (select count(*) from public.qada_settlements q where q.user_id=v_user),
    'takbirHistory', coalesce((select jsonb_agg(to_jsonb(p)) from public.prayer_logs p where p.user_id=v_user and p.journal_date between p_takbir_from and p_to), '[]'::jsonb)
  );
end;
$$;

-- Empty-account-only restore for the relational legacy backup format.
create or replace function public.restore_personal_backup(p_backup jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_section text;
  v_table text;
  v_row jsonb;
  v_data jsonb := p_backup->'data';
  v_count integer := 0;
  v_map text[][] := array[
    array['journeys','self_purification_journeys'], array['obstacle_templates','obstacle_templates'],
    array['journey_obstacles','journey_obstacles'], array['goals','learning_goals'], array['goal_tasks','learning_goal_tasks'],
    array['prayer_logs','prayer_logs'], array['prayer_components','prayer_components'], array['qada_obligations','qada_obligations'],
    array['qada_settlements','qada_settlements'], array['fasting_templates','fasting_templates'], array['fasting_logs','fasting_logs'],
    array['quran_reading_logs','quran_reading_logs'], array['dhikr_templates','dhikr_templates'], array['dhikr_logs','dhikr_logs'],
    array['deed_templates','deed_templates'], array['deed_logs','deed_logs'], array['daily_journals','daily_journals'], array['notifications','notifications']
  ];
  i integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_backup->>'format' <> 'amar-nfser-hisab' or (p_backup->>'version')::integer <> 1 or jsonb_typeof(v_data) <> 'object' then raise exception 'invalid backup'; end if;
  if exists(select 1 from public.notifications where user_id=v_user)
    or exists(select 1 from public.self_purification_journeys where user_id=v_user)
    or exists(select 1 from public.obstacle_templates where user_id=v_user)
    or exists(select 1 from public.journey_obstacles where user_id=v_user)
    or exists(select 1 from public.learning_goals where user_id=v_user)
    or exists(select 1 from public.learning_goal_tasks where user_id=v_user)
    or exists(select 1 from public.prayer_logs where user_id=v_user)
    or exists(select 1 from public.prayer_components where user_id=v_user)
    or exists(select 1 from public.qada_obligations where user_id=v_user)
    or exists(select 1 from public.qada_settlements where user_id=v_user)
    or exists(select 1 from public.fasting_templates where user_id=v_user)
    or exists(select 1 from public.fasting_logs where user_id=v_user)
    or exists(select 1 from public.quran_reading_logs where user_id=v_user)
    or exists(select 1 from public.dhikr_templates where user_id=v_user)
    or exists(select 1 from public.dhikr_logs where user_id=v_user)
    or exists(select 1 from public.deed_templates where user_id=v_user)
    or exists(select 1 from public.deed_logs where user_id=v_user)
    or exists(select 1 from public.daily_journals where user_id=v_user) then
    raise exception 'empty journal account required';
  end if;

  if jsonb_typeof(v_data->'profile')='object' then
    insert into public.profiles(id, display_name, phone) values(v_user, nullif(v_data->'profile'->>'display_name',''), nullif(v_data->'profile'->>'phone',''))
    on conflict (id) do update set display_name=excluded.display_name, phone=excluded.phone;
  end if;
  if jsonb_typeof(v_data->'preferences')='object' then
    insert into public.user_preferences(user_id, language, theme, time_zone, maghrib_time, maghrib_day_rollover, hijri_adjustment_days, asr_school, jamaat_reminder_minutes, sleep_reminder_enabled, sleep_time, prayer_city_label, prayer_latitude, prayer_longitude)
    values(v_user, coalesce(v_data->'preferences'->>'language','bn'), coalesce(v_data->'preferences'->>'theme','light'), coalesce(v_data->'preferences'->>'time_zone','Asia/Dhaka'), nullif(v_data->'preferences'->>'maghrib_time','')::time, coalesce((v_data->'preferences'->>'maghrib_day_rollover')::boolean,true), coalesce((v_data->'preferences'->>'hijri_adjustment_days')::smallint,0), coalesce(v_data->'preferences'->>'asr_school','hanafi'), coalesce((v_data->'preferences'->>'jamaat_reminder_minutes')::smallint,10), coalesce((v_data->'preferences'->>'sleep_reminder_enabled')::boolean,false), coalesce(nullif(v_data->'preferences'->>'sleep_time','')::time,'22:30'), nullif(v_data->'preferences'->>'prayer_city_label',''), nullif(v_data->'preferences'->>'prayer_latitude','')::double precision, nullif(v_data->'preferences'->>'prayer_longitude','')::double precision)
    on conflict (user_id) do update set time_zone=excluded.time_zone, maghrib_time=excluded.maghrib_time, maghrib_day_rollover=excluded.maghrib_day_rollover, hijri_adjustment_days=excluded.hijri_adjustment_days;
  end if;

  for i in 1..array_length(v_map,1) loop
    v_section := v_map[i][1]; v_table := v_map[i][2];
    if v_data ? v_section then
      if jsonb_typeof(v_data->v_section) <> 'array' then raise exception 'invalid backup section'; end if;
      for v_row in select value from jsonb_array_elements(v_data->v_section) loop
        execute format('insert into public.%I select (jsonb_populate_record(null::public.%I, $1 || jsonb_build_object(''user_id'', $2))).*', v_table, v_table)
          using v_row, v_user;
        v_count := v_count + 1;
      end loop;
    end if;
  end loop;
  return jsonb_build_object('restoredRows', v_count, 'restoredAt', now());
end;
$$;

-- Login throttle RPCs: caller is the server service_role, never the browser.
create or replace function public.check_login_throttle(p_email_hash text, p_ip_hash text)
returns table(is_blocked boolean, retry_after_seconds integer)
language sql security definer set search_path = public as $$
  with candidates as (
    select blocked_until from public.login_attempt_buckets
    where (bucket_kind='email' and bucket_hash=p_email_hash) or (bucket_kind='ip' and bucket_hash=p_ip_hash)
  )
  select coalesce(bool_or(blocked_until > now()), false),
         coalesce(max(greatest(0, ceil(extract(epoch from (blocked_until-now())))::integer)),0)
  from candidates;
$$;

create or replace function public.record_login_failure(p_email_hash text, p_ip_hash text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_email_count integer; v_ip_count integer; v_retry integer := 0;
begin
  insert into public.login_attempt_buckets(bucket_hash,bucket_kind,failure_count,window_started_at,blocked_until)
  values(p_email_hash,'email',1,now(),null)
  on conflict(bucket_hash) do update set
    failure_count = case when public.login_attempt_buckets.window_started_at < now()-interval '15 minutes' then 1 else public.login_attempt_buckets.failure_count+1 end,
    window_started_at = case when public.login_attempt_buckets.window_started_at < now()-interval '15 minutes' then now() else public.login_attempt_buckets.window_started_at end,
    blocked_until = case when (case when public.login_attempt_buckets.window_started_at < now()-interval '15 minutes' then 1 else public.login_attempt_buckets.failure_count+1 end) >= 2 then now()+interval '15 minutes' else null end,
    updated_at=now();
  select failure_count into v_email_count from public.login_attempt_buckets where bucket_hash=p_email_hash;

  insert into public.login_attempt_buckets(bucket_hash,bucket_kind,failure_count,window_started_at,blocked_until)
  values(p_ip_hash,'ip',1,now(),null)
  on conflict(bucket_hash) do update set
    failure_count = case when public.login_attempt_buckets.window_started_at < now()-interval '15 minutes' then 1 else public.login_attempt_buckets.failure_count+1 end,
    window_started_at = case when public.login_attempt_buckets.window_started_at < now()-interval '15 minutes' then now() else public.login_attempt_buckets.window_started_at end,
    blocked_until = case when (case when public.login_attempt_buckets.window_started_at < now()-interval '15 minutes' then 1 else public.login_attempt_buckets.failure_count+1 end) >= 20 then now()+interval '15 minutes' else null end,
    updated_at=now();
  select failure_count into v_ip_count from public.login_attempt_buckets where bucket_hash=p_ip_hash;
  if v_email_count >= 2 then v_retry := 900; end if;
  if v_ip_count >= 20 then v_retry := greatest(v_retry,900); end if;
  return v_retry;
end;
$$;

create or replace function public.clear_login_email_throttle(p_email_hash text)
returns void language sql security definer set search_path = public as $$
  delete from public.login_attempt_buckets where bucket_hash=p_email_hash and bucket_kind='email';
$$;

revoke all on function public.check_login_throttle(text,text) from public, anon, authenticated;
revoke all on function public.record_login_failure(text,text) from public, anon, authenticated;
revoke all on function public.clear_login_email_throttle(text) from public, anon, authenticated;
grant execute on function public.check_login_throttle(text,text) to service_role;
grant execute on function public.record_login_failure(text,text) to service_role;
grant execute on function public.clear_login_email_throttle(text) to service_role;

grant execute on function public.save_prayer_entry(text,date,text,text,integer,text,timestamptz,text,jsonb) to authenticated;
grant execute on function public.get_nafs_report_dataset(date,date,date) to authenticated;
grant execute on function public.restore_personal_backup(jsonb) to authenticated;

grant select, insert, update, delete on public.profiles, public.user_preferences, public.user_workspace_snapshots,
  public.self_purification_journeys, public.obstacle_templates, public.journey_obstacles, public.learning_goals,
  public.learning_goal_tasks, public.prayer_logs, public.prayer_components, public.qada_obligations,
  public.fasting_templates, public.fasting_logs, public.quran_reading_logs,
  public.dhikr_templates, public.dhikr_logs, public.deed_templates, public.deed_logs, public.daily_journals,
  public.journal_attachments, public.notifications to authenticated;
grant select, insert on public.qada_settlements to authenticated;
revoke update, delete on public.qada_settlements from authenticated;

grant usage, select on all sequences in schema public to authenticated;

create or replace function public.save_user_workspace_snapshot(
  p_payload jsonb,
  p_expected_updated_at timestamptz
)
returns table(updated_at timestamptz, payload_bytes integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_current_updated_at timestamptz;
  v_saved_at timestamptz := clock_timestamp();
  v_bytes integer;
  v_required text[] := array[
    'goals','records','prayerDays','notes','prayerEntries','qadaEntries','quranEntries',
    'extraPrayerEntries','dhikrTemplates','dhikrSessions','fastingEntries','deedEntries',
    'avoidEntries','duaItems','studyEntries','habitDefinitions','habitLogs','reflections',
    'journeys','journeyMilestones','journeyObservations','deadlinePlans','prayerTimesCache','reminderEvents'
  ];
  v_key text;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or coalesce((p_payload->>'schemaVersion')::integer, 0) <> 3 then
    raise exception 'invalid workspace payload' using errcode = '22023';
  end if;

  foreach v_key in array v_required loop
    if jsonb_typeof(p_payload->v_key) is distinct from 'array' then
      raise exception 'workspace array missing: %', v_key using errcode = '22023';
    end if;
  end loop;

  if jsonb_typeof(p_payload->'preferences') is distinct from 'object'
    or jsonb_typeof(p_payload->'prayerConfig') is distinct from 'object'
    or jsonb_typeof(p_payload->'prayerPreferences') is distinct from 'object'
    or coalesce(p_payload->>'updatedAt','') = '' then
    raise exception 'workspace object missing' using errcode = '22023';
  end if;

  -- Recompute size from the actual JSONB value. Never trust a client-provided byte count.
  v_bytes := octet_length(p_payload::text);
  if v_bytes < 2 or v_bytes > 5242880 then
    raise exception 'workspace payload size out of range' using errcode = '22023';
  end if;

  -- Serialize the first insert as well as updates. A row lock alone cannot
  -- protect the no-row-yet case for two simultaneous first writes.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select s.updated_at
    into v_current_updated_at
    from public.user_workspace_snapshots s
    where s.user_id = v_user
    for update;

  if found then
    if v_current_updated_at is distinct from p_expected_updated_at then
      raise exception 'WORKSPACE_VERSION_CONFLICT' using errcode = '40001';
    end if;

    update public.user_workspace_snapshots s
      set schema_version = 3,
          payload = p_payload,
          payload_bytes = v_bytes,
          updated_at = v_saved_at
      where s.user_id = v_user;
  else
    if p_expected_updated_at is not null then
      raise exception 'WORKSPACE_VERSION_CONFLICT' using errcode = '40001';
    end if;

    insert into public.user_workspace_snapshots(user_id, schema_version, payload, payload_bytes, updated_at)
      values (v_user, 3, p_payload, v_bytes, v_saved_at);
  end if;

  return query
    select s.updated_at, s.payload_bytes
    from public.user_workspace_snapshots s
    where s.user_id = v_user;
end;
$$;

revoke all on function public.save_user_workspace_snapshot(jsonb,timestamptz) from public, anon;
grant execute on function public.save_user_workspace_snapshot(jsonb,timestamptz) to authenticated;


-- Updated-at triggers.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','user_preferences','learning_goals','learning_goal_tasks','prayer_logs','fasting_logs','daily_journals'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

-- Private journal image bucket, capped at 100 KiB in the API and private by default.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('journal-private','journal-private',false,102400,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=102400, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "journal private owner read" on storage.objects;
create policy "journal private owner read" on storage.objects for select to authenticated using (bucket_id='journal-private' and owner_id=auth.uid()::text);
drop policy if exists "journal private owner insert" on storage.objects;
create policy "journal private owner insert" on storage.objects for insert to authenticated with check (bucket_id='journal-private' and owner_id=auth.uid()::text);
drop policy if exists "journal private owner delete" on storage.objects;
create policy "journal private owner delete" on storage.objects for delete to authenticated using (bucket_id='journal-private' and owner_id=auth.uid()::text);


-- Release 1.2 relational workspace migration (also shipped separately for existing databases).
-- Release 1.2: move the active workspace from one JSON snapshot to
-- owner-scoped, table-per-collection records. The old snapshot table is kept
-- as a read-only migration source; this application no longer reads or writes it.

create table if not exists public.workspace_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists public.workspace_user_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null default 'primary' check (id = 'primary'),
  record jsonb not null default '{}'::jsonb check (jsonb_typeof(record) = 'object'),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

-- Each tracker collection has its own table. `record` preserves the full
-- typed client record while record_date supports efficient date filtering.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'workspace_legacy_goals','workspace_legacy_records','workspace_prayer_days','workspace_notes',
    'workspace_prayer_entries','workspace_qada_entries','workspace_quran_entries','workspace_extra_prayer_entries',
    'workspace_dhikr_templates','workspace_dhikr_sessions','workspace_fasting_entries','workspace_deed_entries',
    'workspace_avoid_entries','workspace_dua_items','workspace_study_entries','workspace_habit_definitions',
    'workspace_habit_logs','workspace_reflections','workspace_journeys','workspace_journey_milestones',
    'workspace_journey_observations','workspace_deadline_plans','workspace_deadline_tasks',
    'workspace_prayer_times_cache','workspace_reminder_events'
  ];
begin
  foreach v_table in array v_tables loop
    execute format(
      'create table if not exists public.%I (
        user_id uuid not null references auth.users(id) on delete cascade,
        id text not null check (length(id) between 1 and 160),
        record_date date,
        record jsonb not null check (jsonb_typeof(record) = ''object''),
        created_at timestamptz not null default clock_timestamp(),
        updated_at timestamptz not null default clock_timestamp(),
        primary key (user_id, id)
      )', v_table
    );
    execute format('create index if not exists %I on public.%I (user_id, record_date desc)', v_table || '_user_date_idx', v_table);
    execute format('alter table public.%I enable row level security', v_table);
    execute format('drop policy if exists %I on public.%I', v_table || '_owner_all', v_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      v_table || '_owner_all', v_table
    );
    execute format('grant select, insert, update, delete on table public.%I to authenticated', v_table);
  end loop;
end $$;

alter table public.workspace_sync_state enable row level security;
drop policy if exists workspace_sync_state_owner_all on public.workspace_sync_state;
create policy workspace_sync_state_owner_all on public.workspace_sync_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on table public.workspace_sync_state to authenticated;

alter table public.workspace_user_settings enable row level security;
drop policy if exists workspace_user_settings_owner_all on public.workspace_user_settings;
create policy workspace_user_settings_owner_all on public.workspace_user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on table public.workspace_user_settings to authenticated;

comment on table public.workspace_sync_state is 'Only a per-user revision clock. No tracker payload is stored here.';
comment on table public.workspace_user_settings is 'Per-user display, prayer and tracker settings.';

create or replace function public.load_relational_workspace()
returns table(payload jsonb, updated_at timestamptz)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_settings jsonb := '{}'::jsonb;
  v_updated timestamptz;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select s.updated_at into v_updated
  from public.workspace_sync_state s where s.user_id = v_user;
  select s.record into v_settings
  from public.workspace_user_settings s where s.user_id = v_user and s.id = 'primary';

  return query select jsonb_build_object(
    'schemaVersion', 3,
    'updatedAt', coalesce(v_updated, '1970-01-01T00:00:00Z'::timestamptz)::text,
    'goals', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_legacy_goals r where r.user_id = v_user), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_legacy_records r where r.user_id = v_user), '[]'::jsonb),
    'prayerDays', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last) from public.workspace_prayer_days r where r.user_id = v_user), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last) from public.workspace_notes r where r.user_id = v_user), '[]'::jsonb),
    'prayerEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_prayer_entries r where r.user_id = v_user), '[]'::jsonb),
    'qadaEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_qada_entries r where r.user_id = v_user), '[]'::jsonb),
    'quranEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_quran_entries r where r.user_id = v_user), '[]'::jsonb),
    'extraPrayerEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_extra_prayer_entries r where r.user_id = v_user), '[]'::jsonb),
    'dhikrTemplates', coalesce((select jsonb_agg(r.record order by r.created_at asc) from public.workspace_dhikr_templates r where r.user_id = v_user), '[]'::jsonb),
    'dhikrSessions', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_dhikr_sessions r where r.user_id = v_user), '[]'::jsonb),
    'fastingEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_fasting_entries r where r.user_id = v_user), '[]'::jsonb),
    'deedEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_deed_entries r where r.user_id = v_user), '[]'::jsonb),
    'avoidEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_avoid_entries r where r.user_id = v_user), '[]'::jsonb),
    'duaItems', coalesce((select jsonb_agg(r.record order by r.created_at desc) from public.workspace_dua_items r where r.user_id = v_user), '[]'::jsonb),
    'studyEntries', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_study_entries r where r.user_id = v_user), '[]'::jsonb),
    'habitDefinitions', coalesce((select jsonb_agg(r.record order by r.created_at asc) from public.workspace_habit_definitions r where r.user_id = v_user), '[]'::jsonb),
    'habitLogs', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_habit_logs r where r.user_id = v_user), '[]'::jsonb),
    'reflections', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_reflections r where r.user_id = v_user), '[]'::jsonb),
    'journeys', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_journeys r where r.user_id = v_user), '[]'::jsonb),
    'journeyMilestones', coalesce((select jsonb_agg(r.record order by (r.record->>'stageNumber')::integer) from public.workspace_journey_milestones r where r.user_id = v_user), '[]'::jsonb),
    'journeyObservations', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last, r.created_at desc) from public.workspace_journey_observations r where r.user_id = v_user), '[]'::jsonb),
    'deadlinePlans', coalesce((
      select jsonb_agg(
        p.record || jsonb_build_object('tasks', coalesce((
          select jsonb_agg(t.record - 'planId' order by t.record_date asc nulls last, t.created_at asc)
          from public.workspace_deadline_tasks t
          where t.user_id = p.user_id and t.record->>'planId' = p.id
        ), '[]'::jsonb))
        order by p.record_date asc nulls last, p.created_at asc
      ) from public.workspace_deadline_plans p where p.user_id = v_user
    ), '[]'::jsonb),
    'prayerTimesCache', coalesce((select jsonb_agg(r.record order by r.record_date desc nulls last) from public.workspace_prayer_times_cache r where r.user_id = v_user), '[]'::jsonb),
    'reminderEvents', coalesce((select jsonb_agg(r.record order by r.created_at desc) from public.workspace_reminder_events r where r.user_id = v_user), '[]'::jsonb),
    'preferences', coalesce(v_settings->'preferences', '{}'::jsonb),
    'prayerConfig', coalesce(v_settings->'prayerConfig', '{}'::jsonb),
    'prayerPreferences', coalesce(v_settings->'prayerPreferences', '{}'::jsonb)
  ), v_updated;
end;
$$;

revoke all on function public.load_relational_workspace() from public, anon;
grant execute on function public.load_relational_workspace() to authenticated;

create or replace function public.save_relational_workspace_changes(
  p_changes jsonb,
  p_expected_updated_at timestamptz default null
)
returns table(updated_at timestamptz, saved_rows integer)
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_current timestamptz;
  v_now timestamptz;
  v_collection record;
  v_item jsonb;
  v_upserts jsonb;
  v_deletes jsonb;
  v_id text;
  v_date_text text;
  v_date date;
  v_record jsonb;
  v_count integer := 0;
  v_bytes integer;
  v_settings jsonb;
begin  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then raise exception 'INVALID_CHANGES' using errcode = '22023'; end if;
  v_bytes := octet_length(p_changes::text);
  if v_bytes > 5242880 then raise exception 'WORKSPACE_TOO_LARGE' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select s.updated_at into v_current from public.workspace_sync_state s where s.user_id = v_user for update;
  if (v_current is null and p_expected_updated_at is not null)
     or (v_current is not null and p_expected_updated_at is null)
     or (v_current is not null and v_current <> p_expected_updated_at) then
    raise exception 'WORKSPACE_VERSION_CONFLICT' using errcode = '40001';
  end if;

  if jsonb_typeof(p_changes->'collections') = 'object' then
    for v_collection in select * from (values
      ('goals','workspace_legacy_goals','deadline'),('records','workspace_legacy_records','date'),
      ('prayerDays','workspace_prayer_days','date'),('notes','workspace_notes','date'),
      ('prayerEntries','workspace_prayer_entries','date'),('qadaEntries','workspace_qada_entries','missedDate'),
      ('quranEntries','workspace_quran_entries','date'),('extraPrayerEntries','workspace_extra_prayer_entries','date'),
      ('dhikrTemplates','workspace_dhikr_templates',''),('dhikrSessions','workspace_dhikr_sessions','date'),
      ('fastingEntries','workspace_fasting_entries','date'),('deedEntries','workspace_deed_entries','date'),
      ('avoidEntries','workspace_avoid_entries','date'),('duaItems','workspace_dua_items',''),
      ('studyEntries','workspace_study_entries','date'),('habitDefinitions','workspace_habit_definitions',''),
      ('habitLogs','workspace_habit_logs','date'),('reflections','workspace_reflections','date'),
      ('journeys','workspace_journeys','startDate'),('journeyMilestones','workspace_journey_milestones','completedAt'),
      ('journeyObservations','workspace_journey_observations','date'),('deadlinePlans','workspace_deadline_plans','startDate'),
      ('deadlineTasks','workspace_deadline_tasks','dueDate'),('prayerTimesCache','workspace_prayer_times_cache','date'),
      ('reminderEvents','workspace_reminder_events','date')
    ) as m(collection_key,table_name,date_key) loop
      v_upserts := coalesce(p_changes->'collections'->v_collection.collection_key->'upserts', '[]'::jsonb);
      v_deletes := coalesce(p_changes->'collections'->v_collection.collection_key->'deletes', '[]'::jsonb);
      if jsonb_typeof(v_upserts) <> 'array' or jsonb_typeof(v_deletes) <> 'array' then
        raise exception 'INVALID_COLLECTION_DELTA' using errcode = '22023';
      end if;
      for v_item in select value from jsonb_array_elements(v_upserts) loop
        v_id := nullif(v_item->>'id','');
        v_record := v_item->'record';
        if v_id is null or length(v_id) > 160 or jsonb_typeof(v_record) <> 'object' then
          raise exception 'INVALID_RECORD' using errcode = '22023';
        end if;
        if v_collection.collection_key = 'deadlinePlans' then v_record := v_record - 'tasks'; end if;
        v_date_text := nullif(v_record->>v_collection.date_key, '');
        v_date := null;
        if v_date_text is not null then
          if v_date_text !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_RECORD_DATE' using errcode = '22023'; end if;
          v_date := v_date_text::date;
        end if;
        execute format(
          'insert into public.%I (user_id,id,record_date,record,created_at,updated_at) values ($1,$2,$3,$4,coalesce(nullif($4->>''createdAt'','''')::timestamptz, clock_timestamp()),clock_timestamp()) on conflict (user_id,id) do update set record_date=excluded.record_date, record=excluded.record, updated_at=clock_timestamp()',
          v_collection.table_name
        ) using v_user, v_id, v_date, v_record;
        v_count := v_count + 1;
      end loop;
      if jsonb_array_length(v_deletes) > 0 then
        execute format('delete from public.%I where user_id=$1 and id = any($2)', v_collection.table_name)
        using v_user, (select array_agg(value) from jsonb_array_elements_text(v_deletes));
      end if;
    end loop;
  end if;

  v_settings := p_changes->'settings';
  if v_settings is not null then
    if jsonb_typeof(v_settings) <> 'object' then raise exception 'INVALID_SETTINGS' using errcode = '22023'; end if;
    insert into public.workspace_user_settings(user_id,id,record,updated_at)
      values (v_user,'primary',v_settings,clock_timestamp())
      on conflict (user_id,id) do update set record=excluded.record, updated_at=clock_timestamp();
  end if;

  v_now := clock_timestamp();
  insert into public.workspace_sync_state(user_id,updated_at) values (v_user,v_now)
    on conflict (user_id) do update set updated_at=excluded.updated_at;
  return query select v_now, v_count;
end;
$$;

revoke all on function public.save_relational_workspace_changes(jsonb,timestamptz) from public, anon;
grant execute on function public.save_relational_workspace_changes(jsonb,timestamptz) to authenticated;

-- One-time safe migration from the old JSON snapshot table. The old table is
-- deliberately retained as an archive; after this migration, runtime reads
-- and writes use only the relational tables above.
do $$
declare
  v_snapshot record;
  v_map record;
  v_row jsonb;
  v_id text;
  v_date_text text;
  v_date date;
  v_record jsonb;
  v_tasks jsonb;
  v_task jsonb;
begin
  if to_regclass('public.user_workspace_snapshots') is null then return; end if;
  for v_snapshot in execute 'select user_id,payload,updated_at from public.user_workspace_snapshots' loop
    if v_snapshot.payload is null or jsonb_typeof(v_snapshot.payload) <> 'object' then continue; end if;
    for v_map in select * from (values
      ('goals','workspace_legacy_goals','deadline'),('records','workspace_legacy_records','date'),
      ('prayerDays','workspace_prayer_days','date'),('notes','workspace_notes','date'),
      ('prayerEntries','workspace_prayer_entries','date'),('qadaEntries','workspace_qada_entries','missedDate'),
      ('quranEntries','workspace_quran_entries','date'),('extraPrayerEntries','workspace_extra_prayer_entries','date'),
      ('dhikrTemplates','workspace_dhikr_templates',''),('dhikrSessions','workspace_dhikr_sessions','date'),
      ('fastingEntries','workspace_fasting_entries','date'),('deedEntries','workspace_deed_entries','date'),
      ('avoidEntries','workspace_avoid_entries','date'),('duaItems','workspace_dua_items',''),
      ('studyEntries','workspace_study_entries','date'),('habitDefinitions','workspace_habit_definitions',''),
      ('habitLogs','workspace_habit_logs','date'),('reflections','workspace_reflections','date'),
      ('journeys','workspace_journeys','startDate'),('journeyMilestones','workspace_journey_milestones','completedAt'),
      ('journeyObservations','workspace_journey_observations','date'),('deadlinePlans','workspace_deadline_plans','startDate'),
      ('prayerTimesCache','workspace_prayer_times_cache','date'),('reminderEvents','workspace_reminder_events','date')
    ) as m(collection_key,table_name,date_key) loop
      if jsonb_typeof(v_snapshot.payload->v_map.collection_key) <> 'array' then continue; end if;
      for v_row in select value from jsonb_array_elements(v_snapshot.payload->v_map.collection_key) loop
        v_record := v_row;
        if v_map.collection_key = 'deadlinePlans' then
          v_tasks := coalesce(v_row->'tasks','[]'::jsonb);
          v_record := v_row - 'tasks';
        else
          v_tasks := '[]'::jsonb;
        end if;
        v_id := coalesce(nullif(v_record->>'id',''), nullif(v_record->>'date',''),
          case when v_map.collection_key = 'prayerTimesCache' then coalesce(v_record->>'date','') || ':' || coalesce(v_record->>'latitude','') || ':' || coalesce(v_record->>'longitude','') end,
          'legacy-' || substr(md5(v_record::text),1,32));
        v_date_text := nullif(v_record->>v_map.date_key,'');
        v_date := null;
        if v_date_text is not null and v_date_text ~ '^\d{4}-\d{2}-\d{2}$' then v_date := v_date_text::date; end if;
        execute format(
          'insert into public.%I(user_id,id,record_date,record,created_at,updated_at) values($1,$2,$3,$4,coalesce(nullif($4->>''createdAt'','''')::timestamptz,$5),$5) on conflict(user_id,id) do nothing',
          v_map.table_name
        ) using v_snapshot.user_id, v_id, v_date, v_record, v_snapshot.updated_at;
        if v_map.collection_key = 'deadlinePlans' and jsonb_typeof(v_tasks) = 'array' then
          for v_task in select value from jsonb_array_elements(v_tasks) loop
            v_id := coalesce(nullif(v_task->>'id',''), 'legacy-task-' || substr(md5(v_task::text),1,32));
            v_record := v_task || jsonb_build_object('planId', coalesce(v_row->>'id',''));
            v_date_text := nullif(v_task->>'dueDate','');
            v_date := case when v_date_text ~ '^\d{4}-\d{2}-\d{2}$' then v_date_text::date else null end;
            insert into public.workspace_deadline_tasks(user_id,id,record_date,record,created_at,updated_at)
              values(v_snapshot.user_id,v_id,v_date,v_record,coalesce(nullif(v_task->>'createdAt','')::timestamptz,v_snapshot.updated_at),v_snapshot.updated_at)
              on conflict(user_id,id) do nothing;
          end loop;
        end if;
      end loop;
    end loop;
    insert into public.workspace_user_settings(user_id,id,record,updated_at)
      values(v_snapshot.user_id,'primary',jsonb_build_object(
        'preferences',coalesce(v_snapshot.payload->'preferences','{}'::jsonb),
        'prayerConfig',coalesce(v_snapshot.payload->'prayerConfig','{}'::jsonb),
        'prayerPreferences',coalesce(v_snapshot.payload->'prayerPreferences','{}'::jsonb)
      ),v_snapshot.updated_at)
      on conflict(user_id,id) do nothing;
    insert into public.workspace_sync_state(user_id,updated_at) values(v_snapshot.user_id,v_snapshot.updated_at)
      on conflict(user_id) do update set updated_at = greatest(public.workspace_sync_state.updated_at, excluded.updated_at);
  end loop;
end $$;

comment on table public.user_workspace_snapshots is 'Legacy snapshot archive. Release 1.2+ runtime uses workspace_* record tables.';
revoke insert, update, delete on table public.user_workspace_snapshots from authenticated;
revoke execute on function public.save_user_workspace_snapshot(jsonb, timestamptz) from public, anon, authenticated;

-- Enforce non-overlapping goal date ranges for future inserts and edits.
create or replace function public.prevent_workspace_goal_overlap()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_start date;
  v_end date;
  v_overlap boolean;
begin
  -- Serialize goal writes per owner so two simultaneous requests cannot both
  -- pass the overlap check before either transaction commits.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if nullif(new.record->>'startDate','') is null or nullif(new.record->>'deadline','') is null then
    return new;
  end if;
  v_start := (new.record->>'startDate')::date;
  v_end := (new.record->>'deadline')::date;
  if v_end < v_start then
    raise exception 'GOAL_DATE_RANGE_INVALID' using errcode = '22023';
  end if;
  select exists (
    select 1 from public.workspace_deadline_plans p
    where p.user_id = new.user_id and p.id <> new.id
      and nullif(p.record->>'startDate','') is not null
      and nullif(p.record->>'deadline','') is not null
      and daterange((p.record->>'startDate')::date, (p.record->>'deadline')::date, '[]')
          && daterange(v_start, v_end, '[]')
  ) into v_overlap;
  if v_overlap then
    raise exception 'GOAL_DATE_RANGE_OVERLAP' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_deadline_plans_no_overlap on public.workspace_deadline_plans;
create trigger workspace_deadline_plans_no_overlap
before insert or update on public.workspace_deadline_plans
for each row execute function public.prevent_workspace_goal_overlap();
revoke all on function public.prevent_workspace_goal_overlap() from public, anon, authenticated;

notify pgrst, 'reload schema';


commit;
