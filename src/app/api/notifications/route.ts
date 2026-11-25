import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).strict().refine((value) => value.all === true ? value.id === undefined : Boolean(value.id));
const readSchema = z.object({ id: z.string().uuid() }).strict();

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  const bodyResult = await readJsonBody(request, 2_000);
  if (!bodyResult.success) return NextResponse.json({ message: bodyResult.reason === "too-large" ? "অনুরোধটি গ্রহণ করা যায়নি।" : "সঠিক তথ্য পাঠাও।" }, { status: bodyResult.reason === "too-large" ? 413 : 400 });
  const parsed = deleteSchema.safeParse(bodyResult.data);
  if (!parsed.success) return NextResponse.json({ message: "সঠিক Notification ID প্রয়োজন।" }, { status: 400 });

  let query = context.supabase.from("notifications").delete().eq("user_id", context.user.id);
  if (parsed.data.all !== true && parsed.data.id) query = query.eq("id", parsed.data.id);
  const { error } = await query;
  if (error) return NextResponse.json({ message: "মুছে ফেলা যায়নি।" }, { status: 400 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  const bodyResult = await readJsonBody(request, 2_000);
  if (!bodyResult.success) return NextResponse.json({ message: bodyResult.reason === "too-large" ? "অনুরোধটি গ্রহণ করা যায়নি।" : "সঠিক তথ্য পাঠাও।" }, { status: bodyResult.reason === "too-large" ? 413 : 400 });
  const parsed = readSchema.safeParse(bodyResult.data);
  if (!parsed.success) return NextResponse.json({ message: "সঠিক Notification ID প্রয়োজন।" }, { status: 400 });
  const { error } = await context.supabase.from("notifications").update({ is_read: true }).eq("id", parsed.data.id).eq("user_id", context.user.id);
  if (error) return NextResponse.json({ message: "আপডেট করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
