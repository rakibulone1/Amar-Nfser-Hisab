import { getReligiousDateKey } from "@/lib/date/religious-date";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { calculateTakbirUlaStreak, getExpectedTakbirHistoryStart, getFullTakbirUlaDays, type TakbirPrayerRow } from "@/modules/nafs-mirror/takbir-streak";

export type NafsRangeKey = "7d" | "30d" | "90d" | "365d";
export type NafsRange = { from: string; to: string; days: number; bucket: "day" | "week" | "month" };

type Row = Record<string, unknown>;
type Dataset = {
  prayers: Row[];
  components: Row[];
  fasts: Row[];
  quran: Row[];
  dhikr: Row[];
  deeds: Row[];
  journals: Row[];
  goals: Row[];
  tasks: Row[];
  journey: Row | null;
  obstacles: Row[];
  pendingQada: number;
  settledQada: number;
  takbirHistory: Row[];
};

export type NafsMetricSummary = {
  prayerExpected: number;
  prayerRecorded: number;
  prayerCompleted: number;
  prayerMissed: number;
  prayerCompletionRate: number;
  jamaat: number;
  individual: number;
  takbirUla: number;
  takbirUlaFullDays: number;
  currentTakbirUlaStreak: number;
  lateJamaat: number;
  missedRakats: number;
  sunnahComponentsDone: number;
  sunnahRakatsDone: number;
  missedComponents: number;
  pendingQada: number;
  settledQada: number;
  fastingCompleted: number;
  fastingMissed: number;
  fastingExcused: number;
  quranSessions: number;
  quranPages: number;
  quranMinutes: number;
  dhikrSessions: number;
  dhikrCount: number;
  goodDeeds: number;
  badDeeds: number;
  journalEntries: number;
  averageEnergy: number | null;
  activeGoals: number;
  completedGoals: number;
  tasksCompleted: number;
  tasksTotal: number;
  journeyDays: number | null;
  obstacles: number;
};

export type NafsTrendPoint = {
  key: string;
  label: string;
  prayerRate: number;
  prayerDone: number;
  goodDeeds: number;
  badDeeds: number;
  quranPages: number;
  dhikrCount: number;
};

export type NafsReport = {
  range: NafsRange;
  summary: NafsMetricSummary;
  trend: NafsTrendPoint[];
  moodDistribution: { mood: string; count: number }[];
  comparison: { previousRange: { from: string; to: string }; summary: NafsMetricSummary } | null;
  generatedAt: string;
};

const DAY_MS = 86_400_000;
const VALID_RANGE_KEYS: NafsRangeKey[] = ["7d", "30d", "90d", "365d"];

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number): string {
  const parsed = parseDateKey(value);
  if (!parsed) throw new Error("তারিখের মান সঠিক নয়।");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return dateKey(parsed);
}

function dayDifference(from: string, to: string): number {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  if (!a || !b) return -1;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS) + 1;
}

function makeRange(from: string, to: string): NafsRange {
  const days = dayDifference(from, to);
  if (days < 1 || days > 366) throw new Error("রিপোর্টের সময়সীমা ১ থেকে ৩৬৬ দিনের মধ্যে হতে হবে।");
  return { from, to, days, bucket: days <= 31 ? "day" : days <= 120 ? "week" : "month" };
}

function recordRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Row => typeof item === "object" && item !== null && !Array.isArray(item));
}

function textField(row: Row | null | undefined, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" ? value : null;
}

function numberField(row: Row, key: string): number {
  const value = row[key];
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function booleanField(row: Row, key: string): boolean {
  return row[key] === true;
}

async function loadDataset(supabase: SupabaseClient<Database>, range: NafsRange): Promise<Dataset> {
  // A single server-side, read-only SECURITY INVOKER RPC replaces the former
  // 12+ PostgREST requests and paged follow-up requests. RLS remains active.
  const { data, error } = await supabase.rpc("get_nafs_report_dataset", {
    p_from: range.from,
    p_to: range.to,
    p_takbir_from: getExpectedTakbirHistoryStart(range.to)
  });
  if (error) throw new Error(`রিপোর্টের তথ্য লোড করা যায়নি: ${error.message}`);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("রিপোর্ট ডেটার গঠন সঠিক নয়। Phase 05 Migration পরীক্ষা করো।");

  const result = data as Record<string, unknown>;
  const goals = recordRows(result.goals);
  const tasks = recordRows(result.tasks);
  const prayers = recordRows(result.prayers);
  const components = recordRows(result.components);
  const fasts = recordRows(result.fasts);
  const quran = recordRows(result.quran);
  const dhikr = recordRows(result.dhikr);
  const deeds = recordRows(result.deeds);
  const journals = recordRows(result.journals);
  const obstacles = recordRows(result.obstacles);
  const takbirHistory = recordRows(result.takbirHistory);
  if (prayers.length > 5000 || components.length > 5000 || fasts.length > 5000 || quran.length > 5000
      || dhikr.length > 5000 || deeds.length > 5000 || journals.length > 5000 || goals.length > 2000
      || tasks.length > 5000 || obstacles.length > 5000 || takbirHistory.length > 500) {
    throw new Error("রিপোর্টের রেকর্ড-সীমা অতিক্রম করেছে। ছোট সময়সীমা নির্বাচন করো।");
  }

  const journeyValue = result.journey;
  const journey = typeof journeyValue === "object" && journeyValue !== null && !Array.isArray(journeyValue)
    ? journeyValue as Row
    : null;
  return {
    prayers, components, fasts, quran, dhikr, deeds, journals, goals, tasks, journey, obstacles,
    pendingQada: numberValue(result.pendingQada),
    settledQada: numberValue(result.settledQada),
    takbirHistory
  };
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localDateKey(instant: string, timeZone: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return instant.slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return instant.slice(0, 10);
  }
}

function summarize(data: Dataset, range: NafsRange, today: string, timeZone: string): NafsMetricSummary {
  const prayerCompleted = data.prayers.filter((row) => textField(row, "fard_method") !== "missed").length;
  const prayerExpected = range.days * 5;
  const completeDaysInPeriod = getFullTakbirUlaDays(data.prayers as unknown as TakbirPrayerRow[]).size;
  const fasts = data.fasts;
  const quranPages = data.quran.reduce((sum, row) => {
    const from = numberField(row, "page_from");
    const to = numberField(row, "page_to");
    return sum + (from > 0 && to > 0 ? Math.max(0, to - from + 1) : 0);
  }, 0);
  const quranMinutes = data.quran.reduce((sum, row) => sum + numberField(row, "duration_minutes"), 0);
  const energy = data.journals.map((row) => numberField(row, "energy_level")).filter((value) => value >= 1 && value <= 5);
  const completedGoals = data.goals.filter((row) => {
    const completedAt = textField(row, "completed_at");
    if (textField(row, "status") !== "completed" || !completedAt) return false;
    const completedDate = localDateKey(completedAt, timeZone);
    return completedDate >= range.from && completedDate <= range.to;
  }).length;
  const journeyStartDate = textField(data.journey, "start_date");
  const journeyDays = journeyStartDate ? Math.max(0, dayDifference(journeyStartDate, today)) : null;
  return {
    prayerExpected,
    prayerRecorded: data.prayers.length,
    prayerCompleted,
    prayerMissed: data.prayers.filter((row) => textField(row, "fard_method") === "missed").length,
    prayerCompletionRate: prayerExpected ? Math.round((prayerCompleted / prayerExpected) * 1000) / 10 : 0,
    jamaat: data.prayers.filter((row) => textField(row, "fard_method") === "jamaat").length,
    individual: data.prayers.filter((row) => textField(row, "fard_method") === "individual").length,
    takbirUla: data.prayers.filter((row) => textField(row, "jamaat_result") === "takbir_ula").length,
    takbirUlaFullDays: completeDaysInPeriod,
    currentTakbirUlaStreak: calculateTakbirUlaStreak(data.takbirHistory as unknown as TakbirPrayerRow[], range.to, today),
    lateJamaat: data.prayers.filter((row) => textField(row, "jamaat_result") === "late_complete").length,
    missedRakats: data.prayers.reduce((sum, row) => sum + numberField(row, "missed_rakat"), 0),
    sunnahComponentsDone: data.components.filter((row) => booleanField(row, "performed")).length,
    sunnahRakatsDone: data.components.filter((row) => booleanField(row, "performed")).reduce((sum, row) => sum + numberField(row, "rakats"), 0),
    missedComponents: data.components.filter((row) => !booleanField(row, "performed")).length,
    pendingQada: data.pendingQada,
    settledQada: data.settledQada,
    fastingCompleted: fasts.filter((row) => textField(row, "status") === "completed").length,
    fastingMissed: fasts.filter((row) => textField(row, "status") === "missed").length,
    fastingExcused: fasts.filter((row) => textField(row, "status") === "excused").length,
    quranSessions: data.quran.length,
    quranPages,
    quranMinutes,
    dhikrSessions: data.dhikr.length,
    dhikrCount: data.dhikr.reduce((sum, row) => sum + numberField(row, "count"), 0),
    goodDeeds: data.deeds.filter((row) => textField(row, "deed_type") === "good").length,
    badDeeds: data.deeds.filter((row) => textField(row, "deed_type") === "bad").length,
    journalEntries: data.journals.length,
    averageEnergy: energy.length ? Math.round((energy.reduce((sum, value) => sum + value, 0) / energy.length) * 10) / 10 : null,
    activeGoals: data.goals.filter((row) => textField(row, "status") === "active").length,
    completedGoals,
    tasksCompleted: data.tasks.filter((row) => textField(row, "status") === "completed").length,
    tasksTotal: data.tasks.length,
    journeyDays,
    obstacles: data.obstacles.length
  };
}

function bucketKey(value: string, type: NafsRange["bucket"]): string {
  if (type === "month") return value.slice(0, 7);
  if (type === "week") {
    const date = parseDateKey(value)!;
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day);
    return dateKey(date);
  }
  return value;
}

function bucketLabel(key: string, type: NafsRange["bucket"]): string {
  const date = parseDateKey(type === "month" ? `${key}-01` : key);
  if (!date) return key;
  if (type === "month") return new Intl.DateTimeFormat("bn-BD", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
  if (type === "week") return `সপ্তাহ ${new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", timeZone: "UTC" }).format(date)}`;
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

function makeTrend(data: Dataset, range: NafsRange): NafsTrendPoint[] {
  const buckets = new Map<string, { days: Set<string>; prayerDone: number; good: number; bad: number; pages: number; dhikr: number }>();
  for (let cursor = range.from; cursor <= range.to; cursor = shiftDate(cursor, 1)) {
    const key = bucketKey(cursor, range.bucket);
    if (!buckets.has(key)) buckets.set(key, { days: new Set(), prayerDone: 0, good: 0, bad: 0, pages: 0, dhikr: 0 });
    buckets.get(key)!.days.add(cursor);
  }
  const target = (value: string) => buckets.get(bucketKey(value, range.bucket));
  for (const row of data.prayers) { const item = target(textField(row, "journal_date") || ""); if (item && textField(row, "fard_method") !== "missed") item.prayerDone += 1; }
  for (const row of data.deeds) {
    const item = target(textField(row, "journal_date") || "");
    if (item) {
      if (textField(row, "deed_type") === "good") item.good += 1;
      else item.bad += 1;
    }
  }
  for (const row of data.quran) { const item = target(textField(row, "journal_date") || ""); const from = numberField(row, "page_from"); const to = numberField(row, "page_to"); if (item && from > 0 && to > 0) item.pages += Math.max(0, to - from + 1); }
  for (const row of data.dhikr) { const item = target(textField(row, "journal_date") || ""); if (item) item.dhikr += numberField(row, "count"); }
  return Array.from(buckets.entries()).map(([key, value]) => {
    const expected = value.days.size * 5;
    return {
      key, label: bucketLabel(key, range.bucket),
      prayerRate: expected ? Math.round((value.prayerDone / expected) * 1000) / 10 : 0,
      prayerDone: value.prayerDone, goodDeeds: value.good, badDeeds: value.bad,
      quranPages: value.pages, dhikrCount: value.dhikr
    };
  });
}

function moodDistribution(journals: Row[]) {
  const counts = new Map<string, number>();
  for (const row of journals) {
    const mood = textField(row, "mood");
    if (mood) counts.set(mood, (counts.get(mood) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count);
}

export async function getNafsReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { rangeKey?: string | null; from?: string | null; to?: string | null; compare?: boolean } = {}
): Promise<NafsReport> {
  const { data: preferencesRow, error: preferenceError } = await supabase.from("user_preferences")
    .select("time_zone,maghrib_time,maghrib_day_rollover").eq("user_id", userId).maybeSingle();
  if (preferenceError) throw new Error("ব্যবহারকারীর তারিখ-সেটিংস পড়া যায়নি।");
  const preferences = preferencesRow as unknown as { time_zone?: string | null; maghrib_time?: string | null; maghrib_day_rollover?: boolean | null } | null;
  const timeZone = preferences?.time_zone || "Asia/Dhaka";
  const maghrib = preferences?.maghrib_day_rollover === false ? null : preferences?.maghrib_time ? String(preferences.maghrib_time).slice(0, 5) : null;
  const today = getReligiousDateKey(new Date(), timeZone, maghrib).dateKey;

  let range: NafsRange;
  if (options.from || options.to) {
    if (!options.from || !options.to) throw new Error("শুরু ও শেষ—দুই তারিখই নির্বাচন করো।");
    range = makeRange(options.from, options.to);
    if (range.to > today) throw new Error("ভবিষ্যতের তারিখের রিপোর্ট তৈরি করা যাবে না।");
  } else {
    const key = VALID_RANGE_KEYS.includes(options.rangeKey as NafsRangeKey) ? options.rangeKey as NafsRangeKey : "30d";
    const days = Number(key.slice(0, -1));
    range = makeRange(shiftDate(today, -(days - 1)), today);
  }

  const previousTo = options.compare ? shiftDate(range.from, -1) : null;
  const previousRange = previousTo
    ? makeRange(shiftDate(previousTo, -(range.days - 1)), previousTo)
    : null;
  const [currentData, previousData] = await Promise.all([
    loadDataset(supabase, range),
    previousRange ? loadDataset(supabase, previousRange) : Promise.resolve(null)
  ]);
  const summary = summarize(currentData, range, today, timeZone);
  const trend = makeTrend(currentData, range);
  const comparison = previousRange && previousData ? {
    previousRange: { from: previousRange.from, to: previousRange.to },
    summary: summarize(previousData, previousRange, today, timeZone)
  } : null;

  return { range, summary, trend, moodDistribution: moodDistribution(currentData.journals), comparison, generatedAt: new Date().toISOString() };
}
