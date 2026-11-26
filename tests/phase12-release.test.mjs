import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("fixed 71-stage journey is date-bounded to 23 Nov 2026 – 30 Oct 2030", () => {
  const stages = read("src/lib/journey/stages.ts");
  const ui = read("src/components/frontend-workspace.tsx");
  assert.match(stages, /FIXED_JOURNEY_START_DATE = "2026-11-23"/);
  assert.match(stages, /FIXED_JOURNEY_END_DATE = "2030-10-30"/);
  assert.match(stages, /FIXED_JOURNEY_STAGE_COUNT = 71/);
  assert.match(stages, /stageNumber <= 36 \? stageNumber \+ 2 : 74 - stageNumber/);
  assert.match(ui, /মডিউল \{moduleNumber\.toLocaleString/);
  assert.match(ui, /পরবর্তী ব্যাচ/);
  assert.match(ui, /চলমান ব্যাচ/);
  assert.match(ui, /সম্পন্ন ব্যাচ/);
});

test("Hijri date uses Bengali month names rather than English ICU month labels", () => {
  const hijri = read("src/lib/date/hijri.ts");
  const dashboard = read("src/components/frontend-workspace.tsx");
  assert.match(hijri, /HIJRI_MONTHS_BN/);
  assert.match(hijri, /formatToParts/);
  assert.match(dashboard, /DashboardDateCard/);
});

test("dashboard hierarchy is date strip, journey summary, four metric cards and static hadith", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const start = workspace.indexOf("function DashboardView(");
  const end = workspace.indexOf("const MOOD_OPTIONS", start);
  const dashboard = workspace.slice(start, end);
  assert.ok(dashboard.indexOf("<DashboardDateCard") < dashboard.indexOf("<FixedJourneyDashboardCard"));
  assert.ok(dashboard.indexOf("<FixedJourneyDashboardCard") < dashboard.indexOf("metric-grid"));
  assert.ok(dashboard.indexOf("metric-grid") < dashboard.indexOf("<DailyHadithCard"));
  assert.doesNotMatch(dashboard, /today-hero/);
});

test("notification popover supports read, expanded detail and individual or bulk deletion", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const store = read("src/lib/local/store.ts");
  assert.match(workspace, /function NotificationPopover/);
  assert.match(workspace, /markAllRead/);
  assert.match(workspace, /removeAll/);
  assert.match(workspace, /removeOne/);
  assert.match(store, /readAt\?: string \| null/);
  assert.doesNotMatch(workspace, /navigateSection\("notifications"/);
});

test("entry shortcuts open the requested tracker and prayer instead of only switching sections", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const tracker = read("src/modules/trackers/tracker-center.tsx");
  assert.match(workspace, /navigateSection\(section: AppSection, tracker\?: string, prayer\?: PrayerId/);
  assert.match(workspace, /navigateSection\("journal", "quran"\)/);
  assert.match(tracker, /readTrackerTarget/);
  assert.match(tracker, /initialPrayer/);
  assert.match(tracker, /writeTrackerTarget/);
});

test("prayer times include prohibited windows and Isha ends one minute before tomorrow Fajr", () => {
  const api = read("src/app/api/prayer-times/route.ts");
  const lib = read("src/lib/prayer-time.ts");
  const widget = read("src/modules/trackers/prayer-time-widget.tsx");
  assert.match(api, /forbiddenTimes/);
  assert.match(widget, /নিষিদ্ধ মুহূর্তের সময়সূচি/);
  assert.match(lib, /shiftPrayerClock\(tomorrowTimes\.fajr, -1\)/);
});

test("every workspace route and login/hadith page uses the personal two-line footer", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const login = read("src/app/login/page.tsx");
  const hadith = read("src/modules/hadith/hadith-library.tsx");
  const phrase = "তাহলে তাদের আর যাওয়ার মতো জায়গা থাকবে না!";
  assert.ok(workspace.includes(phrase));
  assert.ok(login.includes(phrase));
  assert.ok(hadith.includes(phrase));
});


test("waqt expiry notification opens the two confirmation forms and records the selected response", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const reminders = read("src/modules/trackers/prayer-settings.tsx");
  assert.match(reminders, /আদায় করেছ কি\?/);
  assert.match(workspace, /তুমি কি সালাত আদায় করেছ কি না/);
  assert.match(workspace, /হ্যাঁ, আদায় করেছি/);
  assert.match(workspace, /না, আদায় করিনি/);
  assert.match(workspace, /WaqtPrayerEntryForm data=\{data\} event=\{item\}/);
  assert.match(workspace, /WaqtNotPerformedForm data=\{data\} event=\{item\}/);
  assert.match(workspace, /response: "prayed" as const/);
  assert.match(workspace, /response: "not-prayed" as const/);
});

test("hadith library contains twenty unique records with exactly the required fields and source map", () => {
  const dataset = JSON.parse(read("src/data/hadith-bn.json"));
  const sourceMap = read("src/data/HADITH_SOURCES_BN.md");
  assert.equal(dataset.hadiths.length, 20);
  assert.equal(new Set(dataset.hadiths.map((item) => item.id)).size, 20);
  const fields = ["id", "category_id", "summary", "full_text_bn", "narrator", "book", "hadith_number", "chapter"].sort();
  for (const item of dataset.hadiths) {
    assert.deepEqual(Object.keys(item).sort(), fields);
    assert.ok(dataset.categories.some((category) => category.id === item.category_id));
    assert.ok(item.summary && item.full_text_bn && item.narrator && item.book && item.hadith_number && item.chapter);
    assert.ok(sourceMap.includes(item.id));
  }
});

test("new database Master SQL contains the same table-per-record schema and secured RPCs as migration 002", () => {
  const master = read("supabase/MASTER_DATABASE_SETUP.sql");
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  for (const key of ["workspace_prayer_entries", "workspace_qada_entries", "workspace_quran_entries", "workspace_dhikr_sessions", "workspace_fasting_entries", "workspace_deed_entries", "workspace_avoid_entries", "workspace_journey_observations", "workspace_deadline_plans", "workspace_deadline_tasks", "workspace_sync_state", "workspace_user_settings"]) {
    assert.ok(master.includes(key), `${key} is missing from Master SQL`);
    assert.ok(migration.includes(key), `${key} is missing from the incremental migration`);
  }
  assert.match(migration, /revoke all on function public\.load_relational_workspace\(\) from public, anon/);
  assert.match(migration, /revoke all on function public\.save_relational_workspace_changes\(jsonb,timestamptz\) from public, anon/);
  assert.match(master, /Legacy snapshot archive/);
  assert.match(master, /notify pgrst, 'reload schema'/);
});

test("relational audit query compares archived snapshot counts with the new tables and reports legacy sources", () => {
  const audit = read("supabase/WORKSPACE_DATA_AUDIT_RELATIONAL.sql");
  assert.match(audit, /old_snapshot_rows/);
  assert.match(audit, /online_rows/);
  assert.match(audit, /legacy_prayer_logs/);
  assert.match(audit, /legacy_quran_logs/);
  assert.match(audit, /relational_revision_at/);
  assert.doesNotMatch(audit, /\b(update|delete|insert)\s+into\b/i);
});

