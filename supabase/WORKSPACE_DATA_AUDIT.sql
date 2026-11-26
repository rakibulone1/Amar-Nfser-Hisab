-- Amar Nfser Hisab · read-only online data audit
-- Replace YOUR_LOGIN_EMAIL with the email used to sign in to the app.
-- Run in Supabase SQL Editor. This query does not modify any data.
-- Legacy pre-1.2 audit only. After Release 1.2 Migration 002, use WORKSPACE_DATA_AUDIT_RELATIONAL.sql.
-- The old user_workspace_snapshots.payload is retained as a migration archive; it is no longer the runtime data store.
-- The normalized tables at the end belong to legacy/relational endpoints and may remain empty.

with target_user as (
  select id, email
  from auth.users
  where lower(email) = lower('YOUR_LOGIN_EMAIL')
  limit 1
)
select
  u.email,
  s.schema_version,
  s.payload_bytes,
  s.updated_at as last_cloud_save_at,
  (s.payload is not null) as has_workspace_snapshot,
  coalesce((
    select bool_and(coalesce(jsonb_typeof(s.payload->keys.key_name) = 'array', false))
    from unnest(array[
      'prayerEntries','qadaEntries','quranEntries','extraPrayerEntries','dhikrTemplates','dhikrSessions',
      'fastingEntries','deedEntries','avoidEntries','studyEntries','habitDefinitions','habitLogs','reflections',
      'journeys','journeyMilestones','journeyObservations','deadlinePlans','reminderEvents'
    ]) as keys(key_name)
  ), false) as tracker_arrays_valid,
  exists(select 1 from public.user_preferences p where p.user_id = u.id) as has_user_preferences,
  case when jsonb_typeof(s.payload->'prayerEntries') = 'array' then jsonb_array_length(s.payload->'prayerEntries') else 0 end as prayer_entries,
  case when jsonb_typeof(s.payload->'qadaEntries') = 'array' then jsonb_array_length(s.payload->'qadaEntries') else 0 end as qada_entries,
  case when jsonb_typeof(s.payload->'quranEntries') = 'array' then jsonb_array_length(s.payload->'quranEntries') else 0 end as quran_entries,
  case when jsonb_typeof(s.payload->'extraPrayerEntries') = 'array' then jsonb_array_length(s.payload->'extraPrayerEntries') else 0 end as extra_prayer_entries,
  case when jsonb_typeof(s.payload->'dhikrTemplates') = 'array' then jsonb_array_length(s.payload->'dhikrTemplates') else 0 end as dhikr_templates,
  case when jsonb_typeof(s.payload->'dhikrSessions') = 'array' then jsonb_array_length(s.payload->'dhikrSessions') else 0 end as dhikr_sessions,
  case when jsonb_typeof(s.payload->'fastingEntries') = 'array' then jsonb_array_length(s.payload->'fastingEntries') else 0 end as fasting_entries,
  case when jsonb_typeof(s.payload->'deedEntries') = 'array' then jsonb_array_length(s.payload->'deedEntries') else 0 end as good_deed_entries,
  case when jsonb_typeof(s.payload->'avoidEntries') = 'array' then jsonb_array_length(s.payload->'avoidEntries') else 0 end as avoid_entries,
  case when jsonb_typeof(s.payload->'studyEntries') = 'array' then jsonb_array_length(s.payload->'studyEntries') else 0 end as study_entries,
  case when jsonb_typeof(s.payload->'habitDefinitions') = 'array' then jsonb_array_length(s.payload->'habitDefinitions') else 0 end as habit_definitions,
  case when jsonb_typeof(s.payload->'habitLogs') = 'array' then jsonb_array_length(s.payload->'habitLogs') else 0 end as habit_logs,
  case when jsonb_typeof(s.payload->'reflections') = 'array' then jsonb_array_length(s.payload->'reflections') else 0 end as reflections,
  case when jsonb_typeof(s.payload->'journeys') = 'array' then jsonb_array_length(s.payload->'journeys') else 0 end as journeys,
  case when jsonb_typeof(s.payload->'journeyMilestones') = 'array' then jsonb_array_length(s.payload->'journeyMilestones') else 0 end as journey_milestones,
  case when jsonb_typeof(s.payload->'journeyObservations') = 'array' then jsonb_array_length(s.payload->'journeyObservations') else 0 end as journey_observations,
  case when jsonb_typeof(s.payload->'deadlinePlans') = 'array' then jsonb_array_length(s.payload->'deadlinePlans') else 0 end as deadline_plans,
  case when jsonb_typeof(s.payload->'reminderEvents') = 'array' then jsonb_array_length(s.payload->'reminderEvents') else 0 end as reminder_events,
  -- Legacy normalized table counts. These are not the active v1.x snapshot counters.
  (select count(*) from public.prayer_logs x where x.user_id = u.id) as legacy_prayer_log_rows,
  (select count(*) from public.prayer_components x where x.user_id = u.id) as legacy_prayer_component_rows,
  (select count(*) from public.qada_obligations x where x.user_id = u.id) as legacy_qada_rows,
  (select count(*) from public.qada_settlements x where x.user_id = u.id) as legacy_qada_settlement_rows,
  (select count(*) from public.quran_reading_logs x where x.user_id = u.id) as legacy_quran_rows,
  (select count(*) from public.dhikr_logs x where x.user_id = u.id) as legacy_dhikr_rows,
  (select count(*) from public.fasting_logs x where x.user_id = u.id) as legacy_fasting_rows,
  (select count(*) from public.deed_logs x where x.user_id = u.id) as legacy_deed_rows,
  (select count(*) from public.daily_journals x where x.user_id = u.id) as legacy_journal_rows,
  (select count(*) from public.learning_goals x where x.user_id = u.id) as legacy_learning_goal_rows,
  (select count(*) from public.self_purification_journeys x where x.user_id = u.id) as legacy_journey_rows
from target_user u
left join public.user_workspace_snapshots s on s.user_id = u.id;

-- Interpretation:
-- 1) Use this query only before 002 migration to inspect the legacy snapshot archive.
-- 2) After 002, compare the archive with WORKSPACE_DATA_AUDIT_RELATIONAL.sql.
-- 3) Do not infer current runtime storage from this legacy query after migration.
