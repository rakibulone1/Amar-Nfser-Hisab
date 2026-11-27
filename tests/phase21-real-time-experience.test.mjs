import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const workspace = read("../src/components/frontend-workspace.tsx");
const store = read("../src/lib/workspace/store.ts");
const tracker = read("../src/modules/trackers/tracker-center.tsx");
const hadith = read("../src/modules/hadith/hadith-library.tsx");
const theme = read("../src/providers/theme-provider.tsx");
const toast = read("../src/components/app-toast-viewport.tsx");
const toastBus = read("../src/lib/ui/toast.ts");
const goalsCss = read("../src/app/globals.css");
const packageJson = JSON.parse(read("../package.json"));

test("top bar shows a concise server-confirmed sync state without exposing timestamps", () => {
  assert.match(store, /export function getLastSuccessfulSyncAt\(\)/);
  assert.match(store, /lastSuccessfulSyncAt = remoteUpdatedAt/);
  assert.match(workspace, /const syncLabel = syncState === "synced"/);
  assert.match(workspace, /"সিঙ্ক হয়েছে"/);
  assert.match(workspace, /"সিঙ্ক হচ্ছে…"/);
  assert.doesNotMatch(workspace, /getLastSuccessfulSyncAt\(\)/);
  assert.doesNotMatch(workspace, /সর্বশেষ সিঙ্ক/);
  assert.doesNotMatch(workspace, /formatCompactLastSyncTime/);
});

test("redundant footer cloud-sync note is removed from dashboard and settings", () => {
  assert.doesNotMatch(workspace, /cloud-sync-note/);
  assert.doesNotMatch(workspace, /সর্বশেষ পরিবর্তন অনলাইনে সংরক্ষিত হয়েছে/);
});

test("section headings share compact three-column back, centered title and action layout", () => {
  assert.match(workspace, /section-heading-unified/);
  assert.match(workspace, /page-intro-title-chip/);
  assert.doesNotMatch(workspace, /<span className="eyebrow">নিজের পথ ও পরিকল্পনা<\/span>/);
  assert.match(goalsCss, /\.section-heading-unified\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\)/s);
  assert.match(goalsCss, /\.page-intro-title-chip h1 \{[^}]*font-size:\s*13px/s);
});

test("all user-facing date ranges include day, long month and year", () => {
  assert.match(workspace, /month:\s*"long",\s*year:\s*"numeric"/);
  assert.match(tracker, /function formatTrackerDate[\s\S]*month:\s*"long",\s*year:\s*"numeric"/);
  assert.match(workspace, /formatCompactDate\(stage\.startDate\)\} – \{formatCompactDate\(stage\.endDate\)/);
});

test("dashboard journey card opens goals and next-goal card deep-links to the selected goal", () => {
  assert.match(workspace, /function navigateToGoalPlan\(planId: string\)/);
  assert.match(workspace, /url\.searchParams\.set\("tab", "goals"\)/);
  assert.match(workspace, /url\.searchParams\.set\("goalId", planId\)/);
  assert.match(workspace, /dashboard-journey-card-link/);
  assert.match(workspace, /navigateToGoalPlan\(nextPlan\.id\)/);
  assert.match(workspace, /id=\{`deadline-plan-\$\{plan\.id\}`\}/);
});

test("goal tabs are equal width and self-purification is the default view", () => {
  assert.match(workspace, /useState<"journey" \| "goals">\(\(\) =>/);
  assert.match(workspace, /=== "goals" \? "goals" : "journey"/);
  assert.match(goalsCss, /\.goals-mode-tabs\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/s);
  assert.match(workspace, /শুরুর দিন থেকে অতিক্রান্ত দিন ÷ মোট নির্ধারিত দিন/);
});

test("deadline tasks support independent add, edit, complete and delete actions", () => {
  assert.match(workspace, /function editTask\(planId: string, task: DeadlineTask\)/);
  assert.match(workspace, /function removeTask\(planId: string, taskId: string\)/);
  assert.match(workspace, /কাজ আপডেট/);
  assert.match(workspace, /কাজ সম্পাদনা/);
  assert.match(workspace, /কাজ মুছুন/);
});

test("each tracker record family supports record-level editing and deletion", () => {
  for (const kind of ["quran", "dhikr", "fasting", "good", "avoid", "ilm", "habit", "reflection"]) {
    assert.match(tracker, new RegExp(`onEditRecord\\?\\.\\("${kind}"`));
  }
  assert.match(tracker, /onEditPrayer\?\./);
  assert.match(tracker, /onEditExtraPrayer\?\./);
  assert.match(tracker, /function ExtraPrayerRecordEditor/);
  assert.match(tracker, /extraPrayerEntries: current\.extraPrayerEntries\.map/);
});

test("tracker edits update the existing relational record ID rather than creating duplicates", () => {
  assert.match(tracker, /item\.id === record\.id \? \{ \.\.\.item, \.\.\.patch/);
  assert.match(tracker, /const collection = EDIT_COLLECTIONS\[kind\]/);
  assert.match(tracker, /updateWorkspaceData\(\(current\) =>/);
});

test("background auto-save stays quiet while confirmed failures and explicit theme updates remain visible", () => {
  assert.doesNotMatch(store, /showAppToast\("success"/);
  assert.match(store, /showAppToast\("error", message\)/);
  assert.match(store, /setCloudSyncState\("synced"/);
  assert.match(theme, /showAppToast\("success"/);
  assert.match(theme, /showAppToast\("error"/);
  assert.match(toast, /aria-live=/);
  assert.match(toastBus, /CustomEvent/);
  assert.match(goalsCss, /\.app-toast-success/);
  assert.match(goalsCss, /\.app-toast-error/);
});

test("hadith detail page uses the unified heading and a clear source reference ribbon", () => {
  assert.match(hadith, /hadith-page-heading section-heading-unified/);
  assert.match(hadith, /hadith-reference-ribbon/);
  assert.match(hadith, /current\.full_text_bn/);
  assert.match(goalsCss, /\.hadith-detail-text/);
});

test("this release is a source/UI update only and does not add migrations or dependencies", () => {
  assert.equal(packageJson.version, "1.3.0");
  assert.match(packageJson.scripts["test:phase21"], /phase21-real-time-experience/);
  assert.doesNotMatch(packageJson.dependencies ? JSON.stringify(packageJson.dependencies) : "", /storage-bucket|uploadthing|new-package/);
});
