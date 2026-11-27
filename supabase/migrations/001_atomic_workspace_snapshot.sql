-- HISTORICAL MIGRATION — RETIRED IN RELEASE 1.2.5.
-- Keep this file only as migration history for old installations.
-- Do not run it for a new database or after migrations 002/003.
-- New databases must use supabase/MASTER_DATABASE_SETUP.sql only.

-- Amar Nfser Hisab · incremental workspace reliability migration
-- Run once AFTER the existing MASTER_DATABASE_SETUP.sql.
-- Adds no tables, extensions, background jobs or paid services.
-- It makes the existing JSONB workspace save atomic and race-safe.

begin;

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

commit;
