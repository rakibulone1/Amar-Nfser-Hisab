import { NextResponse, type NextRequest } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;

  const userId = context.user.id;
  const [journeysResult, obstaclesResult, templatesResult, goalsResult, tasksResult] = await Promise.all([
    context.supabase.from("self_purification_journeys")
      .select("id, title, start_date, intention, status, completed_at, created_at, updated_at")
      .eq("user_id", userId).order("start_date", { ascending: false }).limit(25),
    context.supabase.from("journey_obstacles")
      .select("id, title, happened_on, context, trigger_note, response_note, lesson, intensity, created_at")
      .eq("user_id", userId).order("happened_on", { ascending: false }).limit(40),
    context.supabase.from("obstacle_templates")
      .select("id, title").eq("user_id", userId).order("title").limit(100),
    context.supabase.from("learning_goals")
      .select("id, title, reason, plan, start_date, deadline, priority, status, completed_at, created_at, updated_at")
      .eq("user_id", userId).neq("status", "archived").order("deadline", { ascending: true }).limit(100),
    context.supabase.from("learning_goal_tasks")
      .select("id, goal_id, parent_task_id, title, details, due_date, status, sort_order, completed_at, created_at")
      .eq("user_id", userId).order("sort_order").limit(500)
  ]);

  const failed = journeysResult.error || obstaclesResult.error || templatesResult.error || goalsResult.error || tasksResult.error;
  if (failed) {
    return NextResponse.json({ message: "লক্ষ্য ও আত্মশুদ্ধির তথ্য লোড করা যায়নি। Migration ও Database সংযোগ পরীক্ষা করো।" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    journeys: journeysResult.data ?? [],
    obstacles: obstaclesResult.data ?? [],
    templates: templatesResult.data ?? [],
    goals: goalsResult.data ?? [],
    tasks: tasksResult.data ?? []
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
