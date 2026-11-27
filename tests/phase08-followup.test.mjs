import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

test('waqt confirmation narrows the prayer and configured fard inside the submit handler', () => {
  const source = read('../src/components/frontend-workspace.tsx');
  const start = source.indexOf('function WaqtPrayerEntryForm(');
  const end = source.indexOf('function WaqtNotPerformedForm(', start);
  const block = source.slice(start, end);
  assert.match(block, /const currentPrayer = event\.prayer/);
  assert.match(block, /if \(!currentPrayer\)/);
  assert.match(block, /const currentFard = data\.prayerConfig\[currentPrayer\]\?\.find/);
  assert.match(block, /if \(!currentFard\)/);
  assert.match(block, /getPrayerWaqtWindow\(times, tomorrow, currentPrayer\)/);
  assert.match(block, /prayer: currentPrayer/);
  assert.doesNotMatch(block, /getPrayerWaqtWindow\(times, tomorrow, prayerId\)/);
});

test('prayer time manual refresh state exists and countdown recomputes without memo warnings', () => {
  const source = read('../src/modules/trackers/prayer-time-widget.tsx');
  assert.match(source, /const \[refreshKey, setRefreshKey\] = useState\(0\)/);
  assert.match(source, /\[date, latitude, longitude, refreshKey\]/);
  assert.match(source, /setRefreshKey\(\(value\) => value \+ 1\)/);
  assert.match(source, /const \[, setClockTick\] = useState\(0\)/);
  assert.match(source, /const state = currentTimes \?/);
  assert.doesNotMatch(source, /useMemo/);
});

test('static hadith card selects a stable daily record and supports manual rotation', () => {
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  const workspace = read('../src/components/frontend-workspace.tsx');
  const hadith = JSON.parse(read('../src/data/hadith-bn.json'));
  assert.equal(hadith.hadiths.length, 20);
  assert.equal(new Set(hadith.hadiths.map((item) => item.id)).size, 20);
  assert.doesNotMatch(tracker, /function DuaForm|দোয়া সংগ্রহ/);
  assert.match(workspace, /function DailyHadithCard/);
  assert.match(workspace, /function chooseDailyHadith\(dateKey: string\)/);
  assert.match(workspace, /useState<HadithRecord>\(\(\) => chooseDailyHadith\(date\)\)/);
  assert.match(workspace, /onClick=\{\(\) => setItem\(chooseRandomHadith\(item\.id\)\)\}/);
  assert.doesNotMatch(workspace, /useEffect\(\(\) => \{ setItem\(chooseRandomHadith\(\)\); \}, \[\]\)/);
  assert.match(workspace, /অন্য হাদিস/);
  assert.doesNotMatch(workspace, /setInterval\(.*hadith/i);
});

test('proxy only uses cookie options on the response cookie jar', () => {
  const source = read('../src/proxy.ts');
  assert.match(source, /cookiesToSet\.forEach\(\(\{ name, value \}\) => request\.cookies\.set\(name, value\)\)/);
  assert.match(source, /response\.cookies\.set\(name, value, options\)/);
});

test('missing date helpers and the Qada future-time purity check are covered', () => {
  const dateModule = read('../src/lib/date/religious-date.ts');
  const dashboard = read('../src/components/dashboard-content.tsx');
  const journal = read('../src/modules/journal/journal-workspace.tsx');
  const workspace = read('../src/components/frontend-workspace.tsx');
  const tracker = read('../src/modules/trackers/tracker-center.tsx');
  assert.match(dateModule, /export function formatBengaliDate\(dateKey: string\)/);
  assert.match(dashboard, /import \{ formatBengaliDate, getReligiousDateKey \}/);
  assert.match(journal, /formatBengaliDate/);
  assert.match(workspace, /getPrayerCivilDate/);
  assert.match(tracker, /function isFutureInstant\(value: Date\)/);
  assert.match(tracker, /isFutureInstant\(performedInstant\)/);
  const formStart = tracker.indexOf('function QadaSettlementForm(');
  const formEnd = tracker.indexOf('function PrayerWizard(', formStart);
  assert.doesNotMatch(tracker.slice(formStart, formEnd), /Date\.now\(\)/);
});

test('existing environment setup preserves Supabase keys and generates only a missing throttle secret', () => {
  const setup = read('../scripts/setup-env.mjs');
  const doctor = read('../scripts/env-doctor.mjs');
  const example = read('../.env.example');
  assert.match(setup, /const current = await readFile\(target, "utf8"\)/);
  assert.match(setup, /randomBytes\(32\)\.toString\("hex"\)/);
  assert.match(setup, /বিদ্যমান Supabase মান অক্ষত রাখা হয়েছে/);
  assert.match(doctor, /কোনো Key বা Secret এখানে পাঠানোর দরকার নেই/);
  assert.doesNotMatch(example, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.match(example, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME/);
  assert.match(example, /SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME/);
});
