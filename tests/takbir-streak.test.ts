import test from "node:test";
import assert from "node:assert/strict";
import { calculateTakbirUlaStreak, getExpectedTakbirHistoryStart, getFullTakbirUlaDays } from "../src/modules/nafs-mirror/takbir-streak.ts";

const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
function fullDay(day: string) {
  return prayers.map((prayer_name) => ({ journal_date: day, prayer_name, fard_method: "jamaat", jamaat_result: "takbir_ula" }));
}

test("a full day requires all five distinct prayers with Takbir-e-Ula in Jamaat", () => {
  const all = fullDay("2026-11-20");
  assert.deepEqual([...getFullTakbirUlaDays(all)], ["2026-11-20"]);
  assert.equal(getFullTakbirUlaDays(all.slice(1)).size, 0);
  assert.equal(getFullTakbirUlaDays(all.map((row, index) => index === 2 ? { ...row, fard_method: "individual" } : row)).size, 0);
});

test("the in-progress Maghrib-based day does not break the previous completed streak", () => {
  const rows = [...fullDay("2026-11-21"), ...fullDay("2026-11-22"), ...fullDay("2026-11-23").slice(0, 3)];
  assert.equal(calculateTakbirUlaStreak(rows, "2026-11-23", "2026-11-23"), 2);
});

test("a completed current day is included and a historical missing day breaks the streak", () => {
  const full = [...fullDay("2026-11-21"), ...fullDay("2026-11-22"), ...fullDay("2026-11-23")];
  assert.equal(calculateTakbirUlaStreak(full, "2026-11-23", "2026-11-23"), 3);
  assert.equal(calculateTakbirUlaStreak(full, "2026-11-23", "2026-11-24"), 3);
  assert.equal(calculateTakbirUlaStreak(full.filter((row) => row.journal_date !== "2026-11-22"), "2026-11-23", "2026-11-24"), 1);
});

test("history query begins 40 calendar days before the ending journal date", () => {
  assert.equal(getExpectedTakbirHistoryStart("2026-11-23"), "2026-10-14");
});
