import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const schema = z.object({
  title: z.string().trim().min(1).max(180),
  details: z.string().trim().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional()
}).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ goalId: string }> }) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const { goalId } = await params;
  if (!z.string().uuid().safeParse(goalId).success) return NextResponse.json({ message: "সঠিক Goal ID প্রয়োজন।" }, { status: 400 });
  const body = await readJsonBody(request, 8_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "Task-এর তথ্য সঠিক নয়।" }, { status: 400 });
  const { data: goal } = await context.supabase.from("learning_goals").select("id, start_date, deadline, status")
    .eq("id", goalId).eq("user_id", context.user.id).maybeSingle();
  if (!goal) return NextResponse.json({ message: "লক্ষ্যটি পাওয়া যায়নি।" }, { status: 404 });
  if (goal.status !== "active") return NextResponse.json({ message: "শুধু চলমান লক্ষ্যে নতুন Task যোগ করা যাবে।" }, { status: 409 });
  if (typeof goal.start_date !== "string" || typeof goal.deadline !== "string") return NextResponse.json({ message: "লক্ষ্যের সময়সীমা সঠিক নয়।" }, { status: 409 });
  if (parsed.data.dueDate && (parsed.data.dueDate < goal.start_date || parsed.data.dueDate > goal.deadline)) {
    return NextResponse.json({ message: "Task-এর সময়সীমা মূল লক্ষ্যের সময়সীমার মধ্যে হতে হবে।" }, { status: 400 });
  }
  if (parsed.data.parentTaskId) {
    const { data: parent } = await context.supabase.from("learning_goal_tasks").select("id")
      .eq("id", parsed.data.parentTaskId).eq("goal_id", goalId).eq("user_id", context.user.id).maybeSingle();
    if (!parent) return NextResponse.json({ message: "Parent Task এই লক্ষ্যের অংশ নয়।" }, { status: 400 });
  }
  const { data, error } = await context.supabase.from("learning_goal_tasks").insert({
    user_id: context.user.id, goal_id: goalId, parent_task_id: parsed.data.parentTaskId || null,
    title: parsed.data.title, details: parsed.data.details || null, due_date: parsed.data.dueDate || null
  }).select("id, goal_id, parent_task_id, title, details, due_date, status, sort_order, completed_at").single();
  if (error) return NextResponse.json({ message: "Task সংরক্ষণ করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ task: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
