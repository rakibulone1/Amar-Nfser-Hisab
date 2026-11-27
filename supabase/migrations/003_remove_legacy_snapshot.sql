begin;

-- Release 1.2.5: permanently remove the retired JSON workspace snapshot.
-- The active relational workspace is preserved; only the obsolete duplicate
-- storage table and RPC are removed.

do $$
declare
  v_missing text;
begin
  if to_regclass('public.workspace_sync_state') is null
     or to_regclass('public.workspace_user_settings') is null
     or to_regprocedure('public.load_relational_workspace()') is null
     or to_regprocedure('public.save_relational_workspace_changes(jsonb,timestamptz)') is null then
    raise exception 'RELATIONAL_WORKSPACE_NOT_READY: apply Release 1.2.2 migration 002 before this cleanup';
  end if;

  -- Every durable account-owned relation must cascade from auth.users.
  select string_agg(t.relname, ', ' order by t.relname)
    into v_missing
  from pg_class t
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relkind = 'r'
    and (
      t.relname in (
        'profiles','user_preferences','self_purification_journeys','obstacle_templates',
        'journey_obstacles','learning_goals','learning_goal_tasks','prayer_logs',
        'prayer_components','qada_obligations','qada_settlements','fasting_templates',
        'fasting_logs','quran_reading_logs','dhikr_templates','dhikr_logs',
        'deed_templates','deed_logs','daily_journals','journal_attachments','notifications'
      ) or t.relname like 'workspace\_%' escape '\'
    )
    and not exists (
      select 1
      from pg_constraint f
      where f.conrelid = t.oid
        and f.contype = 'f'
        and f.confrelid = 'auth.users'::regclass
        and f.confdeltype = 'c'
    );

  if v_missing is not null then
    raise exception 'ACCOUNT_CASCADE_NOT_READY: missing ON DELETE CASCADE on %', v_missing;
  end if;
end $$;

-- Old clients cannot call the retired full-snapshot RPC after this release.
drop function if exists public.save_user_workspace_snapshot(jsonb, timestamptz);

-- Its contents are intentionally discarded after the relational migration;
-- all active relational workspace records remain intact.
drop table if exists public.user_workspace_snapshots;

notify pgrst, 'reload schema';
commit;
