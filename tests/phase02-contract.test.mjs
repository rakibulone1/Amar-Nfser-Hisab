import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const masterSql = readFileSync(resolve(root, 'supabase/MASTER_DATABASE_SETUP.sql'), 'utf8');
const entriesApi = readFileSync(resolve(root, 'src/app/api/entries/route.ts'), 'utf8');
const attachmentApi = readFileSync(resolve(root, 'src/app/api/attachments/route.ts'), 'utf8');

test('Master SQL contains every relational tracker table and enables owner-scoped RLS without a legacy snapshot', () => {
  for (const table of [
    'self_purification_journeys', 'journey_obstacles', 'learning_goals',
    'learning_goal_tasks', 'prayer_logs', 'prayer_components', 'qada_obligations',
    'qada_settlements', 'fasting_templates', 'fasting_logs', 'quran_reading_logs',
    'dhikr_templates', 'dhikr_logs', 'deed_templates', 'deed_logs', 'daily_journals',
    'journal_attachments'
  ]) {
    assert.match(masterSql, new RegExp(`'${table}'`, 'i'), `${table} should be listed in the master RLS block`);
  }
  assert.doesNotMatch(masterSql, /user_workspace_snapshots|save_user_workspace_snapshot/);
  assert.match(masterSql, /alter table public\.%I enable row level security/i);
  assert.match(masterSql, /using \(user_id = auth\.uid\(\)\)/i);
  assert.match(masterSql, /with check \(user_id = auth\.uid\(\)\)/i);
  assert.match(masterSql, /drop policy if exists/i);
  for (const table of [
    "workspace_prayer_entries", "workspace_qada_entries", "workspace_quran_entries",
    "workspace_dhikr_sessions", "workspace_fasting_entries", "workspace_deed_entries",
    "workspace_avoid_entries", "workspace_journey_observations", "workspace_deadline_plans",
    "workspace_deadline_tasks", "workspace_sync_state", "workspace_user_settings"
  ]) assert.ok(masterSql.includes(table), `${table} must be included for new database setup`);
  assert.match(masterSql, /create or replace function public\.load_relational_workspace/);
  assert.match(masterSql, /create or replace function public\.save_relational_workspace_changes/);
});

test('Prayer and Qada writes use the atomic RPC and immutable settlement ledger', () => {
  assert.match(entriesApi, /rpc\("save_prayer_entry"/);
  assert.match(masterSql, /create table if not exists public\.qada_settlements/i);
  assert.match(masterSql, /unique\(obligation_id\)/i);
  assert.match(masterSql, /create or replace function public\.mark_qada_settled/i);
  assert.match(masterSql, /create trigger qada_settlement_updates_obligation/i);
  assert.match(masterSql, /foreign key \(obligation_id, user_id\)/i);
  assert.match(masterSql, /alter table public\.qada_settlements enable row level security/i);
  assert.match(masterSql, /create policy \"qada_settlements_select_own\"[\s\S]*?for select/i);
  assert.match(masterSql, /create policy \"qada_settlements_insert_own\"[\s\S]*?for insert/i);
  assert.match(masterSql, /revoke update, delete on public\.qada_settlements from authenticated/i);
  assert.doesNotMatch(masterSql, /create policy \"qada_settlements_update_own\"/i);
});

test('Image upload enforces a private 100 KiB storage contract', () => {
  assert.match(masterSql, /journal-private/i);
  assert.match(masterSql, /100\s*\*\s*1024|102400/i);
  assert.match(masterSql, /values \('journal-private','journal-private',false,102400/i);
  assert.match(attachmentApi, /MAX_BYTES = 100 \* 1024/);
  assert.match(attachmentApi, /matchesDeclaredType/);
  assert.match(attachmentApi, /storage\.from\("journal-private"\)/);
});
