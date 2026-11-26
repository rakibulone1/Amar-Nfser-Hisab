"use client";

import { useEffect, useState } from "react";
import { AlarmClock, CalendarClock, MapPin, RefreshCw } from "lucide-react";
import { updateLocalData, type LocalAppData, type PrayerTimesCache, type PrayerId } from "@/lib/local/store";
import { shiftPrayerClock } from "@/lib/prayer-time";

const NAMES: Record<PrayerId, string> = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
const CHRONOLOGICAL_ORDER: PrayerId[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const ACCOUNTING_ORDER: PrayerId[] = ["maghrib", "isha", "fajr", "dhuhr", "asr"];
type PrayerTimesPayload = { ok?: boolean; timings?: PrayerTimesCache; message?: string };
const inFlightPrayerTimes = new Map<string, Promise<PrayerTimesCache>>();
async function fetchPrayerTimesOnce(date: string, latitude: number, longitude: number): Promise<PrayerTimesCache> {
  const key = `${date}:${latitude}:${longitude}`;
  const existing = inFlightPrayerTimes.get(key);
  if (existing) return existing;
  const request = fetch(`/api/prayer-times?date=${date}&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json() as PrayerTimesPayload;
      if (!response.ok || !payload.ok || !payload.timings) throw new Error(payload.message || "সময়সূচি পাওয়া যায়নি।");
      return payload.timings;
    });
  inFlightPrayerTimes.set(key, request);
  try { return await request; }
  finally { if (inFlightPrayerTimes.get(key) === request) inFlightPrayerTimes.delete(key); }
}
const clockMinutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
const nowMinutes = () => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number); return p[0] * 60 + p[1]; };
const currentDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function fmt(time: string, date = currentDate()) { return new Intl.DateTimeFormat("bn-BD", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" }).format(new Date(`${date}T${time}:00+06:00`)); }
function dateOffset(base: string, offset: number) { const d = new Date(`${base}T12:00:00+06:00`); d.setUTCDate(d.getUTCDate() + offset); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
function leftLabel(minutes: number) { const safe = Math.max(0, minutes); const h = Math.floor(safe / 60); const m = safe % 60; return h ? `${h.toLocaleString("bn-BD")} ঘণ্টা ${m.toLocaleString("bn-BD")} মিনিট` : `${m.toLocaleString("bn-BD")} মিনিট`; }

export function PrayerTimeWidget({ data }: { data: LocalAppData }) {
  const [times, setTimes] = useState<PrayerTimesCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState("");
  const [, setClockTick] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setClockTick((n) => n + 1), 30_000); return () => window.clearInterval(timer); }, []);
  const date = currentDate();
  const latitude = data.prayerPreferences.latitude;
  const longitude = data.prayerPreferences.longitude;
  useEffect(() => {
    let cancelled = false;
    const getDateOffset = dateOffset;
    const loadDate = async (targetDate: string, primary: boolean) => {
      try {
        const timings = await fetchPrayerTimesOnce(targetDate, latitude, longitude);
        if (cancelled) return;
        if (primary) setTimes(timings);
        updateLocalData((current) => ({ ...current, prayerTimesCache: [timings, ...current.prayerTimesCache.filter((item) => item.date !== targetDate || item.latitude !== latitude || item.longitude !== longitude)].slice(0, 60), prayerPreferences: primary ? { ...current.prayerPreferences, lastTimesFetchedAt: timings.fetchedAt } : current.prayerPreferences }));
      } catch (error) {
        if (primary && !cancelled) setProblem(error instanceof Error ? error.message : "সময়সূচি পাওয়া যায়নি।");
      } finally { if (primary && !cancelled) setLoading(false); }
    };
    const cached = data.prayerTimesCache.find((item) => item.date === date && item.latitude === latitude && item.longitude === longitude);
    const tomorrow = getDateOffset(date, 1);
    const tomorrowCached = data.prayerTimesCache.find((item) => item.date === tomorrow && item.latitude === latitude && item.longitude === longitude);
    if (!tomorrowCached || Date.now() - new Date(tomorrowCached.fetchedAt).getTime() >= 18 * 60 * 60 * 1000) void loadDate(tomorrow, false);
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < 12 * 60 * 60 * 1000) return () => { cancelled = true; };
    const uiTimer = window.setTimeout(() => { setLoading(true); setProblem(""); }, 0);
    void loadDate(date, true);
    return () => { cancelled = true; window.clearTimeout(uiTimer); };
  // Cache is deliberately not a dependency: each local record update must not trigger another API request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, latitude, longitude, refreshKey]);

  const tomorrowDate = dateOffset(date, 1);
  const tomorrowTimes = data.prayerTimesCache.find((item) => item.date === tomorrowDate && item.latitude === latitude && item.longitude === longitude);
  const cachedCurrent = data.prayerTimesCache.find((item) => item.date === date && item.latitude === latitude && item.longitude === longitude) ?? null;
  const currentTimes = times?.date === date && times.latitude === latitude && times.longitude === longitude ? times : cachedCurrent;
  // Recalculate the countdown on every render; the 30-second clock tick
  // causes a render without coupling the timer to Prayer Times API requests.
  const state = currentTimes ? (() => {
    const now = nowMinutes();
    const next = CHRONOLOGICAL_ORDER.find((prayer) => clockMinutes(currentTimes[prayer]) > now) || "fajr";
    const nextTime = clockMinutes(currentTimes[next]);
    const delta = next === "fajr" && nextTime <= now ? nextTime + 1440 - now : nextTime - now;
    return { next, delta };
  })() : null;

  return <section className="prayer-time-widget">
    <header><div><span className="tracker-eyebrow">বাংলাদেশ · হানাফি পদ্ধতি</span><h3>আজকের ওয়াক্তের সময়</h3><p><MapPin size={13}/> {data.prayerPreferences.locationLabel}</p></div><button type="button" className="tracker-icon-button" title="সময়সূচি আবার আনো" onClick={() => { updateLocalData((current) => ({ ...current, prayerTimesCache: current.prayerTimesCache.filter((item) => item.date !== date || item.latitude !== latitude || item.longitude !== longitude) })); setTimes(null); setProblem(""); setRefreshKey((value) => value + 1); }}><RefreshCw size={16}/></button></header>
    {currentTimes ? <><div className="prayer-time-next"><span>পরবর্তী ওয়াক্ত</span><strong>{NAMES[state?.next || "fajr"]}</strong><b>{state ? leftLabel(state.delta) : "—"} বাকি</b><small>{fmt(currentTimes[state?.next || "fajr"])}</small></div><div className="prayer-time-grid">{ACCOUNTING_ORDER.map((prayer) => {
      const endTime = prayer === "fajr" ? currentTimes.sunrise : prayer === "dhuhr" ? currentTimes.asr : prayer === "asr" ? currentTimes.maghrib : prayer === "maghrib" ? currentTimes.isha : tomorrowTimes?.fajr ? shiftPrayerClock(tomorrowTimes.fajr, -1) : undefined;
      const endDate = prayer === "isha" ? tomorrowDate : date;
      return <div key={prayer} className={state?.next === prayer ? "is-next" : ""}><span>{NAMES[prayer]}</span><strong>{fmt(currentTimes[prayer], date)}</strong><small>শেষ {endTime ? fmt(endTime, endDate) : "পরের দিনের সময়সূচি আসছে"}</small></div>;
    })}<div><span>সূর্যোদয়</span><strong>{fmt(currentTimes.sunrise, date)}</strong><small>ফজরের শেষ</small></div></div><div className="prayer-time-source"><CalendarClock size={13}/> {currentTimes.source} · {loading ? "আপডেট হচ্ছে" : `সর্বশেষ হালনাগাদ ${new Intl.DateTimeFormat("bn-BD", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(currentTimes.fetchedAt))}`}</div><div className="forbidden-prayer-times">
      <div className="forbidden-prayer-heading"><strong>নিষিদ্ধ মুহূর্তের সময়সূচি</strong><small>সূর্যের গণনাকৃত অবস্থান</small></div>
      {[
        { key: "sunrise", title: "সূর্যোদয়", time: currentTimes.forbiddenTimes?.sunrise || currentTimes.sunrise, detail: "সূর্য ওঠা শুরু" },
        { key: "zawal", title: "জাওয়াল / মধ্যাহ্ন", time: currentTimes.forbiddenTimes?.zawal || currentTimes.solarNoon || currentTimes.dhuhr, detail: "সূর্যের মধ্যাহ্ন অবস্থান" },
        { key: "sunset", title: "সূর্যাস্ত", time: currentTimes.forbiddenTimes?.sunset || currentTimes.sunset || currentTimes.maghrib, detail: "সূর্য অস্ত যাওয়া" }
      ].map((item) => <div key={item.key}><span>{item.title}<small>{item.detail}</small></span><strong>{fmt(item.time, date)}</strong></div>)}
      <p className="forbidden-prayer-note">হানাফি ফিকহে সূর্যোদয় ও সূর্যাস্তের নিষেধাজ্ঞা শুধু মুহূর্তটুকুতে সীমাবদ্ধ নয়। সময়সীমা স্থান ও ঋতুভেদে পরিবর্তিত হয়; নির্দিষ্ট আমলের আগে স্থানীয় নির্ভরযোগ্য আলেম বা মসজিদের নির্দেশনা অনুসরণ করো।</p>
    </div></> : <div className="prayer-time-empty"><AlarmClock size={20}/><strong>{loading ? "ওয়াক্তের সময় আনা হচ্ছে…" : "সময়সূচি এখনো পাওয়া যায়নি"}</strong><small>{problem || "ইন্টারনেট সংযোগ এবং Settings-এ অবস্থান যাচাই করো।"}</small></div>}
    <div className="mosque-jamaat-inline"><span>স্থানীয় মসজিদের জামাত</span><small>সেটিংসে সময়গুলো হাতে লিখে রাখবে</small>{ACCOUNTING_ORDER.map((prayer) => <div key={prayer}><span>{NAMES[prayer]}</span><strong>{data.prayerPreferences.mosqueTimes[prayer] ? fmt(data.prayerPreferences.mosqueTimes[prayer]) : "নির্ধারিত নয়"}</strong></div>)}</div>
  </section>;
}
