import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const timeZoneSchema = z.string().trim().min(1).max(80).refine((value) => {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
}, "Invalid time zone");
const schema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  timeZone: timeZoneSchema.optional(),
  maghribTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  maghribEnabled: z.boolean().optional(),
  hijriAdjustmentDays: z.number().int().min(-2).max(2).optional()
}).strict().refine((value) => Object.keys(value).length > 0, "At least one preference is required").refine((value) => {
  const dateFields = [value.timeZone, value.maghribTime, value.maghribEnabled, value.hijriAdjustmentDays];
  return dateFields.every((field) => field === undefined) || dateFields.every((field) => field !== undefined);
}, "Date preferences must be sent together");

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { data, error } = await context.supabase.from("user_preferences")
    .select("theme, time_zone, maghrib_time, maghrib_day_rollover, hijri_adjustment_days")
    .eq("user_id", context.user.id).maybeSingle();
  if (error) return NextResponse.json({ message: "তারিখের সেটিংস লোড করা যায়নি।" }, { status: 400 });
  return NextResponse.json({
    hasPreferences: Boolean(data),
    preferences: data ?? { theme: "light", time_zone: "Asia/Dhaka", maghrib_time: null, maghrib_day_rollover: true, hijri_adjustment_days: 0 }
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 4_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "থিম বা তারিখের সেটিংস সঠিক নয়।" }, { status: 400 });

  const { data: current, error: readError } = await context.supabase.from("user_preferences")
    .select("language, theme, time_zone, maghrib_time, maghrib_day_rollover, hijri_adjustment_days, asr_school, jamaat_reminder_minutes, sleep_reminder_enabled, sleep_time, prayer_city_label, prayer_latitude, prayer_longitude")
    .eq("user_id", context.user.id).maybeSingle();
  if (readError) return NextResponse.json({ message: "বর্তমান পছন্দের সেটিংস পড়া যায়নি।" }, { status: 503 });

  const patch = parsed.data;
  const row = {
    user_id: context.user.id,
    language: current?.language ?? "bn",
    theme: patch.theme ?? current?.theme ?? "light",
    time_zone: patch.timeZone ?? current?.time_zone ?? "Asia/Dhaka",
    maghrib_time: Object.prototype.hasOwnProperty.call(patch, "maghribTime") ? patch.maghribTime ?? null : current?.maghrib_time ?? null,
    maghrib_day_rollover: patch.maghribEnabled ?? current?.maghrib_day_rollover ?? true,
    hijri_adjustment_days: patch.hijriAdjustmentDays ?? current?.hijri_adjustment_days ?? 0,
    asr_school: current?.asr_school ?? "hanafi",
    jamaat_reminder_minutes: current?.jamaat_reminder_minutes ?? 10,
    sleep_reminder_enabled: current?.sleep_reminder_enabled ?? false,
    sleep_time: current?.sleep_time ?? "22:30",
    prayer_city_label: current?.prayer_city_label ?? null,
    prayer_latitude: current?.prayer_latitude ?? null,
    prayer_longitude: current?.prayer_longitude ?? null
  };
  const { error } = await context.supabase.from("user_preferences").upsert(row, { onConflict: "user_id" });
  if (error) return NextResponse.json({ message: "সেটিংস অনলাইনে সংরক্ষণ করা যায়নি। Supabase Master SQL পরীক্ষা করো।" }, { status: 503 });
  return NextResponse.json({ message: "পছন্দের সেটিংস অনলাইনে সংরক্ষিত হয়েছে।" }, { headers: { "Cache-Control": "no-store" } });
}
