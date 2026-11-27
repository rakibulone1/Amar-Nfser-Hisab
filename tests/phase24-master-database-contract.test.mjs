import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const api = read("src/app/api/workspace/route.ts");
const sql = read("supabase/MASTER_DATABASE_SETUP.sql");

const expectedCollections = [
  "goals", "records", "prayerDays", "notes", "prayerEntries", "qadaEntries",
  "quranEntries", "extraPrayerEntries", "dhikrTemplates", "dhikrSessions",
  "fastingEntries", "deedEntries", "avoidEntries", "duaItems", "studyEntries",
  "habitDefinitions", "habitLogs", "reflections", "journeys", "journeyMilestones",
  "journeyObservations", "deadlinePlans", "deadlineTasks", "prayerTimesCache",
  "reminderEvents"
];

const expectedTables = [
  "workspace_goals", "workspace_records", "workspace_prayer_days", "workspace_notes",
  "workspace_prayer_entries", "workspace_qada_entries", "workspace_quran_entries",
  "workspace_extra_prayer_entries", "workspace_dhikr_templates", "workspace_dhikr_sessions",
  "workspace_fasting_entries", "workspace_deed_entries", "workspace_avoid_entries",
  "workspace_dua_items", "workspace_study_entries", "workspace_habit_definitions",
  "workspace_habit_logs", "workspace_reflections", "workspace_journeys",
  "workspace_journey_milestones", "workspace_journey_observations",
  "workspace_deadline_plans", "workspace_deadline_tasks",
  "workspace_prayer_times_cache", "workspace_reminder_events"
];

function arrayBlock(source, declaration) {
  const declarationStart = source.indexOf(declaration);
  assert.notEqual(declarationStart, -1, `Could not find SQL declaration: ${declaration}`);
  const arrayStart = source.indexOf("array[", declarationStart);
  assert.notEqual(arrayStart, -1, `Could not find array initializer for: ${declaration}`);
  const arrayEnd = source.indexOf("]", arrayStart);
  assert.notEqual(arrayEnd, -1, `Could not find end of array initializer for: ${declaration}`);
  return source.slice(arrayStart + "array[".length, arrayEnd);
}

test("Release 1.4.0 package and lock metadata are aligned", () => {
  assert.equal(pkg.version, "1.4.0");
  assert.equal(lock.version, "1.4.0");
  assert.equal(lock.packages[""].version, "1.4.0");
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
  assert.match(pkg.scripts["test:all"], /test:phase24/);
  assert.match(pkg.scripts["verify:release"], /npm run test:all/);
});

test("the workspace API allow-list and SQL write mapping contain the same 25 collections", () => {
  const apiBlock = api.match(/const COLLECTIONS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(apiBlock, "workspace API collection allow-list must exist");
  const apiCollections = [...apiBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(apiCollections, expectedCollections);
  assert.equal(new Set(apiCollections).size, 25);

  const mappingBlock = sql.match(/for v_collection in select \* from \(values([\s\S]*?)\) as m\(collection_key,table_name,date_key\)/);
  assert.ok(mappingBlock, "Master SQL collection-to-table mapping must exist");
  const mappings = [...mappingBlock[1].matchAll(/\('([^']+)','(workspace_[^']+)','([^']*)'\)/g)]
    .map((match) => ({ key: match[1], table: match[2] }));
  assert.deepEqual(mappings.map((item) => item.key), expectedCollections);
  assert.deepEqual(mappings.map((item) => item.table), expectedTables);
  assert.equal(new Set(mappings.map((item) => item.table)).size, 25);
});

test("the Master SQL creates the same 25 account-owned tables and enables RLS", () => {
  const tablesBlock = arrayBlock(sql, "v_tables text[] :=");
  const tableNames = [...tablesBlock.matchAll(/'(workspace_[a-z0-9_]+)'/g)].map((match) => match[1]);
  assert.deepEqual(tableNames, expectedTables);

  assert.match(sql, /user_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /alter table public\.%I enable row level security/);
  assert.match(sql, /for all to authenticated using \(user_id = auth\.uid\(\)\) with check \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /primary key \(user_id, id\)/);
  assert.match(sql, /jsonb_typeof\(record\) = ''object''/);
});

test("load and save RPCs cover every collection without a whole-workspace snapshot", () => {
  for (const key of expectedCollections) {
    assert.match(sql, new RegExp(`'${key}',\\s*coalesce\\(\\(select jsonb_agg\\(r\\.record`), `load RPC must return ${key}`);
  }

  assert.match(sql, /create or replace function public\.load_relational_workspace\(\)/);
  assert.match(sql, /create or replace function public\.save_relational_workspace_changes\(\s*p_changes jsonb,\s*p_expected_updated_at timestamptz/);
  assert.match(sql, /WORKSPACE_VERSION_CONFLICT/);
  assert.match(sql, /INVALID_COLLECTION_ENVELOPE/);
  assert.match(sql, /UNKNOWN_CHANGE_SECTION/);
  assert.doesNotMatch(sql, /create table[^;]*user_workspace_snapshots/i);
  assert.doesNotMatch(sql, /create or replace function public\.save_user_workspace_snapshot/i);
});

test("the Master SQL is fresh-project-only and legacy migration files are removed", () => {
  assert.match(sql, /begin;[\s\S]*AMAR_NFSER_HISAB_DATABASE_ALREADY_INITIALIZED[\s\S]*commit;/);
  assert.match(sql, /Create a new empty Supabase project/);
  for (const oldPath of [
    "supabase/migrations/001_atomic_workspace_snapshot.sql",
    "supabase/migrations/002_relational_workspace.sql",
    "supabase/migrations/003_remove_legacy_snapshot.sql",
    "supabase/WORKSPACE_DATA_AUDIT.sql",
    "supabase/WORKSPACE_DATA_AUDIT_RELATIONAL.sql"
  ]) {
    assert.equal(fs.existsSync(path.join(root, oldPath)), false, `${oldPath} should not be part of this fresh setup`);
  }
});

test("workspace RPC execution is limited to authenticated users and the schema asserts RLS", () => {
  assert.match(sql, /revoke all on function public\.load_relational_workspace\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.load_relational_workspace\(\) to authenticated/);
  assert.match(sql, /revoke all on function public\.save_relational_workspace_changes\(jsonb,timestamptz\) from public, anon/);
  assert.match(sql, /grant execute on function public\.save_relational_workspace_changes\(jsonb,timestamptz\) to authenticated/);
  assert.match(sql, /WORKSPACE_SCHEMA_INCOMPLETE/);
  assert.match(sql, /WORKSPACE_RLS_MISSING/);
  assert.match(sql, /WORKSPACE_RPC_PRIVILEGE_MISMATCH/);
});
