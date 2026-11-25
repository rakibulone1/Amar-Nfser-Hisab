import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(10).max(128),
  confirmPassword: z.string().min(10).max(128)
}).strict().refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"] });

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  const bodyResult = await readJsonBody(request, 12_000);
  if (!bodyResult.success) return NextResponse.json({ message: bodyResult.reason === "too-large" ? "অনুরোধটি গ্রহণ করা যায়নি।" : "সঠিক তথ্য পাঠাও।" }, { status: bodyResult.reason === "too-large" ? 413 : 400 });
  const parsed = schema.safeParse(bodyResult.data);
  if (!parsed.success) return NextResponse.json({ message: "নতুন পাসওয়ার্ডের তথ্য সঠিক নয়।" }, { status: 400 });

  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  if (!context.user.email) return NextResponse.json({ message: "সেশন শেষ হয়েছে। আবার লগইন করো।" }, { status: 401 });

  const { error: verifyError } = await context.supabase.auth.signInWithPassword({ email: context.user.email, password: parsed.data.currentPassword });
  if (verifyError) return NextResponse.json({ message: "বর্তমান পাসওয়ার্ড সঠিক নয়।" }, { status: 401 });

  const { error: updateError } = await context.supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (updateError) return NextResponse.json({ message: "পাসওয়ার্ড পরিবর্তন করা যায়নি। নতুন পাসওয়ার্ডটি অন্যভাবে চেষ্টা করো।" }, { status: 400 });
  return NextResponse.json({ message: "পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।" }, { headers: { "Cache-Control": "no-store" } });
}
