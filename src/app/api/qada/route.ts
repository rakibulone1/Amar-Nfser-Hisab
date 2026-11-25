import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const schema = z.object({ obligationId: z.string().uuid(), note: z.string().trim().max(1000).optional(), performedAt: z.string().datetime().optional() }).strict();

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { data: obligations, error } = await context.supabase.from("qada_obligations")
    .select("id, prayer_log_id, prayer_name, missed_on, status, created_at, settled_at")
    .eq("user_id", context.user.id).order("missed_on", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ message: "কাজা হিসাব লোড করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ obligations: obligations ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 4_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "কাজা এন্ট্রির তথ্য সঠিক নয়।" }, { status: 400 });
  const { data, error } = await context.supabase.from("qada_settlements").insert({
    user_id: context.user.id, obligation_id: parsed.data.obligationId,
    note: parsed.data.note || null, performed_at: parsed.data.performedAt || new Date().toISOString()
  }).select("id, obligation_id, performed_at").single();
  if (error) return NextResponse.json({ message: error.code === "23505" ? "এই কাজাটি আগে আদায় হিসেবে সংরক্ষিত হয়েছে।" : "কাজা আদায় হিসেবে সংরক্ষণ করা যায়নি। বকেয়া রেকর্ড ও Migration পরীক্ষা করো।" }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ settlement: data, message: "কাজা আদায়ের রেকর্ড সংরক্ষিত হয়েছে।" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
