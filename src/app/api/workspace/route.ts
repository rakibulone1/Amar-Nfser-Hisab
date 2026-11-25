import { NextResponse, type NextRequest } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { data, error } = await context.supabase.from("user_workspace_snapshots")
    .select("payload, schema_version, updated_at")
    .eq("user_id", context.user.id).maybeSingle();
  if (error) return NextResponse.json({ message: "অনলাইন তথ্য লোড করা যায়নি। Master SQL সফল হয়েছে কি না পরীক্ষা করো।" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ payload: data?.payload ?? null, schemaVersion: data?.schema_version ?? null, updatedAt: data?.updated_at ?? null }, {
    headers: { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" }
  });
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  }
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, MAX_WORKSPACE_BYTES);
  if (!body.success) return NextResponse.json({ message: body.reason === "too-large" ? "ওয়ার্কস্পেস ৫ MB সীমা অতিক্রম করেছে। বড় ফাইল Attachment Storage-এ রাখতে হবে।" : "ওয়ার্কস্পেসের তথ্য পড়া যায়নি।" }, { status: body.reason === "too-large" ? 413 : 400 });
  if (!isRecord(body.data) || !isRecord(body.data.payload)) return NextResponse.json({ message: "ওয়ার্কস্পেসের কাঠামো সঠিক নয়।" }, { status: 400 });
  const payload = body.data.payload;
  const expectedUpdatedAt = body.data.expectedUpdatedAt;
  if (!(expectedUpdatedAt === null || typeof expectedUpdatedAt === "string")) {
    return NextResponse.json({ message: "অনলাইন তথ্যের সংস্করণ যাচাই করা যায়নি। Refresh করে আবার চেষ্টা করো।" }, { status: 400 });
  }
  const requiredArrays = [
    "goals", "records", "prayerDays", "notes", "prayerEntries", "qadaEntries", "quranEntries",
    "extraPrayerEntries", "dhikrTemplates", "dhikrSessions", "fastingEntries", "deedEntries",
    "avoidEntries", "duaItems", "studyEntries", "habitDefinitions", "habitLogs", "reflections",
    "journeys", "journeyMilestones", "journeyObservations", "deadlinePlans", "prayerTimesCache", "reminderEvents"
  ];
  const hasEveryArray = requiredArrays.every((key) => Array.isArray(payload[key]));
  if (payload.schemaVersion !== 3 || typeof payload.updatedAt !== "string" || !hasEveryArray
    || !isRecord(payload.preferences) || !isRecord(payload.prayerConfig) || !isRecord(payload.prayerPreferences)) {
    return NextResponse.json({ message: "ওয়ার্কস্পেসের কিছু তথ্য অনুপস্থিত বা কাঠামো সঠিক নয়। Refresh করে আবার চেষ্টা করো।" }, { status: 400 });
  }
  const serialized = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > MAX_WORKSPACE_BYTES) return NextResponse.json({ message: "ওয়ার্কস্পেস ৫ MB সীমা অতিক্রম করেছে।" }, { status: 413 });
  const { data: savedRows, error } = await context.supabase.rpc("save_user_workspace_snapshot", {
    p_payload: payload,
    p_expected_updated_at: expectedUpdatedAt
  });
  const rawSaved: unknown = Array.isArray(savedRows) ? savedRows[0] : savedRows;
  const saved = isRecord(rawSaved) ? rawSaved : null;
  if (error || !saved || typeof saved.updated_at !== "string") {
    const conflict = error?.code === "40001" || error?.message?.includes("WORKSPACE_VERSION_CONFLICT");
    if (conflict) {
      return NextResponse.json({ message: "এই অ্যাকাউন্টের তথ্য অন্য ট্যাব বা ডিভাইসে পরিবর্তিত হয়েছে। সর্বশেষ অনলাইন তথ্য Refresh করে নাও; এই পরিবর্তনটি এখনো সংরক্ষিত হয়নি।" }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    const migrationMissing = error?.code === "PGRST202" || error?.message?.includes("save_user_workspace_snapshot");
    return NextResponse.json({ message: migrationMissing
      ? "অনলাইন সংরক্ষণের নিরাপদ Database Function এখনো তৈরি হয়নি। Supabase-এ 001_atomic_workspace_snapshot.sql Migration চালাও।"
      : "অনলাইন তথ্য সংরক্ষণ করা যায়নি। Supabase Migration, RLS ও Database সংযোগ পরীক্ষা করো।" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true, updatedAt: saved.updated_at, bytes: typeof saved.payload_bytes === "number" ? saved.payload_bytes : bytes }, { headers: { "Cache-Control": "no-store" } });
}
