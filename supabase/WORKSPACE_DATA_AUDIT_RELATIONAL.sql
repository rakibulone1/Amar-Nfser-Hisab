-- Read-only audit for Release 1.2+.
-- Replace YOUR_LOGIN_EMAIL with the email used to sign in to the app.
-- Run after 002_relational_workspace.sql. This query never changes data.
with target_user as (
  select id, email from auth.users where lower(email) = lower('YOUR_LOGIN_EMAIL') limit 1
), archived as (
  select s.user_id, s.payload, s.updated_at
  from public.user_workspace_snapshots s
  join target_user u on u.id = s.user_id
), comparison as (
  select 'পুরোনো লক্ষ্য' as tracker, coalesce(jsonb_array_length(a.payload->'goals'),0)::bigint as old_snapshot_rows,
    (select count(*) from public.workspace_legacy_goals t where t.user_id = u.id)::bigint as online_rows
  from target_user u left join archived a on a.user_id = u.id
  union all select 'সাধারণ রেকর্ড', coalesce(jsonb_array_length(a.payload->'records'),0), (select count(*) from public.workspace_legacy_records t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'দৈনিক সালাতের সারাংশ', coalesce(jsonb_array_length(a.payload->'prayerDays'),0), (select count(*) from public.workspace_prayer_days t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'দৈনিক নোট', coalesce(jsonb_array_length(a.payload->'notes'),0), (select count(*) from public.workspace_notes t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'সালাত' as tracker, coalesce(jsonb_array_length(a.payload->'prayerEntries'),0)::bigint as old_snapshot_rows,
    (select count(*) from public.workspace_prayer_entries t where t.user_id = u.id)::bigint as online_rows
  from target_user u left join archived a on a.user_id = u.id
  union all select 'কাজা', coalesce(jsonb_array_length(a.payload->'qadaEntries'),0), (select count(*) from public.workspace_qada_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'কুরআন', coalesce(jsonb_array_length(a.payload->'quranEntries'),0), (select count(*) from public.workspace_quran_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'অতিরিক্ত সালাত', coalesce(jsonb_array_length(a.payload->'extraPrayerEntries'),0), (select count(*) from public.workspace_extra_prayer_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'জিকিরের তালিকা', coalesce(jsonb_array_length(a.payload->'dhikrTemplates'),0), (select count(*) from public.workspace_dhikr_templates t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'জিকির সেশন', coalesce(jsonb_array_length(a.payload->'dhikrSessions'),0), (select count(*) from public.workspace_dhikr_sessions t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'সিয়াম', coalesce(jsonb_array_length(a.payload->'fastingEntries'),0), (select count(*) from public.workspace_fasting_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'ভালো কাজ', coalesce(jsonb_array_length(a.payload->'deedEntries'),0), (select count(*) from public.workspace_deed_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'অভ্যাস নিয়ন্ত্রণ', coalesce(jsonb_array_length(a.payload->'avoidEntries'),0), (select count(*) from public.workspace_avoid_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'পুরোনো দোয়ার সংরক্ষণ', coalesce(jsonb_array_length(a.payload->'duaItems'),0), (select count(*) from public.workspace_dua_items t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'ইলম ও অধ্যয়ন', coalesce(jsonb_array_length(a.payload->'studyEntries'),0), (select count(*) from public.workspace_study_entries t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'অভ্যাসের সংজ্ঞা', coalesce(jsonb_array_length(a.payload->'habitDefinitions'),0), (select count(*) from public.workspace_habit_definitions t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'অভ্যাসের রেকর্ড', coalesce(jsonb_array_length(a.payload->'habitLogs'),0), (select count(*) from public.workspace_habit_logs t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'মুহাসাবা', coalesce(jsonb_array_length(a.payload->'reflections'),0), (select count(*) from public.workspace_reflections t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'যাত্রা', coalesce(jsonb_array_length(a.payload->'journeys'),0), (select count(*) from public.workspace_journeys t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'পর্যায়ের অর্জন', coalesce(jsonb_array_length(a.payload->'journeyMilestones'),0), (select count(*) from public.workspace_journey_milestones t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'অনুভূতির নোট', coalesce(jsonb_array_length(a.payload->'journeyObservations'),0), (select count(*) from public.workspace_journey_observations t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'সময়সীমার লক্ষ্য', coalesce(jsonb_array_length(a.payload->'deadlinePlans'),0), (select count(*) from public.workspace_deadline_plans t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'লক্ষ্যের কাজ', coalesce((select sum(jsonb_array_length(coalesce(item->'tasks','[]'::jsonb))) from jsonb_array_elements(coalesce(a.payload->'deadlinePlans','[]'::jsonb)) item),0), (select count(*) from public.workspace_deadline_tasks t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'সালাতের সময়সূচির ক্যাশ', coalesce(jsonb_array_length(a.payload->'prayerTimesCache'),0), (select count(*) from public.workspace_prayer_times_cache t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
  union all select 'স্মরণিকা', coalesce(jsonb_array_length(a.payload->'reminderEvents'),0), (select count(*) from public.workspace_reminder_events t where t.user_id = u.id) from target_user u left join archived a on a.user_id = u.id
)
select u.email, c.tracker, c.old_snapshot_rows, c.online_rows,
  case when c.online_rows >= c.old_snapshot_rows then 'পরিমাণ মিলে গেছে বা বেশি' else 'সংখ্যা কম — পর্যালোচনা দরকার' end as audit_status
from target_user u cross join comparison c
order by c.tracker;

-- Archive and settings metadata for the selected user.
with target_user as (select id, email from auth.users where lower(email) = lower('YOUR_LOGIN_EMAIL') limit 1)
select u.email,
  exists(select 1 from public.user_workspace_snapshots s where s.user_id = u.id) as legacy_snapshot_archived,
  (select s.updated_at from public.workspace_sync_state s where s.user_id = u.id) as relational_revision_at,
  (select s.updated_at from public.user_workspace_snapshots s where s.user_id = u.id) as archived_snapshot_updated_at,
  (select count(*) from public.workspace_user_settings s where s.user_id = u.id) as settings_rows
from target_user u;

-- Legacy normalized tables from pre-workspace releases. These are reported, not
-- auto-imported: automatic merging can duplicate records already present in the snapshot.
with target_user as (select id, email from auth.users where lower(email) = lower('YOUR_LOGIN_EMAIL') limit 1)
select u.email,
  (select count(*) from public.prayer_logs x where x.user_id = u.id) as legacy_prayer_logs,
  (select count(*) from public.prayer_components x where x.user_id = u.id) as legacy_prayer_components,
  (select count(*) from public.qada_obligations x where x.user_id = u.id) as legacy_qada_obligations,
  (select count(*) from public.qada_settlements x where x.user_id = u.id) as legacy_qada_settlements,
  (select count(*) from public.quran_reading_logs x where x.user_id = u.id) as legacy_quran_logs,
  (select count(*) from public.dhikr_logs x where x.user_id = u.id) as legacy_dhikr_logs,
  (select count(*) from public.fasting_logs x where x.user_id = u.id) as legacy_fasting_logs,
  (select count(*) from public.deed_logs x where x.user_id = u.id) as legacy_deed_logs,
  (select count(*) from public.daily_journals x where x.user_id = u.id) as legacy_journals,
  (select count(*) from public.learning_goals x where x.user_id = u.id) as legacy_learning_goals,
  (select count(*) from public.learning_goal_tasks x where x.user_id = u.id) as legacy_learning_tasks,
  (select count(*) from public.self_purification_journeys x where x.user_id = u.id) as legacy_journeys,
  (select count(*) from public.journey_obstacles x where x.user_id = u.id) as legacy_journey_obstacles
from target_user u;
