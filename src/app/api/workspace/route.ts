import { NextResponse, type NextRequest } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;
const COLLECTIONS = new Set([
  "goals", "records", "prayerDays", "notes", "prayerEntries", "qadaEntries", "quranEntries",
  "extraPrayerEntries", "dhikrTemplates", "dhikrSessions", "fastingEntries", "deedEntries",
  "avoidEntries", "duaItems", "studyEntries", "habitDefinitions", "habitLogs", "reflections",
  "journeys", "journeyMilestones", "journeyObservations", "deadlinePlans", "deadlineTasks",
  "prayerTimesCache", "reminderEvents"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function noStore() {
  return { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };
}
function mapRpcRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  return isRecord(row) ? row : null;
}

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { data, error } = await context.supabase.rpc("load_relational_workspace");
  const row = mapRpcRow(data);
  if (error || !row || !isRecord(row.payload)) {
    const migrationMissing = error?.code === "PGRST202" || error?.message?.includes("load_relational_workspace");
    return NextResponse.json({
      message: migrationMissing
        ? "নতুন Supabase Database-এ supabase/MASTER_DATABASE_SETUP.sql সম্পূর্ণভাবে একবার চালাও।"
        : "অনলাইন তথ্য লোড করা যায়নি। সংযোগ ও ডেটাবেস সেটআপ পরীক্ষা করো।"
    }, { status: 503, headers: noStore() });
  }
  return NextResponse.json({ payload: row.payload, updatedAt: typeof row.updated_at === "string" ? row.updated_at : null }, { headers: noStore() });
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  }
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, MAX_WORKSPACE_BYTES);
  if (!body.success) return NextResponse.json({ message: body.reason === "too-large" ? "একসঙ্গে পাঠানো পরিবর্তন ৫ MB সীমা অতিক্রম করেছে।" : "পরিবর্তনের তথ্য পড়া যায়নি।" }, { status: body.reason === "too-large" ? 413 : 400 });
  if (!isRecord(body.data) || !isRecord(body.data.changes)) return NextResponse.json({ message: "পরিবর্তনের কাঠামো সঠিক নয়।" }, { status: 400 });

  const expectedUpdatedAt = body.data.expectedUpdatedAt;
  if (!(expectedUpdatedAt === null || (typeof expectedUpdatedAt === "string" && Number.isFinite(Date.parse(expectedUpdatedAt))))) {
    return NextResponse.json({ message: "অনলাইন তথ্যের সংস্করণ যাচাই করা যায়নি। Refresh করে আবার চেষ্টা করো।" }, { status: 400 });
  }
  const changes = body.data.changes;
  if (changes.collections !== undefined) {
    if (!isRecord(changes.collections)) return NextResponse.json({ message: "রেকর্ডের তালিকা সঠিক নয়।" }, { status: 400 });
    for (const [key, delta] of Object.entries(changes.collections)) {
      if (!COLLECTIONS.has(key) || !isRecord(delta) || !Array.isArray(delta.upserts) || !Array.isArray(delta.deletes)) {
        return NextResponse.json({ message: "কোনো রেকর্ডের ধরন বা পরিবর্তন সঠিক নয়।" }, { status: 400 });
      }
      if (delta.upserts.length > 5000 || delta.deletes.length > 5000) return NextResponse.json({ message: "একসঙ্গে অতিরিক্ত রেকর্ড পরিবর্তনের অনুরোধ এসেছে।" }, { status: 413 });
      for (const row of delta.upserts) {
        if (!isRecord(row) || typeof row.id !== "string" || !row.id.trim() || row.id.length > 160 || !isRecord(row.record)) {
          return NextResponse.json({ message: "একটি রেকর্ডের তথ্য অসম্পূর্ণ।" }, { status: 400 });
        }
      }
      if (delta.deletes.some((id) => typeof id !== "string" || !id.trim() || id.length > 160)) {
        return NextResponse.json({ message: "মুছে ফেলার তালিকা সঠিক নয়।" }, { status: 400 });
      }
    }
  }
  if (changes.settings !== undefined) {
    if (!isRecord(changes.settings) || !isRecord(changes.settings.preferences) || !isRecord(changes.settings.prayerConfig) || !isRecord(changes.settings.prayerPreferences)) {
      return NextResponse.json({ message: "সেটিংসের তথ্য অসম্পূর্ণ।" }, { status: 400 });
    }
  }
  const bytes = new TextEncoder().encode(JSON.stringify(changes)).byteLength;
  if (bytes > MAX_WORKSPACE_BYTES) return NextResponse.json({ message: "একসঙ্গে পাঠানো পরিবর্তন ৫ MB সীমা অতিক্রম করেছে।" }, { status: 413 });
  if (!changes.collections && !changes.settings) return NextResponse.json({ ok: true, updatedAt: expectedUpdatedAt, savedRows: 0 }, { headers: noStore() });

  const { data, error } = await context.supabase.rpc("save_relational_workspace_changes", {
    p_changes: changes,
    p_expected_updated_at: expectedUpdatedAt
  });
  const saved = mapRpcRow(data);
  if (error || !saved || typeof saved.updated_at !== "string") {
    const conflict = error?.code === "40001" || error?.message?.includes("WORKSPACE_VERSION_CONFLICT");
    if (conflict) return NextResponse.json({ message: "এই অ্যাকাউন্টের তথ্য অন্য ট্যাব বা ডিভাইসে পরিবর্তিত হয়েছে। Refresh করে সর্বশেষ তথ্য নাও; এই পরিবর্তনটি এখনো সংরক্ষিত হয়নি।" }, { status: 409, headers: noStore() });
    const migrationMissing = error?.code === "PGRST202" || error?.message?.includes("save_relational_workspace_changes");
    return NextResponse.json({ message: migrationMissing
      ? "নতুন Supabase Database-এ supabase/MASTER_DATABASE_SETUP.sql সম্পূর্ণভাবে একবার চালাও।"
      : "অনলাইন তথ্য সংরক্ষণ করা যায়নি। ডেটাবেস নীতি ও সংযোগ পরীক্ষা করো।" }, { status: 503, headers: noStore() });
  }
  return NextResponse.json({ ok: true, updatedAt: saved.updated_at, savedRows: typeof saved.saved_rows === "number" ? saved.saved_rows : 0 }, { headers: noStore() });
}
