import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("all durable workspace records are persisted through the authenticated relational API", () => {
  const route = read("src/app/api/workspace/route.ts");
  const store = read("src/lib/local/store.ts");
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  assert.match(route, /rpc\("load_relational_workspace"\)/);
  assert.match(route, /rpc\("save_relational_workspace_changes"/);
  assert.match(store, /buildWorkspaceChanges/);
  assert.match(store, /WORKSPACE_COLLECTION_KEYS/);
  assert.match(migration, /workspace_prayer_entries/);
  assert.match(migration, /workspace_quran_entries/);
  assert.match(migration, /workspace_fasting_entries/);
  assert.match(migration, /workspace_deed_entries/);
  assert.match(migration, /workspace_reflections/);
  assert.match(migration, /workspace_habit_logs/);
});

test("old device records are only migration input and are removed only after confirmed cloud save", () => {
  const store = read("src/lib/local/store.ts");
  assert.match(store, /readLegacyBrowserData/);
  assert.match(store, /clearLegacyBrowserData\(\)/);
  assert.match(store, /clearLegacyBrowserData\(\);/);
  assert.doesNotMatch(store, /localStorage\.setItem/);
  assert.doesNotMatch(store, /indexedDB\.open\([^)]*"readwrite"/);
});

test("theme preference stays online and refresh fetches current relational records", () => {
  const theme = read("src/providers/theme-provider.tsx");
  const store = read("src/lib/local/store.ts");
  assert.match(theme, /\/api\/preferences/);
  assert.match(store, /fetch\("\/api\/workspace", \{ cache: "no-store"/);
});

test("the workspace save API no longer writes a single snapshot row", () => {
  const route = read("src/app/api/workspace/route.ts");
  assert.doesNotMatch(route, /save_user_workspace_snapshot/);
  assert.doesNotMatch(route, /user_workspace_snapshots/);
});
