import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('workspace API validates every persisted tracker collection before an online save', () => {
  const route = read('../src/app/api/workspace/route.ts');
  for (const key of [
    'goals','records','prayerDays','notes','prayerEntries','qadaEntries','quranEntries','extraPrayerEntries',
    'dhikrTemplates','dhikrSessions','fastingEntries','deedEntries','avoidEntries','duaItems','studyEntries',
    'habitDefinitions','habitLogs','reflections','journeys','journeyMilestones','journeyObservations',
    'deadlinePlans','prayerTimesCache','reminderEvents'
  ]) assert.ok(route.includes(`"${key}"`), `missing validation for ${key}`);
  assert.match(route, /hasEveryArray/);
});

test('workspace saves are atomic, user-scoped and protected against simultaneous first writes', () => {
  const route = read('../src/app/api/workspace/route.ts');
  const migration = read('../supabase/migrations/001_atomic_workspace_snapshot.sql');
  assert.match(route, /rpc\("save_user_workspace_snapshot"/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /for update/i);
  assert.match(migration, /WORKSPACE_VERSION_CONFLICT/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/i);
  assert.match(migration, /octet_length\(p_payload::text\)/);
  assert.match(migration, /security invoker/i);
  assert.doesNotMatch(migration, /create table/i);
});

test('the consolidated Master SQL includes the same atomic-save function for fresh installs', () => {
  const master = read('../supabase/MASTER_DATABASE_SETUP.sql');
  assert.match(master, /create or replace function public\.save_user_workspace_snapshot/);
  assert.match(master, /pg_advisory_xact_lock/);
});

test('the active UI keeps the single online workspace model and requests a lifecycle flush', () => {
  const store = read('../src/lib/local/store.ts');
  assert.match(store, /attachSaveLifecycle/);
  assert.match(store, /visibilitychange/);
  assert.match(store, /pagehide/);
  assert.match(store, /}, 650\)/);
  assert.doesNotMatch(store, /localStorage\.setItem/);
  assert.doesNotMatch(store, /writeIndexedData/);
});

test('workspace audit query checks snapshot array counts separately from legacy relational tables', () => {
  const audit = read('../supabase/WORKSPACE_DATA_AUDIT.sql');
  assert.match(audit, /user_workspace_snapshots/);
  assert.match(audit, /prayerEntries/);
  assert.match(audit, /quranEntries/);
  assert.match(audit, /prayer_logs/);
  assert.match(audit, /quran_reading_logs/);
  assert.match(audit, /YOUR_LOGIN_EMAIL/);
});

test('the redesigned highlighted cards use solid, muted surfaces rather than artificial gradients', () => {
  const css = read('../src/app/globals.css');
  assert.match(css, /\.today-hero\s*\{[^}]*background:\s*#1e5137/s);
  assert.match(css, /\.hadith-daily-card\s*\{[^}]*background:\s*var\(--surface-sand\)/s);
  assert.match(css, /\.journey-summary-card,\s*\.journey-stage-card\s*\{[^}]*background:\s*var\(--surface-mint\)/s);
  assert.match(css, /\.tracker-picker-card\s*\{[^}]*border-radius:\s*19px/s);
});
