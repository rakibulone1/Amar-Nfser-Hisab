import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

 test("durable workspace code is account-backed and never reads or writes browser persistence", () => {
  const store = read("src/lib/workspace/store.ts");
  const theme = read("src/providers/theme-provider.tsx");
  assert.match(store, /fetch\("\/api\/workspace"/);
  assert.match(store, /pushWorkspaceChanges/);
  assert.match(store, /confirmedWorkspaceState/);
  assert.doesNotMatch(store, /indexedDB\.open|localStorage\.getItem|localStorage\.setItem|readLegacyBrowserData/);
  assert.match(store, /indexedDB\.deleteDatabase/);
  assert.match(store, /localStorage\.removeItem/);
  assert.doesNotMatch(theme, /localStorage|indexedDB/);
});

test("new Master SQL no longer creates or grants access to the retired snapshot store", () => {
  const master = read("supabase/MASTER_DATABASE_SETUP.sql");
  assert.doesNotMatch(master, /user_workspace_snapshots|save_user_workspace_snapshot/);
  assert.match(master, /create table if not exists public\.workspace_sync_state/);
  assert.match(master, /create table if not exists public\.workspace_user_settings/);
  assert.match(master, /create or replace function public\.load_relational_workspace/);
  assert.match(master, /create or replace function public\.save_relational_workspace_changes/);
});

test("existing installations have an ordered cleanup migration that preserves active relational records", () => {
  const migration = read("supabase/migrations/003_remove_legacy_snapshot.sql");
  assert.match(migration, /RELATIONAL_WORKSPACE_NOT_READY/);
  assert.match(migration, /ACCOUNT_CASCADE_NOT_READY/);
  assert.match(migration, /drop function if exists public\.save_user_workspace_snapshot/);
  assert.match(migration, /drop table if exists public\.user_workspace_snapshots/);
  assert.doesNotMatch(migration, /\btruncate\s+(table\s+)?public\.|delete\s+from\s+public\.workspace_/i);
  assert.match(migration, /confdeltype\s*=\s*'c'/);
});

test("account deletion requires same-origin request, password reauthentication and explicit confirmation", () => {
  const route = read("src/app/api/account/delete/route.ts");
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /password:\s*z\.string\(\)\.min\(8\)/);
  assert.match(route, /confirmation:\s*z\.literal\("DELETE"\)/);
  assert.match(route, /signInWithPassword/);
  assert.match(route, /admin\.auth\.admin\.deleteUser\(context\.user\.id\)/);
});

test("account deletion removes user-prefixed private files before auth deletion", () => {
  const route = read("src/app/api/account/delete/route.ts");
  assert.match(route, /journal-private/);
  assert.match(route, /collectAccountStoragePaths/);
  assert.match(route, /removeAccountStorage/);
  assert.ok(route.indexOf("await removeAccountStorage(admin, storagePaths)") < route.indexOf("admin.auth.admin.deleteUser"));
  assert.match(route, /MAX_ACCOUNT_FILES/);
  assert.match(route, /REMOVE_BATCH_SIZE/);
});

test("Settings keeps account deletion out of everyday UI and provides profile plus logout", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const css = read("src/app/globals.css");
  assert.match(workspace, /ব্যক্তিগত প্রোফাইল/);
  assert.match(workspace, /প্রোফাইল সংরক্ষণ/);
  assert.match(workspace, /এই ডিভাইস থেকে লগআউট/);
  assert.match(workspace, /onLogout/);
  assert.doesNotMatch(workspace, /অ্যাকাউন্ট ও সব তথ্য মুছে ফেলা|নিশ্চিত করতে DELETE লিখো|\/api\/account\/delete/);
  assert.match(css, /\.settings-profile-panel/);
  assert.match(css, /\.settings-logout-panel/);
  const deleteRoute = read("src/app/api/account/delete/route.ts");
  assert.match(deleteRoute, /admin\.auth\.admin\.deleteUser/);
});

test("Release 1.2.7 keeps dependencies unchanged and runs account cleanup checks", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.version, "1.2.7");
  assert.equal(lock.version, "1.2.7");
  assert.equal(lock.packages[""].version, "1.2.7");
  assert.equal(pkg.scripts["test:phase17"], "node --test tests/phase17-account-cleanup.test.mjs");
  assert.match(pkg.scripts["test:all"], /test:phase17/);
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
});
