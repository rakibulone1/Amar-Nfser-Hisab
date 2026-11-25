-- Amar Nfser Hisab · consolidated master schema
-- Run once in the Supabase SQL Editor for a new project.
-- This file consolidates the app's account, journal, tracker, goal, backup,
-- analytics, rate-limit and local-first workspace snapshot contracts.

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

-- Active Release 1.x front-end tracker domains sync through one versioned, RLS-protected JSONB row.
-- The authenticated app reads and writes this account-scoped snapshot through server routes.
-- The older normalized journal/analytics tables remain for compatibility with legacy endpoints;
-- empty legacy tables do not imply the active snapshot failed to save. Browser databases are
-- used only as read-only input for a one-time legacy migration.
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

commit;
