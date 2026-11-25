import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

test('durable workspace writes go only through the authenticated Supabase API', () => {
  const store = read('../src/lib/local/store.ts');
  const api = read('../src/app/api/workspace/route.ts');
  assert.match(store, /fetch\("\/api\/workspace"/);
  assert.match(store, /method: "PUT"/);
  assert.match(store, /expectedUpdatedAt: remoteUpdatedAt/);
  assert.match(api, /from\("user_workspace_snapshots"\)/); // read path remains RLS-scoped
  assert.match(api, /rpc\("save_user_workspace_snapshot"/);
  assert.match(api, /p_expected_updated_at: expectedUpdatedAt/);
  assert.match(api, /status: 409/);
  assert.doesNotMatch(api, /upsert\(/); // all writes are serialized in the database transaction
  assert.doesNotMatch(store, /localStorage\.setItem/);
  assert.doesNotMatch(store, /writeIndexedData/);
});

test('legacy IndexedDB/localStorage is read-only migration input and removed after confirmed cloud save', () => {
  const store = read('../src/lib/local/store.ts');
  assert.match(store, /readLegacyBrowserData/);
  assert.match(store, /clearLegacyBrowserData\(\)/);
  assert.match(store, /clearLegacyBrowserData\(\);/);
  assert.doesNotMatch(store, /objectStore\(DB_STORE\).*\.put\(/s);
  assert.doesNotMatch(store, /localStorage\.setItem/);
});

test('theme preference loads and saves through the server preferences endpoint', () => {
  const provider = read('../src/providers/theme-provider.tsx');
  const route = read('../src/app/api/preferences/route.ts');
  assert.match(provider, /fetch\("\/api\/preferences"/);
  assert.match(provider, /method: "PATCH"/);
  assert.doesNotMatch(provider, /localStorage\.setItem/);
  assert.match(route, /theme: z\.enum\(\["light", "dark", "system"\]\)/);
  assert.match(route, /theme: patch\.theme \?\? current\?\.theme/);
});

test('UI clearly communicates cloud-only saving and no offline persistence', () => {
  const workspace = read('../src/components/frontend-workspace.tsx');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  const css = read('../src/app/globals.css');
  const store = read('../src/lib/local/store.ts');
  assert.match(store, /Supabase-এ নিরাপদে সংরক্ষণ হচ্ছে/);
  assert.match(workspace, /অফলাইন · সংরক্ষিত নয়/);
  assert.match(workspace, /IndexedDB বা Local Storage-এ নতুন রেকর্ড লেখে না/);
  assert.match(tracker, /পরিবর্তন স্থায়ীভাবে সংরক্ষিত হবে না/);
  assert.match(css, /--page: #f4f7f4/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /mobile-navigation button\.active/);
});

test('preference PATCH merges partial theme updates without clearing date and prayer settings', () => {
  const route = read('../src/app/api/preferences/route.ts');
  assert.match(route, /current\?\.time_zone \?\? "Asia\/Dhaka"/);
  assert.match(route, /current\?\.maghrib_day_rollover \?\? true/);
  assert.match(route, /current\?\.asr_school \?\? "hanafi"/);
  assert.match(route, /current\?\.prayer_latitude \?\? null/);
});
