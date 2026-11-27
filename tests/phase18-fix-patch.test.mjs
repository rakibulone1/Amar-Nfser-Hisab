import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Maghrib day test uses the current canonical getJournalDate helper", () => {
  const phase09 = read("tests/phase09-semi-final.test.ts");
  const store = read("src/lib/workspace/store.ts");
  assert.match(phase09, /import \{ getJournalDate \} from "\.\.\/src\/lib\/workspace\/store\.ts"/);
  assert.doesNotMatch(phase09, /getLocalJournalDate/);
  assert.match(store, /export function getJournalDate\(/);
});

test("archived journey records keep their legacy stage-three title without changing the fixed journey", () => {
  const stages = read("src/lib/journey/stages.ts");
  assert.match(stages, /LEGACY_JOURNEY_STAGE_TITLE_OVERRIDES[\s\S]*?3:\s*"প্রবৃত্তির বিরুদ্ধে অবস্থান"/);
  assert.match(stages, /title:\s*LEGACY_JOURNEY_STAGE_TITLE_OVERRIDES\[stageNumber\]\s*\|\|\s*getJourneyStageTitle\(stageNumber\)/);
  assert.match(stages, /const moduleNumber:\s*1 \| 2 \| 3/);
  assert.doesNotMatch(stages, /const module:/);
});

test("hadith initial selection is hydration-stable and does not set state in an effect", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  assert.match(workspace, /useState<HadithRecord>\(\(\) => chooseDailyHadith\(date\)\)/);
  assert.doesNotMatch(workspace, /useEffect\(\(\) => \{ setItem\(chooseRandomHadith\(\)\); \}, \[\]\)/);
});

test("quick note resets on Maghrib accounting-day key change rather than an effect state update", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  assert.match(workspace, /<QuickNote key=\{date\} date=\{date\}/);
  assert.doesNotMatch(workspace, /useEffect\(\(\) => setValue\(initialValue\)/);
  assert.match(workspace, /<DashboardView key=\{liveDay\} data=\{data\}/);
});

test("reward draft tracks server milestone changes without a cascading effect", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  assert.match(workspace, /const milestoneKey =/);
  assert.match(workspace, /if \(rewardDraft\.sourceKey !== milestoneKey\) setRewardDraft\(initialRewardDraft\)/);
  assert.doesNotMatch(workspace, /useEffect\(\(\) => \{[\s\S]{0,180}setRewardTitle/);
});

test("tracker wizard remounts on query target changes instead of synchronizing props in an effect", () => {
  const tracker = read("src/modules/trackers/tracker-center.tsx");
  assert.match(tracker, /<PrayerWizard key=\{`\$\{initialPrayer \|\| "default"\}:\$\{initialQada \? "qada" : "regular"\}:\$\{initialDate \|\| "today"\}/);
  assert.doesNotMatch(tracker, /useEffect\(\(\) => \{ if \(initialPrayer\) setPrayer/);
});

test("lint cleanup removes unused workspace locals and unused destructuring", () => {
  const workspace = read("src/components/frontend-workspace.tsx");
  const store = read("src/lib/workspace/store.ts");
  assert.doesNotMatch(workspace, /description:\s*_description/);
  assert.doesNotMatch(workspace, /const unrecordedPrayerCount\s*=/);
  assert.doesNotMatch(workspace, /const missedPrayerCount\s*=/);
  assert.doesNotMatch(workspace, /const router = useRouter\(\);\s*const \[displayName/);
  assert.doesNotMatch(store, /tasks:\s*_tasks/);
  assert.match(store, /Object\.fromEntries\(Object\.entries\(value\)\.filter\(\(\[key\]\) => key !== "tasks"\)\)/);
});
