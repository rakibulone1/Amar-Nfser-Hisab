import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const createSchema = z.object({
  title: z.string().trim().min(1).max(120).default("তওবা ও আত্মশুদ্ধির সফর"),
  startDate: dateSchema,
  intention: z.string().trim().max(3000).optional().nullable()
}).strict();
const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  intention: z.string().trim().max(3000).optional().nullable(),
  status: z.enum(["active", "paused", "completed"]).optional()
}).strict().refine((v) => v.title !== undefined || v.intention !== undefined || v.status !== undefined);

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { data, error } = await context.supabase.from("self_purification_journeys")
    .select("id, title, start_date, intention, status, completed_at, created_at, updated_at")
    .eq("user_id", context.user.id).order("start_date", { ascending: false }).limit(25);
  if (error) return NextResponse.json({ message: "যাত্রার তথ্য লোড করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ journeys: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 8_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: body.reason === "too-large" ? 413 : 400 });
  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "শুরুর তারিখ ও তথ্য যাচাই করো।" }, { status: 400 });
  const { data, error } = await context.supabase.from("self_purification_journeys").insert({
    user_id: context.user.id,
    title: parsed.data.title,
    start_date: parsed.data.startDate,
    intention: parsed.data.intention || null
  }).select("id, title, start_date, intention, status, created_at").single();
  if (error) return NextResponse.json({ message: error.code === "23505" ? "একটি সক্রিয় যাত্রা আগে থেকেই রয়েছে। সেটি সম্পন্ন বা বিরতি দিয়ে নতুনটি শুরু করো।" : "যাত্রা সংরক্ষণ করা যায়নি। Migration পরীক্ষা করো।" }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ journey: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 8_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: 400 });
  const parsed = updateSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "আপডেটের তথ্য সঠিক নয়।" }, { status: 400 });
  const { id, ...updates } = parsed.data;
  const payload: Record<string, string | null> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.intention !== undefined) payload.intention = updates.intention || null;
  if (updates.status !== undefined) {
    payload.status = updates.status;
    payload.completed_at = updates.status === "completed" ? new Date().toISOString() : null;
  }
  const { data, error } = await context.supabase.from("self_purification_journeys")
    .update(payload).eq("id", id).eq("user_id", context.user.id)
    .select("id, title, start_date, intention, status, completed_at").maybeSingle();
  if (error || !data) return NextResponse.json({ message: "যাত্রা আপডেট করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ journey: data }, { headers: { "Cache-Control": "no-store" } });
}
