import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("all primary workspace sections expose a clear dashboard return action", () => {
  const frontend = read("src/components/frontend-workspace.tsx");
  const tracker = read("src/modules/trackers/tracker-center.tsx");
  assert.match(frontend, /function PageIntro\([\s\S]*?onBack: \(\) => void/);
  assert.match(frontend, /<PageIntro[\s\S]*?onBack=\{\(\) => navigateSection\("home"\)\}/);
  assert.match(frontend, /goals-page-heading[\s\S]*?ফিরে যাও/);
  assert.match(tracker, /export function TrackerCenter\(\{ data, onBack \}/);
  assert.match(tracker, /onClick=\{onBack\}[\s\S]*?ফিরে যাও/);
  assert.match(frontend, /StageDetailView[\s\S]*?ফিরে যাও/);
  assert.doesNotMatch(frontend, /workspace-section-back/);
});

test("dashboard displays Gregorian date and Hijri date in Bengali typography", () => {
  const frontend = read("src/components/frontend-workspace.tsx");
  const hijri = read("src/lib/date/hijri.ts");
  assert.match(frontend, /function formatEnglishGregorianDate/);
  assert.match(frontend, /new Intl\.DateTimeFormat\("bn-BD"/);
  assert.match(frontend, /getHijriLabel\(date\)/);
  assert.match(hijri, /HIJRI_MONTHS_BN/);
  assert.doesNotMatch(frontend, /DashboardDateCard\(\{ date \}\)[\s\S]{0,180}formatLongDate\(date\)/);
});

test("prayer-time cache keys include date and coordinates before the generic date fallback", () => {
  const store = read("src/lib/workspace/store.ts");
  const from = store.indexOf("function rowKey(");
  const to = store.indexOf("\nfunction ", from + 10);
  const block = store.slice(from, to > from ? to : from + 900);
  assert.ok(block.indexOf('if (collection === "prayerTimesCache")') < block.indexOf('if (typeof value.date === "string"'));
  assert.match(block, /value\.latitude \?\? ""/);
  assert.match(block, /value\.longitude \?\? ""/);
});

test("goal overlap trigger serializes writes per user in both incremental and master SQL", () => {
  for (const file of ["supabase/migrations/002_relational_workspace.sql", "supabase/MASTER_DATABASE_SETUP.sql"]) {
    const sql = read(file);
    assert.match(sql, /create or replace function public\.prevent_workspace_goal_overlap\(\)/);
    assert.match(sql, /pg_advisory_xact_lock\(hashtext\(new\.user_id::text\)\)/);
    assert.match(sql, /daterange\([\s\S]*?\)\s*&&\s*daterange/);
  }
});

test("goal cards open linked journey stages and keep long multi-stage links compact", () => {
  const frontend = read("src/components/frontend-workspace.tsx");
  assert.match(frontend, /linked\.slice\(0, 6\)/);
  assert.match(frontend, /setSelectedStageNumber\(stage\.stageNumber\)/);
  assert.match(frontend, /goal-linked-more/);
});

test("relational audit remains read-only and covers every key tracker and cache collection", () => {
  const audit = read("supabase/WORKSPACE_DATA_AUDIT_RELATIONAL.sql");
  for (const phrase of ["প্রোফাইল", "ব্যবহারকারী সেটিংস", "সালাত", "কাজা", "কুরআন", "জিকিরের তালিকা", "জিকির সেশন", "সিয়াম", "ভালো কাজ", "অভ্যাস নিয়ন্ত্রণ", "ইলম ও অধ্যয়ন", "মুহাসাবা", "আত্মশুদ্ধির যাত্রা", "পর্যায়ের অর্জন", "পর্যায়ের পর্যবেক্ষণ", "সময়সীমার লক্ষ্য", "লক্ষ্যের কাজ", "সালাতের সময় ক্যাশ", "স্মরণিকা", "ব্যক্তিগত ছবি"]) {
    assert.ok(audit.includes(phrase), `Audit query is missing ${phrase}`);
  }
  assert.doesNotMatch(audit, /\b(insert|update|delete|truncate)\s+(into|from|table)?\b/i);
});

test("release metadata and aggregate tests are advanced to 1.2.5", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.version, "1.2.9");
  assert.equal(lock.version, "1.2.9");
  assert.equal(lock.packages[""].version, "1.2.9");
  assert.match(pkg.scripts["test:all"], /test:phase13/);
  assert.match(pkg.scripts["test:all"], /test:phase16/);
  assert.match(pkg.scripts["test:all"], /test:phase17/);
  assert.match(pkg.scripts["test:all"], /test:phase19/);
});
