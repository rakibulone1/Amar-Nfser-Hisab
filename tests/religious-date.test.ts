import test from "node:test";
import assert from "node:assert/strict";
import { formatBengaliDate, getReligiousDateKey } from "../src/lib/date/religious-date.ts";

const zone = "Asia/Dhaka";

test("falls back to the local calendar date when Maghrib is unavailable", () => {
  const result = getReligiousDateKey(new Date("2026-11-22T11:30:00.000Z"), zone, null);
  assert.equal(result.dateKey, "2026-11-22");
  assert.equal(result.fallback, true);
});

test("does not roll the date before Maghrib", () => {
  // 17:59 in Dhaka
  const result = getReligiousDateKey(new Date("2026-11-22T11:59:00.000Z"), zone, "18:00");
  assert.equal(result.dateKey, "2026-11-22");
  assert.equal(result.usedMaghribRollover, false);
});

test("rolls forward at the Maghrib boundary", () => {
  // 18:00 in Dhaka
  const result = getReligiousDateKey(new Date("2026-11-22T12:00:00.000Z"), zone, "18:00");
  assert.equal(result.dateKey, "2026-11-23");
  assert.equal(result.usedMaghribRollover, true);
});

test("keeps the next journal date after midnight until the following Maghrib", () => {
  // 00:30 on 23 November in Dhaka. The religious date remains 23 November.
  const result = getReligiousDateKey(new Date("2026-11-22T18:30:00.000Z"), zone, "18:00");
  assert.equal(result.dateKey, "2026-11-23");
  assert.equal(result.usedMaghribRollover, false);
});

test("validates Maghrib input and falls back for malformed values", () => {
  const result = getReligiousDateKey(new Date("2026-11-22T12:30:00.000Z"), zone, "25:90");
  assert.equal(result.dateKey, "2026-11-22");
  assert.equal(result.fallback, true);
});


test("formats valid Gregorian date keys using Bengali digits and month names", () => {
  const formatted = formatBengaliDate("2026-11-25");
  assert.match(formatted, /২৫/);
  assert.match(formatted, /নভেম্বর/);
  assert.match(formatted, /২০২৬/);
  assert.equal(formatBengaliDate("not-a-date"), "not-a-date");
});
