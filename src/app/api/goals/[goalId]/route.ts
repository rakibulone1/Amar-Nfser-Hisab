import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const schema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  reason: z.string().trim().max(3000).nullable().optional(),
  plan: z.string().trim().max(6000).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional()
}).strict().refine((v) => Object.keys(v).length > 0);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { goalId } = await params;
  if (!z.string().uuid().safeParse(goalId).success) return NextResponse.json({ message: "সঠিক Goal ID প্রয়োজন।" }, { status: 400 });
  const body = await readJsonBody(request, 12_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "লক্ষ্যের তথ্য সঠিক নয়।" }, { status: 400 });
  const update: Record<string, string | null> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.reason !== undefined) update.reason = parsed.data.reason || null;
  if (parsed.data.plan !== undefined) update.plan = parsed.data.plan || null;
  if (parsed.data.startDate !== undefined) update.start_date = parsed.data.startDate;
  if (parsed.data.deadline !== undefined) update.deadline = parsed.data.deadline;
  if (parsed.data.priority !== undefined) update.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
    update.completed_at = parsed.data.status === "completed" ? new Date().toISOString() : null;
  }
  const { data, error } = await context.supabase.from("learning_goals").update(update)
    .eq("id", goalId).eq("user_id", context.user.id)
    .select("id, title, reason, plan, start_date, deadline, priority, status, completed_at").maybeSingle();
  if (error || !data) return NextResponse.json({ message: "লক্ষ্য আপডেট করা যায়নি। Deadline শুরুর তারিখের আগে হতে পারে না।" }, { status: 400 });
  return NextResponse.json({ goal: data }, { headers: { "Cache-Control": "no-store" } });
}
