import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalJournalDate } from "../src/lib/local/store.ts";
import { getCompletedJourneyStages, getJourneyStage, getJourneyStageTitle, getStageCompletionOffset } from "../src/lib/journey/stages.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

test("Islamic accounting date changes exactly at Bangladesh Maghrib and remains stable until next Maghrib", () => {
  assert.equal(getLocalJournalDate(new Date("2026-11-25T10:59:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-25");
  assert.equal(getLocalJournalDate(new Date("2026-11-25T11:00:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-26");
  assert.equal(getLocalJournalDate(new Date("2026-11-25T18:30:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-26");
  assert.equal(getLocalJournalDate(new Date("2026-11-26T10:59:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-26");
  assert.equal(getLocalJournalDate(new Date("2026-11-26T11:00:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-27");
});

test("journey stage cycle is 3 days, then 4, then 5 and advances one day per stage", () => {
  assert.deepEqual(getJourneyStage(1), { stage: 1, dayInStage: 1, length: 3, title: "জাগরণের সূচনা" });
  assert.deepEqual(getJourneyStage(3), { stage: 1, dayInStage: 3, length: 3, title: "জাগরণের সূচনা" });
  assert.deepEqual(getJourneyStage(4), { stage: 2, dayInStage: 1, length: 4, title: "দৃঢ় সংকল্প" });
  assert.deepEqual(getJourneyStage(8), { stage: 3, dayInStage: 1, length: 5, title: "প্রবৃত্তির বিরুদ্ধে অবস্থান" });
  assert.equal(getCompletedJourneyStages(3), 0);
  assert.equal(getCompletedJourneyStages(4), 1);
  assert.equal(getCompletedJourneyStages(8), 2);
  assert.equal(getStageCompletionOffset(1), 2);
  assert.equal(getStageCompletionOffset(2), 6);
  assert.equal(getStageCompletionOffset(3), 11);
});

test("every generated stage has a unique Bengali title, including later cycles", () => {
  const titles = Array.from({ length: 80 }, (_, index) => getJourneyStageTitle(index + 1));
  assert.equal(new Set(titles).size, titles.length);
  assert.ok(titles.every((title) => /[\u0980-\u09FF]/.test(title)));
});

test("dashboard, tracker and settings follow the requested Maghrib-first workflow", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const store = read("src/lib/local/store.ts");
  const prayerWidget = read("src/modules/trackers/prayer-time-widget.tsx");
  const settings = read("src/modules/trackers/prayer-settings.tsx");
  assert.match(workspace, /সালাতের বিস্তারিত হিসাব/);
  assert.match(workspace, /prayer-check-details/);
  assert.match(workspace, /aria-expanded=\{expanded\}/);
  assert.match(workspace, /rewardAmount/);
  assert.match(workspace, /আত্মশুদ্ধির নতুন যাত্রা/);
  assert.match(workspace, /journeyObservations/);
  assert.match(workspace, /deadlinePlans/);
  assert.match(store, /return "Asia\/Dhaka"/);
  assert.match(prayerWidget, /ACCOUNTING_ORDER: PrayerId\[\] = \["maghrib", "isha", "fajr", "dhuhr", "asr"\]/);
  assert.match(settings, /এই সুন্নত অংশটি কেন বাদ দিচ্ছ/);
  assert.match(store, /category: "sunnah", rakats: 2, enabled: true, required: false/);
  assert.match(store, /category === "sunnah" \? false/);
  assert.match(store, /category === "fard" \? true/);
});

test("hadith is bundled as static app data and the personal dua collection is not exposed as a tracker", () => {
  const hadith = JSON.parse(read("src/data/hadith-bn.json")) as Array<{ id: string; summary: string; sourceUrl: string }>;
  const tracker = read("src/modules/trackers/tracker-center.tsx");
  const workspace = read("src/components/frontend-workspace.tsx");
  assert.equal(hadith.length, 10);
  assert.equal(new Set(hadith.map((item) => item.id)).size, 10);
  assert.ok(hadith.every((item) => item.summary.trim() && item.sourceUrl.startsWith("https://")));
  assert.doesNotMatch(tracker, /function DuaForm|দোয়া সংগ্রহ/);
  assert.match(workspace, /function DailyHadithCard/);
  assert.match(workspace, /60_000/);
});

test("private workspace snapshot is saved atomically through Supabase with an additive migration", () => {
  const api = read("src/app/api/workspace/route.ts");
  const store = read("src/lib/local/store.ts");
  const sql = read("supabase/MASTER_DATABASE_SETUP.sql");
  assert.ok(fs.existsSync(path.join(root, "supabase/MASTER_DATABASE_SETUP.sql")));
  assert.ok(fs.existsSync(path.join(root, "supabase/migrations/001_atomic_workspace_snapshot.sql")));
  assert.match(api, /from\("user_workspace_snapshots"\)/);
  assert.match(api, /rpc\("save_user_workspace_snapshot"/);
  assert.doesNotMatch(api, /upsert\(/);
  assert.match(api, /MAX_WORKSPACE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(store, /synchronizeCloudSnapshot/);
  assert.match(store, /scheduleCloudSync/);
  assert.match(sql, /create table if not exists public\.user_workspace_snapshots/);
  assert.match(sql, /workspace_payload_is_object/);
  assert.match(sql, /'user_workspace_snapshots'/);
  assert.match(sql, /save_user_workspace_snapshot/);
});

test("mobile navigation is fixed at the screen bottom and desktop keeps a left sidebar", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.workspace-app\s*\{\s*grid-template-columns:\s*286px/);
  assert.match(css, /\.workspace-sidebar\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.mobile-navigation\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.mobile-settings-shortcut/);
});
