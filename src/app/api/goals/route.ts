import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  reason: z.string().trim().max(3000).optional(),
  plan: z.string().trim().max(6000).optional(),
  startDate: dateSchema,
  deadline: dateSchema,
  priority: z.enum(["low", "normal", "high"]).default("normal")
}).strict().refine((v) => v.deadline >= v.startDate, { message: "Deadline must not precede start date." });

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const [{ data: goals, error }, { data: tasks, error: taskError }] = await Promise.all([
    context.supabase.from("learning_goals").select("id, title, reason, plan, start_date, deadline, priority, status, completed_at, created_at, updated_at")
      .eq("user_id", context.user.id).neq("status", "archived").order("deadline", { ascending: true }).limit(100),
    context.supabase.from("learning_goal_tasks").select("id, goal_id, parent_task_id, title, details, due_date, status, sort_order, completed_at, created_at")
      .eq("user_id", context.user.id).order("sort_order").limit(500)
  ]);
  if (error || taskError) return NextResponse.json({ message: "লক্ষ্যের তথ্য লোড করা যায়নি। Migration পরীক্ষা করো।" }, { status: 400 });
  return NextResponse.json({ goals: goals ?? [], tasks: tasks ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 16_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: body.reason === "too-large" ? 413 : 400 });
  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "লক্ষ্যের নাম, শুরুর তারিখ ও Deadline যাচাই করো।" }, { status: 400 });
  const { data, error } = await context.supabase.from("learning_goals").insert({
    user_id: context.user.id, title: parsed.data.title,
    reason: parsed.data.reason || null, plan: parsed.data.plan || null,
    start_date: parsed.data.startDate, deadline: parsed.data.deadline,
    priority: parsed.data.priority
  }).select("id, title, reason, plan, start_date, deadline, priority, status, created_at").single();
  if (error) return NextResponse.json({ message: "লক্ষ্য সংরক্ষণ করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ goal: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
