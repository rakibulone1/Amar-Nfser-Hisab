import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";

const schema = z.object({
  displayName: z.string().trim().max(80).transform((value) => value || null),
  phone: z.string().trim().max(25).transform((value) => value || null)
}).strict();

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { data, error } = await context.supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", context.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ message: "প্রোফাইলের তথ্য লোড করা যায়নি।" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ profile: { displayName: data?.display_name ?? null, phone: data?.phone ?? null } }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  const bodyResult = await readJsonBody(request, 5_000);
  if (!bodyResult.success) return NextResponse.json({ message: bodyResult.reason === "too-large" ? "অনুরোধটি গ্রহণ করা যায়নি।" : "সঠিক তথ্য পাঠাও।" }, { status: bodyResult.reason === "too-large" ? 413 : 400 });
  const parsed = schema.safeParse(bodyResult.data);
  if (!parsed.success) return NextResponse.json({ message: "প্রোফাইলের তথ্য সঠিক নয়।" }, { status: 400 });

  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;

  const { error } = await context.supabase.from("profiles").upsert({ id: context.user.id, display_name: parsed.data.displayName, phone: parsed.data.phone }, { onConflict: "id" });
  if (error) return NextResponse.json({ message: "প্রোফাইল সংরক্ষণ করা যায়নি। Database Migration পরীক্ষা করো।" }, { status: 400 });
  return NextResponse.json({ message: "প্রোফাইল আপডেট হয়েছে।" }, { headers: { "Cache-Control": "no-store" } });
}
