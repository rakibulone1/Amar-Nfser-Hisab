import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

test('brand and default presentation use the English product name and minimal scale mark', () => {
  const layout = read('../src/app/layout.tsx');
  const login = read('../src/app/login/page.tsx');
  const logo = read('../public/brand/logo.svg');
  const css = read('../src/app/globals.css');
  assert.match(layout, /Amar Nfser Hisab/);
  assert.match(login, /Amar Nfser Hisab/);
  assert.match(logo, /<svg/);
  assert.match(logo, /B58B4E|245B43/);
  assert.match(css, /--page:\s*#f7f9f7/);
  assert.match(css, /\.mobile-navigation/);
});

test('prayer API requests Karachi calculation and Hanafi Asr independently from mosque jamaat', () => {
  const route = read('../src/app/api/prayer-times/route.ts');
  const settings = read('../src/modules/trackers/prayer-settings.tsx');
  const reminders = read('../src/modules/trackers/prayer-settings.tsx');
  assert.match(route, /searchParams\.set\("method",\s*"1"\)/);
  assert.match(route, /searchParams\.set\("school",\s*"1"\)/);
  assert.match(route, /Asia\/Dhaka/);
  assert.match(settings, /মসজিদের জামাতের সময়/);
  assert.match(settings, /type="time"/);
  assert.match(reminders, /জামাতের কত মিনিট আগে স্মরণ করবে/);
});

test('waqt expiry notification opens the selected tracker and offers an explicit not-prayed choice', () => {
  const reminders = read('../src/modules/trackers/prayer-settings.tsx');
  const notifications = read('../src/components/frontend-workspace.tsx');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  assert.match(reminders, /ওয়াক্ত শেষের নিশ্চিতকরণ/);
  assert.match(reminders, /আদায় করেছ কি\?/);
  assert.match(notifications, /navigateSection\("journal", "prayer", item\.prayer, item\.date\)/);
  assert.match(tracker, /এখনো আদায় করিনি/);
  assert.match(tracker, /method === "not-prayed"/);
  assert.match(tracker, /qadaEntries/);
});

test('prayer tracker uses a sequential wizard and stores rakats by category and method', () => {
  const store = read('../src/lib/workspace/store.ts');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  assert.match(store, /PrayerPartCategory/);
  assert.match(store, /PrayerEntry/);
  assert.match(store, /qadaEntries/);
  assert.match(tracker, /ধাপে ধাপে সালাতের হিসাব/);
  assert.match(tracker, /তাকবিরে উলা পেয়েছি/);
  assert.match(tracker, /দেরিতে যোগ দিয়েছি/);
  assert.match(tracker, /QadaSettlementForm/);
  assert.match(tracker, /অতিরিক্ত সালাতের রেকর্ড/);
});

test('all requested tracker families have dedicated entry and local data models', () => {
  const store = read('../src/lib/workspace/store.ts');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  for (const field of ['quranEntries', 'dhikrTemplates', 'dhikrSessions', 'fastingEntries', 'deedEntries', 'avoidEntries', 'studyEntries', 'habitDefinitions', 'habitLogs', 'reflections', 'journeys']) {
    assert.match(store, new RegExp(field));
  }
  for (const label of ['কুরআন তেলাওয়াত', 'জিকির ও তাসবিহ', 'সিয়াম ট্র্যাকার', 'ভালো কাজ', 'অনাকাঙ্ক্ষিত অভ্যাস', 'ইলম ও অধ্যয়ন', 'ব্যক্তিগত অভ্যাস', 'আত্মসমালোচনা ও মুহাসাবা']) {
    assert.ok(tracker.includes(label), `missing tracker label: ${label}`);
  }
});

test('legacy browser persistence is cleanup-only and never imported into the online workspace', () => {
  const store = read('../src/lib/workspace/store.ts');
  const theme = read('../src/providers/theme-provider.tsx');
  assert.match(store, /purgeLegacyBrowserStorage/);
  assert.match(store, /localStorage\.removeItem/);
  assert.match(store, /indexedDB\.deleteDatabase/);
  assert.doesNotMatch(store, /indexedDB\.open|localStorage\.getItem|localStorage\.setItem|readLegacyBrowserData/);
  assert.doesNotMatch(theme, /localStorage|indexedDB/);
  assert.match(store, /schemaVersion: 3/);
  assert.ok(fs.existsSync(new URL('../supabase/MASTER_DATABASE_SETUP.sql', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../supabase/migrations/003_remove_legacy_snapshot.sql', import.meta.url)));
});

test('short-lived signed login handoff is minted only after Supabase sign-in and cleared by proxy', () => {
  const handoff = read('../src/lib/auth/login-handoff.ts');
  const login = read('../src/app/api/auth/login/route.ts');
  const proxy = read('../src/proxy.ts');
  assert.match(handoff, /createHmac/);
  assert.match(handoff, /timingSafeEqual/);
  assert.match(login, /signInWithPassword/);
  assert.match(login, /createLoginHandoff\(userId/);
  assert.match(proxy, /verifyLoginHandoff/);
  assert.match(proxy, /maxAge:\s*0/);
});

test('environment examples contain placeholders only and never ship private Supabase secrets', () => {
  const envExample = read('../.env.example');
  const manifest = read('../PROJECT_PACKAGE_MANIFEST.txt');
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.doesNotMatch(envExample, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(envExample, /(?:sb_secret_)(?!REPLACE_ME)[A-Za-z0-9_-]{12,}/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME/);
  assert.match(envExample, /SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME/);
  assert.doesNotMatch(manifest, /(^|\n)\.env\.local(\n|$)/);
  assert.match(manifest, /supabase\/MASTER_DATABASE_SETUP\.sql/i);
  assert.match(manifest, /Master SQL/);
});
