import { getLocalDataSnapshot, getLocalJournalDate } from "../local/store.ts";

export type ReligiousDate = {
  civilDate: string;
  dateKey: string;
  isAfterMaghrib: boolean;
  usedMaghribRollover: boolean;
  fallback: boolean;
  maghribTime: string | null;
  timeZone: string;
};

function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/**
 * The accounting day begins at local Maghrib and continues until the next
 * Maghrib. This wrapper intentionally delegates the date key to the same
 * IndexedDB-backed helper used by all tracker entry forms.
 */
export function getReligiousDateKey(now = new Date(), timeZone = "Asia/Dhaka", maghribTime: string | null = null): ReligiousDate {
  const parts = dateParts(now, timeZone);
  const civilDate = `${parts.year}-${parts.month}-${parts.day}`;
  const local = getLocalDataSnapshot();
  const cached = local.prayerTimesCache.find((item) => item.date === civilDate
    && item.latitude === local.prayerPreferences.latitude
    && item.longitude === local.prayerPreferences.longitude)?.maghrib;
  const chosen = maghribTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(maghribTime) ? maghribTime : cached || null;
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const maghribMinutes = chosen ? Number(chosen.slice(0, 2)) * 60 + Number(chosen.slice(3, 5)) : Number.POSITIVE_INFINITY;
  const isAfterMaghrib = chosen !== null && currentMinutes >= maghribMinutes;
  return {
    civilDate,
    dateKey: getLocalJournalDate(now, timeZone, chosen),
    isAfterMaghrib,
    usedMaghribRollover: isAfterMaghrib,
    fallback: chosen === null,
    maghribTime: chosen,
    timeZone
  };
}


/** Format an ISO civil date as a Bengali-localized Gregorian date. */
export function formatBengaliDate(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
