begin;

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
