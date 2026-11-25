import { NextRequest, NextResponse } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const tableSections = [
  ["notifications", "notifications"],
  ["journeys", "self_purification_journeys"],
  ["obstacle_templates", "obstacle_templates"],
  ["journey_obstacles", "journey_obstacles"],
  ["goals", "learning_goals"],
  ["goal_tasks", "learning_goal_tasks"],
  ["prayer_logs", "prayer_logs"],
  ["prayer_components", "prayer_components"],
  ["qada_obligations", "qada_obligations"],
  ["qada_settlements", "qada_settlements"],
  ["fasting_templates", "fasting_templates"],
  ["fasting_logs", "fasting_logs"],
  ["quran_reading_logs", "quran_reading_logs"],
  ["dhikr_templates", "dhikr_templates"],
  ["dhikr_logs", "dhikr_logs"],
  ["deed_templates", "deed_templates"],
  ["deed_logs", "deed_logs"],
  ["daily_journals", "daily_journals"]
] as const;

function withoutOwner<T extends Record<string, unknown>>(row: T) {
  const safe = { ...row };
  delete safe.user_id;
  return safe;
}

export async function GET(_request: NextRequest) {
  const context = await getApiContext(_request);
  if (isErrorResponse(context)) return context.response;

  try {
    const [{ data: profile, error: profileError }, { data: preferences, error: preferencesError }] = await Promise.all([
      context.supabase.from("profiles").select("display_name,phone").eq("id", context.user.id).maybeSingle(),
      context.supabase.from("user_preferences").select("language,theme,time_zone,maghrib_time,maghrib_day_rollover,hijri_adjustment_days,asr_school,jamaat_reminder_minutes,sleep_reminder_enabled,sleep_time,prayer_city_label,prayer_latitude,prayer_longitude").eq("user_id", context.user.id).maybeSingle()
    ]);
    if (profileError || preferencesError) throw new Error("প্রোফাইল বা সেটিংস পড়া যায়নি।");

    const pairs = await Promise.all(tableSections.map(async ([section, table]) => {
      const { data, error } = await context.supabase.from(table).select("*").eq("user_id", context.user.id)
        .order("created_at", { ascending: true }).limit(5001);
      if (error) throw new Error(`${section} export failed`);
      if ((data ?? []).length > 5000) throw new Error("একটি ডেটা বিভাগে ৫০০০-এর বেশি রেকর্ড আছে; সম্পূর্ণ ব্যাকআপের জন্য সাপোর্টেড বড়-ব্যাকআপ পদ্ধতি প্রয়োজন।");
      return [section, (data ?? []).map((row: Record<string, unknown>) => withoutOwner(row))] as const;
    }));

    const { data: attachmentRows, error: attachmentError } = await context.supabase.from("journal_attachments")
      .select("entity_type,entity_id,mime_type,file_size,created_at").eq("user_id", context.user.id).limit(5001);
    if (attachmentError) throw new Error("Attachment metadata পড়া যায়নি।");
    if ((attachmentRows ?? []).length > 5000) throw new Error("Attachment metadata ৫০০০ রেকর্ডের সীমা অতিক্রম করেছে।");

    const data: Record<string, unknown> = Object.fromEntries(pairs);
    data.profile = profile ?? {};
    data.preferences = preferences ?? {};
    data.journal_attachments = attachmentRows ?? [];

    const backup = {
      format: "amar-nfser-hisab",
      version: 1,
      exported_at: new Date().toISOString(),
      data,
      notes: [
        "This backup contains account-owned journal records and preferences.",
        "Private image binaries are not embedded; journal_attachments contains metadata only.",
        "Restore is supported only into a new/empty journal account."
      ]
    };
    const backupBytes = new TextEncoder().encode(JSON.stringify(backup)).byteLength;
    if (backupBytes > 7 * 1024 * 1024) throw new Error("Encrypted Restore API-এর নিরাপদ সীমা বজায় রাখতে এই Backup ৭ MB-এর বেশি হতে পারবে না।");

    return NextResponse.json(backup, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ব্যাকআপ তৈরি করা যায়নি।";
    return NextResponse.json({ message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
