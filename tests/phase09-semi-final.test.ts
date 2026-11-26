import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalJournalDate } from "../src/lib/local/store.ts";
import {
  FIXED_JOURNEY_END_DATE, FIXED_JOURNEY_START_DATE, FIXED_JOURNEY_STAGES,
  getCompletedJourneyStages, getFixedJourneyProgress, getJourneyStage,
  getJourneyStageTitle, getStageCompletionOffset
} from "../src/lib/journey/stages.ts";
import type { HadithDataset } from "../src/types/hadith";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const hadith = JSON.parse(read("src/data/hadith-bn.json")) as HadithDataset;

test("Maghrib-based accounting day changes at the Bangladesh Maghrib boundary", () => {
  assert.equal(getLocalJournalDate(new Date("2026-11-25T10:59:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-25");
  assert.equal(getLocalJournalDate(new Date("2026-11-25T11:00:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-26");
  assert.equal(getLocalJournalDate(new Date("2026-11-25T18:30:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-26");
  assert.equal(getLocalJournalDate(new Date("2026-11-26T10:59:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-26");
  assert.equal(getLocalJournalDate(new Date("2026-11-26T11:00:00.000Z"), "Asia/Dhaka", "17:00"), "2026-11-27");
});

test("fixed 2026–2030 journey contains 71 stages, 1,438 days and three modules", () => {
  assert.equal(FIXED_JOURNEY_START_DATE, "2026-11-23");
  assert.equal(FIXED_JOURNEY_END_DATE, "2030-10-30");
  assert.equal(FIXED_JOURNEY_STAGES.length, 71);
  assert.equal(FIXED_JOURNEY_STAGES.reduce((sum, stage) => sum + stage.durationDays, 0), 1438);
  assert.deepEqual([1, 2, 3].map((module) => FIXED_JOURNEY_STAGES.filter((stage) => stage.module === module).length), [33, 5, 33]);
  assert.deepEqual(FIXED_JOURNEY_STAGES.slice(33, 38).map((stage) => stage.durationDays), [36, 37, 38, 37, 36]);
  assert.equal(FIXED_JOURNEY_STAGES[0].startDate, "2026-11-23");
  assert.equal(FIXED_JOURNEY_STAGES[70].endDate, "2030-10-30");
  assert.equal(new Set(FIXED_JOURNEY_STAGES.map((stage) => stage.title)).size, 71);
});

test("journey day count includes the selected start day and moves to stage two on day four", () => {
  const dayOne = getFixedJourneyProgress("2026-11-23");
  const dayFour = getFixedJourneyProgress("2026-11-26");
  assert.equal(dayOne.dayNumber, 1);
  assert.equal(dayOne.currentStage?.stageNumber, 1);
  assert.equal(dayOne.stageDay, 1);
  assert.equal(dayFour.dayNumber, 4);
  assert.equal(dayFour.currentStage?.stageNumber, 2);
  assert.equal(dayFour.stageDay, 1);
  assert.equal(dayFour.currentStage?.durationDays, 4);
});

test("backward-compatible stage helpers remain deterministic for archived journey records", () => {
  assert.equal(getJourneyStage(8).title, "প্রবৃত্তির বিরুদ্ধে অবস্থান");
  assert.equal(getCompletedJourneyStages(3), 1);
  assert.equal(getCompletedJourneyStages(4), 1);
  assert.equal(getStageCompletionOffset(3), 11);
  assert.equal(new Set(Array.from({ length: 80 }, (_, i) => getJourneyStageTitle(i + 1))).size, 80);
});

test("dashboard, trackers and prayer settings retain the Maghrib-first and dynamic-entry workflow", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const store = read("src/lib/local/store.ts");
  const prayerWidget = read("src/modules/trackers/prayer-time-widget.tsx");
  const settings = read("src/modules/trackers/prayer-settings.tsx");
  assert.match(workspace, /সালাতের বিস্তারিত হিসাব/);
  assert.match(workspace, /prayer-check-details/);
  assert.match(workspace, /rewardAmount/);
  assert.match(workspace, /journeyObservations/);
  assert.match(workspace, /deadlinePlans/);
  assert.match(store, /return "Asia\/Dhaka"/);
  assert.match(prayerWidget, /ACCOUNTING_ORDER: PrayerId\[\] = \["maghrib", "isha", "fajr", "dhuhr", "asr"\]/);
  assert.match(settings, /এই সুন্নত অংশটি কেন বাদ দিচ্ছ/);
  assert.match(store, /category: "sunnah", rakats: 2, enabled: true, required: false/);
  assert.match(store, /category === "fard" \? true/);
});

test("static hadith library contains twenty structured records and is not a tracker or API feed", () => {
  assert.equal(hadith.hadiths.length, 20);
  assert.equal(new Set(hadith.hadiths.map((item) => item.id)).size, 20);
  for (const item of hadith.hadiths) {
    assert.deepEqual(Object.keys(item).sort(), ["id", "category_id", "summary", "full_text_bn", "narrator", "book", "hadith_number", "chapter"].sort());
    assert.ok(item.summary.trim().length > 15);
    assert.ok(item.full_text_bn.trim().length > 20);
  }
  assert.match(read("src/components/frontend-workspace.tsx"), /function DailyHadithCard/);
  assert.match(read("src/data/HADITH_SOURCES_BN.md"), /H020/);
  assert.doesNotMatch(read("src/modules/trackers/tracker-center.tsx"), /function DuaForm|দোয়া সংগ্রহ/);
});

test("active workspace reads and writes per-record relational tables instead of a runtime snapshot", () => {
  const api = read("src/app/api/workspace/route.ts");
  const store = read("src/lib/local/store.ts");
  const migration = read("supabase/migrations/002_relational_workspace.sql");
  assert.match(api, /rpc\("load_relational_workspace"\)/);
  assert.match(api, /rpc\("save_relational_workspace_changes"/);
  assert.doesNotMatch(api, /user_workspace_snapshots|save_user_workspace_snapshot/);
  assert.match(store, /buildWorkspaceChanges/);
  assert.match(store, /WORKSPACE_COLLECTION_KEYS/);
  assert.match(migration, /workspace_prayer_entries/);
  assert.match(migration, /workspace_quran_entries/);
  assert.match(migration, /workspace_deadline_tasks/);
  assert.match(migration, /workspace_sync_state/);
});

test("desktop sidebar and mobile fixed navigation keep their responsive structure", () => {
  const css = read("src/app/globals.css");
  const workspace = read("src/components/frontend-workspace.tsx");
  assert.match(css, /\.workspace-sidebar\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.mobile-navigation\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(workspace, /mobile-settings-shortcut/);
  assert.match(workspace, /section-back-button/);
});
