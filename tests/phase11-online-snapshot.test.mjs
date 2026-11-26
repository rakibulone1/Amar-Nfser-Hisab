import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("runtime workspace is loaded from table-per-collection relational records, not a JSON snapshot", () => {
  const api = read("src/app/api/workspace/route.ts");
  const store = read("src/lib/local/store.ts");
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  assert.match(api, /rpc\("load_relational_workspace"\)/);
  assert.match(api, /rpc\("save_relational_workspace_changes"/);
  assert.doesNotMatch(api, /user_workspace_snapshots/);
  assert.match(store, /buildWorkspaceChanges\(syncedSnapshot, target\)/);
  assert.match(store, /upserts/);
  assert.match(store, /deletes/);
  assert.match(migration, /workspace_prayer_entries/);
  assert.match(migration, /workspace_quran_entries/);
  assert.match(migration, /workspace_dhikr_sessions/);
  assert.match(migration, /workspace_journey_observations/);
  assert.match(migration, /workspace_deadline_tasks/);
  assert.match(migration, /load_relational_workspace/);
  assert.match(migration, /save_relational_workspace_changes/);
  assert.match(migration, /workspace_sync_state/);
});

test("the old snapshot is only a one-time migration source and is retained for rollback", () => {
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  const api = read("src/app/api/workspace/route.ts");
  assert.match(migration, /One-time safe migration from the old JSON snapshot table/);
  assert.match(migration, /user_workspace_snapshots/);
  assert.match(migration, /Legacy snapshot archive/);
  assert.doesNotMatch(api, /save_user_workspace_snapshot/);
});

test("delta saves are owner-scoped, version-checked and bounded without a per-edit full snapshot write", () => {
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  const api = read("src/app/api/workspace/route.ts");
  const store = read("src/lib/local/store.ts");
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /WORKSPACE_VERSION_CONFLICT/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /WORKSPACE_TOO_LARGE/);
  assert.match(api, /MAX_WORKSPACE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(store, /setTimeout\(\(\) => \{ cloudSyncTimer = null; void pushCloudSnapshot/);
  assert.match(store, /syncedSnapshot = target/);
});

test("goal date ranges cannot overlap and stage observations have separate records", () => {
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  const workspace = read("src/components/frontend-workspace.tsx");
  assert.match(migration, /prevent_workspace_goal_overlap/);
  assert.match(migration, /daterange\([\s\S]*&&/);
  assert.match(workspace, /goalStartDate/);
  assert.match(workspace, /এই সময়ে/);
  assert.match(workspace, /journeyObservations/);
  assert.match(workspace, /অনুভূতির নোট আপডেট হয়েছে/);
});

test("static hadith library contains 20 locally bundled records and source manifest", () => {
  const data = JSON.parse(read("src/data/hadith-bn.json"));
  const source = read("src/data/HADITH_SOURCES_BN.md");
  assert.equal(data.hadiths.length, 20);
  assert.equal(data.categories.length, 8);
  for (const item of data.hadiths) {
    assert.deepEqual(Object.keys(item).sort(), ["book", "category_id", "chapter", "full_text_bn", "hadith_number", "id", "narrator", "summary"].sort());
    assert.ok(item.summary && item.full_text_bn && item.narrator && item.book && item.hadith_number && item.chapter);
    assert.match(source, new RegExp(item.id));
  }
  assert.match(read("src/modules/hadith/hadith-library.tsx"), /আগের হাদিস/);
  assert.match(read("src/modules/hadith/hadith-library.tsx"), /পরের হাদিস/);
  assert.match(read("src/components/frontend-workspace.tsx"), /chooseRandomHadith/);
  assert.doesNotMatch(read("src/components/frontend-workspace.tsx"), /setInterval\(.*hadith/i);
});
