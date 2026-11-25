import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const schema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  details: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
}).strict().refine((v) => Object.keys(v).length > 0);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { taskId } = await params;
  if (!z.string().uuid().safeParse(taskId).success) return NextResponse.json({ message: "সঠিক Task ID প্রয়োজন।" }, { status: 400 });
  const body = await readJsonBody(request, 8_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "Task-এর তথ্য সঠিক নয়।" }, { status: 400 });
  if (parsed.data.dueDate) {
    const { data: currentTask } = await context.supabase.from("learning_goal_tasks").select("goal_id")
      .eq("id", taskId).eq("user_id", context.user.id).maybeSingle();
    if (!currentTask || typeof currentTask.goal_id !== "string") return NextResponse.json({ message: "Task পাওয়া যায়নি।" }, { status: 404 });
    const { data: goal } = await context.supabase.from("learning_goals").select("start_date, deadline")
      .eq("id", currentTask.goal_id).eq("user_id", context.user.id).maybeSingle();
    if (!goal || typeof goal.start_date !== "string" || typeof goal.deadline !== "string" || parsed.data.dueDate < goal.start_date || parsed.data.dueDate > goal.deadline) {
      return NextResponse.json({ message: "Task-এর সময়সীমা মূল লক্ষ্যের সময়সীমার মধ্যে হতে হবে।" }, { status: 400 });
    }
  }
  const update: Record<string, string | null> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
    update.completed_at = parsed.data.status === "completed" ? new Date().toISOString() : null;
  }
  if (parsed.data.details !== undefined) update.details = parsed.data.details || null;
  if (parsed.data.dueDate !== undefined) update.due_date = parsed.data.dueDate || null;
  const { data, error } = await context.supabase.from("learning_goal_tasks").update(update)
    .eq("id", taskId).eq("user_id", context.user.id)
    .select("id, goal_id, parent_task_id, title, details, due_date, status, sort_order, completed_at").maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Task আপডেট করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ task: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { taskId } = await params;
  if (!z.string().uuid().safeParse(taskId).success) return NextResponse.json({ message: "সঠিক Task ID প্রয়োজন।" }, { status: 400 });
  const { error } = await context.supabase.from("learning_goal_tasks").delete().eq("id", taskId).eq("user_id", context.user.id);
  if (error) return NextResponse.json({ message: "Task মুছে ফেলা যায়নি।" }, { status: 400 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
