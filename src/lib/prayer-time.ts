import type { PrayerId, PrayerTimesCache } from "@/lib/local/store";

export const BANGLADESH_TIME_ZONE = "Asia/Dhaka";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function dateTimeParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGLADESH_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getDhakaDateTimeInput(value = new Date()) {
  const parts = dateTimeParts(value);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`
  };
}

export function getDhakaDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = dateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toDhakaIso(date: string, time: string): string | null {
  if (!DATE_PATTERN.test(date) || !CLOCK_PATTERN.test(time)) return null;
  const value = new Date(`${date}T${time}:00+06:00`);
  if (!Number.isFinite(value.getTime())) return null;
  const parts = dateTimeParts(value);
  if (`${parts.year}-${parts.month}-${parts.day}` !== date || `${parts.hour}:${parts.minute}` !== time) return null;
  return value.toISOString();
}


export function previousDhakaDate(date: string) {
  if (!DATE_PATTERN.test(date)) return "";
  const value = new Date(`${date}T12:00:00+06:00`);
  if (!Number.isFinite(value.getTime())) return "";
  value.setUTCDate(value.getUTCDate() - 1);
  return getDhakaDate(value);
}

/** Civil calendar date on which a prayer belonging to a Maghrib-based journal day occurs. */
export function getPrayerCivilDate(journalDate: string, prayer: PrayerId) {
  return prayer === "maghrib" || prayer === "isha" ? previousDhakaDate(journalDate) : journalDate;
}

export function nextDhakaDate(date: string) {
  if (!DATE_PATTERN.test(date)) return "";
  const value = new Date(`${date}T12:00:00+06:00`);
  if (!Number.isFinite(value.getTime())) return "";
  value.setUTCDate(value.getUTCDate() + 1);
  return getDhakaDate(value);
}


export function shiftPrayerClock(value: string, offsetMinutes: number) {
  if (!CLOCK_PATTERN.test(value) || !Number.isInteger(offsetMinutes)) return "";
  const [hour, minute] = value.split(":").map(Number);
  const total = (hour * 60 + minute + offsetMinutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function getPrayerWaqtWindow(
  dateTimes: PrayerTimesCache | undefined,
  tomorrowTimes: PrayerTimesCache | undefined,
  prayer: PrayerId
) {
  if (!dateTimes) return null;
  const windows: Record<Exclude<PrayerId, "isha">, { start: string; end: string }> = {
    fajr: { start: dateTimes.fajr, end: dateTimes.sunrise },
    dhuhr: { start: dateTimes.dhuhr, end: dateTimes.asr },
    asr: { start: dateTimes.asr, end: dateTimes.maghrib },
    maghrib: { start: dateTimes.maghrib, end: dateTimes.isha }
  };
  if (prayer === "isha") return dateTimes.isha && tomorrowTimes?.fajr
    ? { start: dateTimes.isha, end: shiftPrayerClock(tomorrowTimes.fajr, -1) }
    : null;
  return windows[prayer];
}
