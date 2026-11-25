import { NextRequest, NextResponse } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";

const sections = [
  "notifications", "journeys", "obstacle_templates", "journey_obstacles", "goals", "goal_tasks",
  "prayer_logs", "prayer_components", "qada_obligations", "qada_settlements", "fasting_templates",
  "fasting_logs", "quran_reading_logs", "dhikr_templates", "dhikr_logs", "deed_templates", "deed_logs",
  "daily_journals", "journal_attachments"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;

  const body = await readJsonBody(request, 10 * 1024 * 1024);
  if (!body.success) {
    return NextResponse.json({ message: body.reason === "too-large" ? "ব্যাকআপ ফাইল ১০ MB সীমা অতিক্রম করেছে।" : "ব্যাকআপ JSON পড়া যায়নি।" }, { status: body.reason === "too-large" ? 413 : 400 });
  }
  if (!isRecord(body.data) || body.data.confirmRestore !== true || !isRecord(body.data.backup)) {
    return NextResponse.json({ message: "Restore নিশ্চিতকরণ বা ব্যাকআপ ফরম্যাট সঠিক নয়।" }, { status: 400 });
  }

  const backup = body.data.backup;
  if (backup.format !== "amar-nfser-hisab" || backup.version !== 1 || !isRecord(backup.data)) {
    return NextResponse.json({ message: "এই ব্যাকআপ সংস্করণ সমর্থিত নয়।" }, { status: 400 });
  }
  for (const section of sections) {
    const rows = backup.data[section] ?? [];
    if (!Array.isArray(rows) || rows.length > 5000 || rows.some((row) => !isRecord(row))) {
      return NextResponse.json({ message: `ব্যাকআপের ${section} বিভাগ সঠিক নয় বা সীমা অতিক্রম করেছে।` }, { status: 400 });
    }
  }

  const { data, error } = await context.supabase.rpc("restore_personal_backup", { p_backup: backup });
  if (error) {
    const raw = error.message || "Restore ব্যর্থ হয়েছে।";
    const safeMessage = raw.toLowerCase().includes("empty journal account")
      ? "এই অ্যাকাউন্টে আগে থেকেই Journal রেকর্ড আছে। নিরাপত্তার জন্য Restore শুধু নতুন/খালি অ্যাকাউন্টে করা যাবে।"
      : raw.toLowerCase().includes("backup") || raw.toLowerCase().includes("section")
        ? "ব্যাকআপের কাঠামো বা ডেটা যাচাইয়ে সমস্যা হয়েছে। মূল Export ফাইলটি ব্যবহার করো।"
        : "ডেটা Restore করা যায়নি। Migration 0003 এবং Supabase SQL Error পরীক্ষা করো।";
    return NextResponse.json({ message: safeMessage }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ message: "ব্যাকআপ Restore সম্পন্ন হয়েছে।", result: data }, {
    status: 200,
    headers: { "Cache-Control": "private, no-store, max-age=0" }
  });
}
