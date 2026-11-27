-- Amar Nfser Hisab Release 1.2.5 — relational workspace audit (read-only)
-- Replace YOUR_LOGIN_EMAIL with the signed-in account email.
-- Run in Supabase SQL Editor. This query does not modify any data.
with target_user as (
  select id, email from auth.users where lower(email) = lower('YOUR_LOGIN_EMAIL') limit 1
), counts as (
  select 'প্রোফাইল' as tracker, (select count(*) from public.profiles x where x.id = u.id)::bigint as rows from target_user u
  union all select 'ব্যবহারকারী সেটিংস', (select count(*) from public.user_preferences x where x.user_id = u.id) from target_user u
  union all select 'অনলাইন সিঙ্ক অবস্থা', (select count(*) from public.workspace_sync_state x where x.user_id = u.id) from target_user u
  union all select 'প্রার্থনা সেটিংস', (select count(*) from public.workspace_user_settings x where x.user_id = u.id) from target_user u
  union all select 'সালাত', (select count(*) from public.workspace_prayer_entries x where x.user_id = u.id) from target_user u
  union all select 'কাজা', (select count(*) from public.workspace_qada_entries x where x.user_id = u.id) from target_user u
  union all select 'কুরআন', (select count(*) from public.workspace_quran_entries x where x.user_id = u.id) from target_user u
  union all select 'অতিরিক্ত সালাত', (select count(*) from public.workspace_extra_prayer_entries x where x.user_id = u.id) from target_user u
  union all select 'জিকিরের তালিকা', (select count(*) from public.workspace_dhikr_templates x where x.user_id = u.id) from target_user u
  union all select 'জিকির সেশন', (select count(*) from public.workspace_dhikr_sessions x where x.user_id = u.id) from target_user u
  union all select 'সিয়াম', (select count(*) from public.workspace_fasting_entries x where x.user_id = u.id) from target_user u
  union all select 'ভালো কাজ', (select count(*) from public.workspace_deed_entries x where x.user_id = u.id) from target_user u
  union all select 'অভ্যাস নিয়ন্ত্রণ', (select count(*) from public.workspace_avoid_entries x where x.user_id = u.id) from target_user u
  union all select 'ইলম ও অধ্যয়ন', (select count(*) from public.workspace_study_entries x where x.user_id = u.id) from target_user u
  union all select 'অভ্যাসের সংজ্ঞা', (select count(*) from public.workspace_habit_definitions x where x.user_id = u.id) from target_user u
  union all select 'অভ্যাসের রেকর্ড', (select count(*) from public.workspace_habit_logs x where x.user_id = u.id) from target_user u
  union all select 'মুহাসাবা', (select count(*) from public.workspace_reflections x where x.user_id = u.id) from target_user u
  union all select 'আত্মশুদ্ধির যাত্রা', (select count(*) from public.workspace_journeys x where x.user_id = u.id) from target_user u
  union all select 'পর্যায়ের অর্জন', (select count(*) from public.workspace_journey_milestones x where x.user_id = u.id) from target_user u
  union all select 'পর্যায়ের পর্যবেক্ষণ', (select count(*) from public.workspace_journey_observations x where x.user_id = u.id) from target_user u
  union all select 'সময়সীমার লক্ষ্য', (select count(*) from public.workspace_deadline_plans x where x.user_id = u.id) from target_user u
  union all select 'লক্ষ্যের কাজ', (select count(*) from public.workspace_deadline_tasks x where x.user_id = u.id) from target_user u
  union all select 'সালাতের সময় ক্যাশ', (select count(*) from public.workspace_prayer_times_cache x where x.user_id = u.id) from target_user u
  union all select 'স্মরণিকা', (select count(*) from public.workspace_reminder_events x where x.user_id = u.id) from target_user u
  union all select 'ব্যক্তিগত ছবি', (select count(*) from public.journal_attachments x where x.user_id = u.id) from target_user u
)
select u.email, c.tracker, c.rows
from target_user u cross join counts c
order by c.tracker;
