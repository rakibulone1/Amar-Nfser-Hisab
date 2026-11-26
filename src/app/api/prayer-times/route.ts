import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.match(/\b([01]\d|2[0-3]):[0-5]\d\b/);
  return match?.[0] || "";
}
function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=3600" } });
}
function midpointClock(first: string, last: string) {
  if (!CLOCK.test(first) || !CLOCK.test(last)) return "";
  const toMinutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
  const a = toMinutes(first), b = toMinutes(last);
  if (b <= a) return "";
  const middle = Math.round((a + b) / 2);
  return `${String(Math.floor(middle / 60)).padStart(2, "0")}:${String(middle % 60).padStart(2, "0")}`;
}

/**
 * Prayer time adapter: AlAdhan, Karachi calculation method (1), Hanafi Asr school (1).
 * The API returns astronomical calculation times, not local mosque jamaat times.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date") || "";
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
  const validDate = !!parsedDate && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date;
  if (!validDate || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return json({ ok: false, message: "তারিখ ও অবস্থানের তথ্য সঠিক নয়।" }, 400);
  }
  const [year, month, day] = date.split("-");
  const apiDate = `${day}-${month}-${year}`;
  const upstream = new URL(`https://api.aladhan.com/v1/timings/${apiDate}`);
  upstream.searchParams.set("latitude", String(lat));
  upstream.searchParams.set("longitude", String(lon));
  upstream.searchParams.set("method", "1");
  upstream.searchParams.set("school", "1");
  upstream.searchParams.set("timezonestring", "Asia/Dhaka");
  try {
    const response = await fetch(upstream, { headers: { Accept: "application/json" }, next: { revalidate: 60 * 60 * 18 }, signal: AbortSignal.timeout(9000) });
    if (!response.ok) return json({ ok: false, message: `সময়সূচি সেবা সাময়িকভাবে উত্তর দেয়নি (${response.status})।` }, 502);
    const payload = await response.json() as { code?: number; data?: { timings?: Record<string, unknown>; date?: { readable?: string; hijri?: { date?: string } } } };
    const timings = payload.data?.timings;
    if (payload.code !== 200 || !timings) return json({ ok: false, message: "সময়সূচির তথ্য পড়া যায়নি।" }, 502);
    const sunrise = cleanTime(timings.Sunrise);
    const sunset = cleanTime(timings.Sunset) || cleanTime(timings.Maghrib);
    const solarNoon = midpointClock(sunrise, sunset);
    const normalized = {
      date, fajr: cleanTime(timings.Fajr), sunrise, dhuhr: cleanTime(timings.Dhuhr),
      asr: cleanTime(timings.Asr), maghrib: cleanTime(timings.Maghrib), isha: cleanTime(timings.Isha),
      sunset, solarNoon,
      forbiddenTimes: { sunrise, zawal: solarNoon, sunset },
      source: "আলআযান সেবা · করাচি গণনা (১) · হানাফি আসর (১)", fetchedAt: new Date().toISOString(),
      latitude: lat, longitude: lon, method: 1, school: 1
    };
    if (![normalized.fajr, normalized.sunrise, normalized.dhuhr, normalized.asr, normalized.maghrib, normalized.isha, normalized.sunset, normalized.solarNoon].every((time) => CLOCK.test(time))) {
      return json({ ok: false, message: "সময়সূচির কিছু তথ্য অসম্পূর্ণ এসেছে।" }, 502);
    }
    return json({ ok: true, timings: normalized });
  } catch {
    return json({ ok: false, message: "সময়সূচি সেবা পাওয়া যাচ্ছে না। সংরক্ষিত সময়সূচি থাকলে সেটি ব্যবহার করো।" }, 503);
  }
}
