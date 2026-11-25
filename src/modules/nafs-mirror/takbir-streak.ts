export type TakbirPrayerRow = {
  journal_date: string;
  prayer_name: string;
  fard_method: string;
  jamaat_result: string | null;
};

const DAY_MS = 86_400_000;

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function shiftDate(value: string, days: number): string {
  const date = parseDateKey(value);
  if (!date) throw new Error("Invalid journal date key.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getFullTakbirUlaDays(rows: TakbirPrayerRow[]): Set<string> {
  const byDay = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.fard_method !== "jamaat" || row.jamaat_result !== "takbir_ula") continue;
    if (!byDay.has(row.journal_date)) byDay.set(row.journal_date, new Set());
    byDay.get(row.journal_date)!.add(row.prayer_name);
  }
  // A complete day means all five distinct obligatory prayers were logged as
  // Jamaat with Takbir-e-Ula. It is a record streak, not a religious verdict.
  return new Set(Array.from(byDay.entries()).filter(([, prayers]) => prayers.size === 5).map(([day]) => day));
}

export function calculateTakbirUlaStreak(rows: TakbirPrayerRow[], endDate: string, today: string): number {
  const fullDays = getFullTakbirUlaDays(rows);
  let cursor = endDate;
  // The active Maghrib-based day is still being filled. Do not break an existing
  // run merely because the current journal day is incomplete so far.
  if (endDate === today && !fullDays.has(endDate)) cursor = shiftDate(endDate, -1);
  let streak = 0;
  for (let index = 0; index < 40; index += 1) {
    if (!fullDays.has(cursor)) break;
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export function getExpectedTakbirHistoryStart(endDate: string): string {
  const date = parseDateKey(endDate);
  if (!date) throw new Error("Invalid journal date key.");
  date.setTime(date.getTime() - 40 * DAY_MS);
  return date.toISOString().slice(0, 10);
}
