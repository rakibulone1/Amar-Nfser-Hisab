import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const schema = z.object({
  title: z.string().trim().min(1).max(120),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  context: z.string().trim().max(3000).optional(),
  trigger: z.string().trim().max(2000).optional(),
  response: z.string().trim().max(2000).optional(),
  lesson: z.string().trim().max(2000).optional(),
  intensity: z.number().int().min(1).max(5).nullable().optional(),
  saveAsTemplate: z.boolean().optional()
}).strict();

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const [{ data: obstacles, error }, { data: templates }] = await Promise.all([
    context.supabase.from("journey_obstacles").select("id, title, happened_on, context, trigger_note, response_note, lesson, intensity, created_at")
      .eq("user_id", context.user.id).order("happened_on", { ascending: false }).limit(40),
    context.supabase.from("obstacle_templates").select("id, title").eq("user_id", context.user.id).order("title").limit(100)
  ]);
  if (error) return NextResponse.json({ message: "বাধার ইতিহাস লোড করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ obstacles: obstacles ?? [], templates: templates ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 12_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: body.reason === "too-large" ? 413 : 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "বাধার তথ্য সঠিক নয়।" }, { status: 400 });
  const { data: journey } = await context.supabase.from("self_purification_journeys").select("id")
    .eq("user_id", context.user.id).eq("status", "active").maybeSingle();
  if (!journey) return NextResponse.json({ message: "প্রথমে একটি সক্রিয় আত্মশুদ্ধির যাত্রা শুরু করো।" }, { status: 409 });

  let templateId: string | null = null;
  if (parsed.data.saveAsTemplate) {
    const { data: template, error: templateError } = await context.supabase.from("obstacle_templates")
      .upsert({ user_id: context.user.id, title: parsed.data.title }, { onConflict: "user_id,title" })
      .select("id").single();
    if (templateError) return NextResponse.json({ message: "বাধার নাম সাজেশনে সংরক্ষণ করা যায়নি।" }, { status: 400 });
    templateId = typeof template.id === "string" ? template.id : null;
  } else {
    const { data: template } = await context.supabase.from("obstacle_templates").select("id")
      .eq("user_id", context.user.id).eq("title", parsed.data.title).maybeSingle();
    templateId = typeof template?.id === "string" ? template.id : null;
  }
  const { data, error } = await context.supabase.from("journey_obstacles").insert({
    user_id: context.user.id, journey_id: journey.id, template_id: templateId,
    title: parsed.data.title, happened_on: parsed.data.happenedOn,
    context: parsed.data.context || null, trigger_note: parsed.data.trigger || null,
    response_note: parsed.data.response || null, lesson: parsed.data.lesson || null,
    intensity: parsed.data.intensity ?? null
  }).select("id, title, happened_on, context, trigger_note, response_note, lesson, intensity, created_at").single();
  if (error) return NextResponse.json({ message: "বাধার রেকর্ড সংরক্ষণ করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ obstacle: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
