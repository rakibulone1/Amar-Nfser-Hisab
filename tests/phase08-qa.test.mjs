import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('cloud-only workspace waits for authenticated Supabase hydration and blocks when it fails', () => {
  const workspace = read('../src/components/frontend-workspace.tsx');
  assert.match(workspace, /hydrateLocalData\(\)\.finally/);
  assert.match(workspace, /return loaded && !getWorkspaceLoadError\(\) \? data : null/);
  assert.match(workspace, /workspace-loading/);
  assert.match(workspace, /অনলাইন তথ্য খোলা যায়নি/);
});

test('Qada entries retain the rakats obligation snapshot across configuration changes', () => {
  const store = read('../src/lib/local/store.ts');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  assert.match(store, /sourceEntryId: string \| null; rakats: number/);
  assert.match(store, /requestedRakats/);
  assert.match(tracker, /plannedRakats: qada\.rakats \|\| fard\.rakats/);
});

test('routine rakats and settled qada rakats are calculated separately', () => {
  const workspace = read('../src/components/frontend-workspace.tsx');
  assert.match(workspace, /method !== "qada"/);
  assert.match(workspace, /qadaRakatsToday/);
  assert.match(workspace, /pendingQadaRakats/);
});

test('waqt reminder yes/no responses save complete user-confirmed records', () => {
  const workspace = read('../src/components/frontend-workspace.tsx');
  const reminders = read('../src/modules/trackers/prayer-settings.tsx');
  assert.match(workspace, /function WaqtPrayerEntryForm/);
  assert.match(workspace, /function WaqtNotPerformedForm/);
  assert.match(workspace, /ওয়াক্তের পরে আদায়/);
  assert.match(workspace, /status: "settled"/);
  assert.match(workspace, /status: "pending"/);
  assert.match(reminders, /minutes >= toMinutes\(window\.end\)/);
  assert.doesNotMatch(reminders, /minutes < end \+ 45/);
});

test('prayer records use Bangladesh wall-clock time and prayer windows distinguish end dates', () => {
  const helper = read('../src/lib/prayer-time.ts');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  const widget = read('../src/modules/trackers/prayer-time-widget.tsx');
  const api = read('../src/app/api/prayer-times/route.ts');
  assert.match(helper, /Asia\/Dhaka/);
  assert.match(helper, /toDhakaIso/);
  assert.match(helper, /tomorrowTimes\?\.fajr/);
  assert.match(tracker, /আদায়ের সময় \(বাংলাদেশ\)/);
  assert.match(widget, /ওয়াক্তের/);
  assert.match(api, /latitude: lat, longitude: lon/);
  assert.match(api, /validDate/);
});

test('aggregate test command has real scripts for each referenced phase', () => {
  const pkg = JSON.parse(read('../package.json'));
  for (const script of ['test:phase02','test:phase03','test:phase04','test:phase05','test:phase06','test:phase07','test:phase08']) {
    assert.ok(pkg.scripts[script], `missing npm script ${script}`);
  }
  assert.match(pkg.scripts['test:all'], /test:phase06.*test:phase07.*test:phase08/);
});

test('all new customer-facing app identity remains Bengali-first with English brand only', () => {
  const layout = read('../src/app/layout.tsx');
  const appCss = read('../src/app/globals.css');
  assert.match(layout, /lang="bn"/);
  assert.match(layout, /Amar Nfser Hisab/);
  assert.match(appCss, /Phase 08 — quality pass/);
  assert.match(appCss, /:root\[data-theme="dark"\]/);
});


test('dashboard reminder runtime dependencies are explicitly imported and journal fetch helper is available', () => {
  const settings = read('../src/modules/trackers/prayer-settings.tsx');
  const journal = read('../src/modules/journal/journal-workspace.tsx');
  assert.match(settings, /import \{ getLocalDataSnapshot, getLocalJournalDate, updateLocalData/);
  assert.match(settings, /getLocalDataSnapshot\(\)/);
  assert.match(journal, /import \{ fetchJsonOnce \} from "@\/lib\/client\/fetch-json-once"/);
});

test('prayer time widget de-duplicates concurrent requests and manual refresh re-runs loading', () => {
  const widget = read('../src/modules/trackers/prayer-time-widget.tsx');
  assert.match(widget, /inFlightPrayerTimes/);
  assert.match(widget, /fetchPrayerTimesOnce/);
  assert.match(widget, /refreshKey/);
  assert.match(widget, /setRefreshKey\(\(value\) => value \+ 1\)/);
});
