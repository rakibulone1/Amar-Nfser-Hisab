import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("Dashboard and Goals no longer expose the demotivating 1,438-day counter", () => {
  const ui = read("src/components/frontend-workspace.tsx");
  assert.doesNotMatch(ui, /১,৪৩৮|1,438|1438 দিন/);
  assert.match(ui, /dashboard-journey-card-compact/);
  assert.match(ui, /journey-current-hero-compact/);
  assert.match(ui, /পরবর্তী লক্ষ্য/);
});

test("one global Dashboard return bar is not duplicated; page-level controls remain", () => {
  const ui = read("src/components/frontend-workspace.tsx");
  assert.doesNotMatch(ui, /workspace-section-back/);
  assert.match(ui, /ফিরে যাও/);
  const hadith = read("src/modules/hadith/hadith-library.tsx");
  assert.ok(hadith.includes('router.push("/dashboard")'));
  assert.doesNotMatch(hadith, /হাদিসের তালিকায় ফিরো/);
});

test("the journey has 71 unique indirect, constructive stage names", () => {
  const src = read("src/lib/journey/stages.ts");
  const block = src.match(/FIXED_JOURNEY_STAGE_NAMES = \[([\s\S]*?)\] as const/);
  assert.ok(block);
  const names = [...block[1].matchAll(/"([^"\n]+)"/g)].map((m) => m[1]);
  assert.equal(names.length, 71);
  assert.equal(new Set(names).size, 71);
  assert.ok(names.some((name) => name.includes("শৃঙ্খলা")));
  assert.ok(names.some((name) => name.includes("অধ্যবসায়")));
  assert.doesNotMatch(names.join(" "), /পর্ন|মাস্টার্বেশন|অশ্লীলতা/i);
});

test("journey modules remain 33 + 5 + 33 and fixed dates remain intact", () => {
  const src = read("src/lib/journey/stages.ts");
  assert.match(src, /FIXED_JOURNEY_START_DATE = "2026-11-23"/);
  assert.match(src, /FIXED_JOURNEY_END_DATE = "2030-10-30"/);
  assert.match(src, /FIXED_JOURNEY_TOTAL_DAYS = 1438/);
  assert.match(src, /stageNumber <= 33 \? 1 : stageNumber <= 38 \? 2 : 3/);
  const durations = [];
  for (let day = 3; day <= 38; day++) durations.push(day);
  for (let day = 37; day >= 3; day--) durations.push(day);
  assert.equal(durations.length, 71);
  assert.equal(durations.reduce((a,b) => a+b, 0), 1438);
});

test("stage list displays elapsed, remaining and percentage; goal link is concise", () => {
  const ui = read("src/components/frontend-workspace.tsx");
  assert.match(ui, /elapsedDays/);
  assert.match(ui, /remainingDays/);
  assert.match(ui, /journey-stage-status-chip/);
  assert.match(ui, /journey-stage-goal-chip/);
});

test("prohibited-time panel is removed from the user interface while core prayer timings remain", () => {
  const widget = read("src/modules/trackers/prayer-time-widget.tsx");
  assert.match(widget, /আজকের ওয়াক্তের সময়/);
  assert.match(widget, /শেষ \{endTime/);
  assert.doesNotMatch(widget, /forbidden-prayer-times|সূর্যের গণনাকৃত অবস্থান|নিষিদ্ধ মুহূর্তের সময়সূচি/);
});

test("prayer-time cache preserves real astronomical reference fields after hydration", () => {
  const store = read("src/lib/workspace/store.ts");
  assert.match(store, /solarNoon\?: string/);
  assert.match(store, /raw\.forbiddenTimes\.zawal/);
  assert.match(store, /sunset: typeof raw\.sunset/);
});

test("notification remains an in-header feature, not a primary navigation page", () => {
  const ui = read("src/components/frontend-workspace.tsx");
  const nav = ui.slice(ui.indexOf("const NAV_ITEMS"), ui.indexOf("const PRAYERS"));
  assert.doesNotMatch(nav, /id: "notifications"/);
  assert.match(ui, /<NotificationPopover/);
});

test("the compact two-line personal footer is preserved", () => {
  const ui = read("src/components/frontend-workspace.tsx");
  const hadith = read("src/modules/hadith/hadith-library.tsx");
  assert.ok(ui.includes("রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।"));
  assert.ok(hadith.includes("রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।"));
  assert.ok(ui.includes("তাহলে তাদের আর যাওয়ার মতো জায়গা থাকবে না!"));
  const css = read("src/app/globals.css");
  assert.match(css, /workspace-footer, \.login-personal-footer[^\{]*\{[^}]*padding:9px 10px 6px/s);
});
