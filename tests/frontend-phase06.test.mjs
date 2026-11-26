import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Phase 06 persistent navigation is still the base for the new tracker center', () => {
  const source = read('../src/components/frontend-workspace.tsx');
  assert.match(source, /navigateSection/);
  assert.match(source, /mobile-navigation/);
  assert.match(source, /TrackerCenter/);
  assert.match(source, /PrayerReminderEngine/);
});

test('workspace uses a versioned online-first workspace snapshot', () => {
  const source = read('../src/lib/local/store.ts');
  assert.match(source, /schemaVersion: 3/);
  assert.match(source, /fetch\("\/api\/workspace"/);
  assert.match(source, /পরিবর্তন অনলাইনে সংরক্ষণ হচ্ছে/);
  assert.doesNotMatch(source, /writeIndexedData/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});
