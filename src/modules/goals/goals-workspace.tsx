"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronDown, ChevronRight, CircleCheck, Clock3, Flag, ListChecks, Pause, Plus, RotateCcw, Sparkles, Target } from "lucide-react";
import { getReligiousDateKey } from "@/lib/date/religious-date";
import { fetchJsonOnce } from "@/lib/client/fetch-json-once";

type Journey = { id: string; title: string; start_date: string; intention: string | null; status: "active" | "paused" | "completed" };
type Obstacle = { id: string; title: string; happened_on: string; context: string | null; trigger_note: string | null; response_note: string | null; lesson: string | null; intensity: number | null };
type ObstacleTemplate = { id: string; title: string };
type Goal = { id: string; title: string; reason: string | null; plan: string | null; start_date: string; deadline: string; priority: "low" | "normal" | "high"; status: "active" | "paused" | "completed" | "archived" };
type GoalTask = { id: string; goal_id: string; parent_task_id: string | null; title: string; details: string | null; due_date: string | null; status: "pending" | "in_progress" | "completed" };

type Notice = { type: "success" | "error"; message: string } | null;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function daysBetween(start: string, end = todayKey()) {
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}
async function responseData<T>(response: Response): Promise<T & { message?: string }> {
  return response.json() as Promise<T & { message?: string }>;
}

export function GoalsWorkspace({ initialJournalDate, timeZone, maghribTime }: { initialJournalDate: string; timeZone: string; maghribTime: string | null }) {
  const [tab, setTab] = useState<"journey" | "learning">("journey");
  const [currentJournalDate, setCurrentJournalDate] = useState(initialJournalDate);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [obstacleTemplates, setObstacleTemplates] = useState<ObstacleTemplate[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [journeyTitle, setJourneyTitle] = useState("তওবা ও আত্মশুদ্ধির সফর");
  const [journeyStart, setJourneyStart] = useState(initialJournalDate);
  const [journeyIntention, setJourneyIntention] = useState("");
  const [obstacleTitle, setObstacleTitle] = useState("");
  const [obstacleDate, setObstacleDate] = useState(initialJournalDate);
  const [obstacleContext, setObstacleContext] = useState("");
  const [obstacleTrigger, setObstacleTrigger] = useState("");
  const [obstacleResponse, setObstacleResponse] = useState("");
  const [obstacleLesson, setObstacleLesson] = useState("");
  const [obstacleIntensity, setObstacleIntensity] = useState("3");
  const [saveObstacleTemplate, setSaveObstacleTemplate] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalReason, setGoalReason] = useState("");
  const [goalPlan, setGoalPlan] = useState("");
  const [goalStart, setGoalStart] = useState(initialJournalDate);
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalPriority, setGoalPriority] = useState<"low" | "normal" | "high">("normal");

  const load = useCallback(async () => {
    try {
      const result = await fetchJsonOnce<{
        journeys?: Journey[];
        obstacles?: Obstacle[];
        templates?: ObstacleTemplate[];
        goals?: Goal[];
        tasks?: GoalTask[];
        message?: string;
      }>("/api/goals/workspace");
      if (!result.ok) throw new Error(result.data.message || "তথ্য লোড করা যায়নি। SQL Migration পরীক্ষা করো।");
      setJourneys(result.data.journeys ?? []);
      setObstacles(result.data.obstacles ?? []);
      setObstacleTemplates(result.data.templates ?? []);
      setGoals(result.data.goals ?? []);
      setTasks(result.data.tasks ?? []);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "তথ্য লোড করা যায়নি।" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const updateDate = () => setCurrentJournalDate(getReligiousDateKey(new Date(), timeZone, maghribTime).dateKey);
    const interval = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(interval);
  }, [timeZone, maghribTime]);

  const activeJourney = journeys.find((item) => item.status === "active") ?? null;
  const activeGoals = goals.filter((item) => item.status !== "archived");

  async function createJourney(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: journeyTitle, startDate: journeyStart, intention: journeyIntention }) });
      const result = await responseData<{ journey?: Journey }>(response);
      if (!response.ok) throw new Error(result.message || "যাত্রা শুরু করা যায়নি।");
      setJourneyIntention(""); setNotice({ type: "success", message: "আত্মশুদ্ধির যাত্রা শুরু হয়েছে।" }); await load();
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি।" }); }
    finally { setBusy(false); }
  }

  async function updateJourney(status: "paused" | "completed" | "active") {
    if (!activeJourney) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/journey", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeJourney.id, status }) });
      const result = await responseData<{ journey?: Journey }>(response);
      if (!response.ok) throw new Error(result.message || "যাত্রা আপডেট হয়নি।");
      setNotice({ type: "success", message: status === "completed" ? "এই যাত্রা সম্পন্ন হিসেবে সংরক্ষিত হয়েছে।" : status === "paused" ? "যাত্রায় বিরতি দেওয়া হয়েছে।" : "যাত্রা আবার চালু হয়েছে।" }); await load();
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "আপডেট হয়নি।" }); }
    finally { setBusy(false); }
  }

  async function createObstacle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/journey/obstacles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: obstacleTitle, happenedOn: obstacleDate, context: obstacleContext, trigger: obstacleTrigger, response: obstacleResponse, lesson: obstacleLesson, intensity: Number(obstacleIntensity), saveAsTemplate: saveObstacleTemplate }) });
      const result = await responseData<{ obstacle?: Obstacle }>(response);
      if (!response.ok) throw new Error(result.message || "রেকর্ড সংরক্ষণ করা যায়নি।");
      setObstacleTitle(""); setObstacleContext(""); setObstacleTrigger(""); setObstacleResponse(""); setObstacleLesson(""); setSaveObstacleTemplate(false);
      setNotice({ type: "success", message: "বাধার রেকর্ড সংরক্ষিত হয়েছে।" }); await load();
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি।" }); }
    finally { setBusy(false); }
  }

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: goalTitle, reason: goalReason, plan: goalPlan, startDate: goalStart, deadline: goalDeadline, priority: goalPriority }) });
      const result = await responseData<{ goal?: Goal }>(response);
      if (!response.ok) throw new Error(result.message || "লক্ষ্য সংরক্ষণ করা যায়নি।");
      setGoalTitle(""); setGoalReason(""); setGoalPlan(""); setGoalDeadline(""); setNotice({ type: "success", message: "নতুন লক্ষ্য তৈরি হয়েছে।" }); await load();
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি।" }); }
    finally { setBusy(false); }
  }

  return (
    <div className="workspace-stack">
      <header className="workspace-heading">
        <div><span className="eyebrow">INTENTION, DISCIPLINE & LEARNING</span><h1>লক্ষ্য ও সময়সীমা</h1><p>নিজের পরিবর্তন, বাধা এবং অর্জনের পরিকল্পনা এক জায়গায়।</p></div>
        <div className="workspace-heading-icon"><Target size={25} /></div>
      </header>
      <div className="sub-tabs" role="tablist" aria-label="লক্ষ্য ও সময়সীমার বিভাগ">
        <button type="button" className={tab === "journey" ? "sub-tab active" : "sub-tab"} onClick={() => setTab("journey")}><Sparkles size={16} /> তওবা ও আত্মশুদ্ধির সফর</button>
        <button type="button" className={tab === "learning" ? "sub-tab active" : "sub-tab"} onClick={() => setTab("learning")}><ListChecks size={16} /> ইলম ও অর্জনের পরিকল্পনা</button>
      </div>
      {notice && <div className={`workspace-notice ${notice.type}`} role="status">{notice.message}</div>}
      {loading ? <div className="workspace-loading panel">তথ্য লোড হচ্ছে…</div> : tab === "journey" ? (
        <section className="workspace-grid">
          <div className="workspace-column">
            {activeJourney ? (
              <article className="panel journey-summary-card">
                <div className="journey-summary-top"><span className="status-pill status-active">সক্রিয় যাত্রা</span><span className="date-line"><CalendarDays size={14} /> শুরু {dateLabel(activeJourney.start_date)}</span></div>
                <div className="journey-counter"><strong>{daysBetween(activeJourney.start_date, currentJournalDate).toLocaleString("bn-BD")}</strong><span>দিন অতিবাহিত</span></div>
                <h2>{activeJourney.title}</h2>
                {activeJourney.intention && <p>{activeJourney.intention}</p>}
                <div className="journey-actions">
                  <button className="secondary-button" disabled={busy} onClick={() => void updateJourney("paused")}><Pause size={15} /> বিরতি</button>
                  <button className="secondary-button" disabled={busy} onClick={() => void updateJourney("completed")}><CircleCheck size={15} /> সম্পন্ন</button>
                </div>
              </article>
            ) : (
              <article className="panel workspace-card">
                <div className="workspace-card-title"><span className="workspace-icon gold"><Sparkles size={19} /></span><div><h2>নতুন আত্মশুদ্ধির যাত্রা</h2><p>নিজের জন্য একটি নতুন শুরুর তারিখ নির্ধারণ করো।</p></div></div>
                <form className="entry-form" onSubmit={createJourney}>
                  <label className="field-label" htmlFor="journey-title">যাত্রার নাম</label><input id="journey-title" className="text-input" value={journeyTitle} onChange={(e) => setJourneyTitle(e.target.value)} maxLength={120} required />
                  <label className="field-label" htmlFor="journey-date">শুরুর তারিখ</label><input id="journey-date" className="text-input" type="date" value={journeyStart} onChange={(e) => setJourneyStart(e.target.value)} required />
                  <label className="field-label" htmlFor="journey-intention">ব্যক্তিগত নিয়ত / উদ্দেশ্য</label><textarea id="journey-intention" className="text-area" value={journeyIntention} onChange={(e) => setJourneyIntention(e.target.value)} maxLength={3000} rows={4} placeholder="এই যাত্রায় কী পরিবর্তন আনতে চাও?" />
                  <button className="primary-button form-submit" type="submit" disabled={busy}><Plus size={16} /> যাত্রা শুরু করো</button>
                </form>
              </article>
            )}
            {journeys.filter((item) => item.status !== "active").length > 0 && (
              <article className="panel history-card"><div className="panel-heading"><div><span className="eyebrow">আগের যাত্রা</span><h2>পূর্বের যাত্রা</h2></div><RotateCcw size={18} /></div>
                {journeys.filter((item) => item.status !== "active").map((item) => <div className="history-row" key={item.id}><div><strong>{item.title}</strong><span>{dateLabel(item.start_date)}</span></div><span className={`status-pill status-${item.status}`}>{item.status === "completed" ? "সম্পন্ন" : "বিরতিতে"}</span>{item.status === "paused" && <button className="text-button" onClick={() => { void (async () => { const response = await fetch("/api/journey", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: "active" }) }); if (response.ok) await load(); })(); }}><RotateCcw size={14} /> পুনরায় শুরু</button>}</div>)}
              </article>
            )}
          </div>
          <div className="workspace-column">
            {activeJourney && <article className="panel workspace-card">
              <div className="workspace-card-title"><span className="workspace-icon"><Flag size={19} /></span><div><h2>বাধা ও সংগ্রামের রেকর্ড</h2><p>কী ঘটেছে, কী কারণে হয়েছে এবং কী শিখেছ—সংরক্ষণ করো।</p></div></div>
              <form className="entry-form" onSubmit={createObstacle}>
                <label className="field-label" htmlFor="obstacle-title">বাধা / সংগ্রামের বিষয়</label><input id="obstacle-title" className="text-input" list="obstacle-suggestions" value={obstacleTitle} onChange={(e) => setObstacleTitle(e.target.value)} maxLength={120} placeholder="নতুন বিষয় লিখো বা আগেরটি বেছে নাও" required /><datalist id="obstacle-suggestions">{obstacleTemplates.map((item) => <option key={item.id} value={item.title} />)}</datalist>
                <div className="form-two-col"><div><label className="field-label" htmlFor="obstacle-date">তারিখ</label><input id="obstacle-date" className="text-input" type="date" value={obstacleDate} onChange={(e) => setObstacleDate(e.target.value)} required /></div><div><label className="field-label" htmlFor="obstacle-intensity">প্রভাবের মাত্রা</label><select id="obstacle-intensity" className="text-input" value={obstacleIntensity} onChange={(e) => setObstacleIntensity(e.target.value)}><option value="1">১ — কম</option><option value="2">২</option><option value="3">৩ — মাঝারি</option><option value="4">৪</option><option value="5">৫ — বেশি</option></select></div></div>
                <label className="field-label" htmlFor="obstacle-context">ঘটনার বিবরণ</label><textarea id="obstacle-context" className="text-area" rows={2} value={obstacleContext} onChange={(e) => setObstacleContext(e.target.value)} maxLength={3000} />
                <label className="field-label" htmlFor="obstacle-trigger">কী কারণে / কোন পরিস্থিতিতে?</label><textarea id="obstacle-trigger" className="text-area" rows={2} value={obstacleTrigger} onChange={(e) => setObstacleTrigger(e.target.value)} maxLength={2000} />
                <label className="field-label" htmlFor="obstacle-response">তুমি কীভাবে প্রতিক্রিয়া দেখিয়েছ?</label><textarea id="obstacle-response" className="text-area" rows={2} value={obstacleResponse} onChange={(e) => setObstacleResponse(e.target.value)} maxLength={2000} />
                <label className="field-label" htmlFor="obstacle-lesson">কী শিক্ষা বা পরবর্তী পদক্ষেপ?</label><textarea id="obstacle-lesson" className="text-area" rows={2} value={obstacleLesson} onChange={(e) => setObstacleLesson(e.target.value)} maxLength={2000} />
                <label className="check-line"><input type="checkbox" checked={saveObstacleTemplate} onChange={(e) => setSaveObstacleTemplate(e.target.checked)} /> পরেরবারের জন্য বিষয়টি সাজেশনে রাখো</label>
                <button className="primary-button form-submit" type="submit" disabled={busy}><Plus size={16} /> রেকর্ড সংরক্ষণ</button>
              </form>
            </article>}
            <article className="panel history-card"><div className="panel-heading"><div><span className="eyebrow">অভিজ্ঞতার ইতিহাস</span><h2>সাম্প্রতিক বাধা</h2></div><span className="count-pill">{obstacles.length.toLocaleString("bn-BD")}</span></div>
              {obstacles.length ? obstacles.slice(0, 8).map((item) => <div className="obstacle-row" key={item.id}><div className="obstacle-row-top"><strong>{item.title}</strong><time>{dateLabel(item.happened_on)}</time></div>{item.context && <p>{item.context}</p>}{item.lesson && <span className="lesson-line">শিক্ষা: {item.lesson}</span>}</div>) : <div className="empty-inline">এখনো কোনো বাধার রেকর্ড নেই।</div>}
            </article>
          </div>
        </section>
      ) : (
        <section className="goals-layout">
          <article className="panel workspace-card goal-create-card">
            <div className="workspace-card-title"><span className="workspace-icon"><Target size={19} /></span><div><h2>নতুন লক্ষ্য তৈরি</h2><p>ইলম, দক্ষতা বা ব্যক্তিগত অর্জনের জন্য একটি নির্দিষ্ট সময়সীমা নির্ধারণ করো।</p></div></div>
            <form className="entry-form" onSubmit={createGoal}>
              <label className="field-label" htmlFor="goal-title">লক্ষ্যের নাম</label><input id="goal-title" className="text-input" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} maxLength={160} required placeholder="যেমন: নির্দিষ্ট একটি বিষয় অধ্যয়ন" />
              <label className="field-label" htmlFor="goal-reason">লক্ষ্যটি কেন গুরুত্বপূর্ণ?</label><textarea id="goal-reason" className="text-area" rows={2} value={goalReason} onChange={(e) => setGoalReason(e.target.value)} maxLength={3000} />
              <label className="field-label" htmlFor="goal-plan">পরিকল্পনা ও রুটিন</label><textarea id="goal-plan" className="text-area" rows={3} value={goalPlan} onChange={(e) => setGoalPlan(e.target.value)} maxLength={6000} />
              <div className="form-two-col"><div><label className="field-label" htmlFor="goal-start">শুরুর তারিখ</label><input id="goal-start" className="text-input" type="date" value={goalStart} onChange={(e) => setGoalStart(e.target.value)} required /></div><div><label className="field-label" htmlFor="goal-deadline">শেষ করার তারিখ</label><input id="goal-deadline" className="text-input" type="date" min={goalStart} value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} required /></div></div>
              <label className="field-label" htmlFor="goal-priority">অগ্রাধিকার</label><select id="goal-priority" className="text-input" value={goalPriority} onChange={(e) => setGoalPriority(e.target.value as typeof goalPriority)}><option value="low">কম</option><option value="normal">স্বাভাবিক</option><option value="high">উচ্চ</option></select>
              <button className="primary-button form-submit" disabled={busy} type="submit"><Plus size={16} /> লক্ষ্য সংরক্ষণ</button>
            </form>
          </article>
          <div className="goal-list-column">
            <div className="section-heading"><div><span className="eyebrow">LEARNING & ACHIEVEMENT</span><h2>তোমার পরিকল্পনা</h2></div><span className="count-pill">{activeGoals.length.toLocaleString("bn-BD")}</span></div>
            {activeGoals.length ? activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} tasks={tasks.filter((task) => task.goal_id === goal.id)} currentJournalDate={currentJournalDate} onRefresh={load} onNotice={setNotice} />) : <div className="panel empty-goals"><div className="empty-goals-icon"><Target size={23} /></div><strong>এখনো কোনো লক্ষ্য তৈরি হয়নি</strong><p>বাম পাশের ফর্ম থেকে প্রথম লক্ষ্যটি তৈরি করো।</p></div>}
          </div>
        </section>
      )}
    </div>
  );
}

function GoalCard({ goal, tasks, currentJournalDate, onRefresh, onNotice }: { goal: Goal; tasks: GoalTask[]; currentJournalDate: string; onRefresh: () => Promise<void>; onNotice: (notice: Notice) => void }) {
  const [newTask, setNewTask] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const remaining = Math.ceil((new Date(`${goal.deadline}T12:00:00`).getTime() - new Date(`${currentJournalDate}T12:00:00`).getTime()) / 86_400_000);

  async function addTask(event: FormEvent<HTMLFormElement>, parentTaskId?: string) {
    event.preventDefault(); if (!newTask.trim()) return; setBusy(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTask.trim(), parentTaskId: parentTaskId || null, dueDate: newTaskDueDate || null }) });
      const result = await responseData<{ message?: string }>(response);
      if (!response.ok) throw new Error(result.message || "Task যোগ করা যায়নি।");
      setNewTask(""); setNewTaskDueDate(""); await onRefresh();
    } catch (error) { onNotice({ type: "error", message: error instanceof Error ? error.message : "Task যোগ করা যায়নি।" }); }
    finally { setBusy(false); }
  }

  async function changeStatus(task: GoalTask) {
    const next = task.status === "completed" ? "pending" : "completed";
    const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    if (!response.ok) { onNotice({ type: "error", message: "Task-এর অবস্থা পরিবর্তন করা যায়নি।" }); return; }
    await onRefresh();
  }

  async function setGoalStatus(status: Goal["status"]) {
    const response = await fetch(`/api/goals/${goal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) { onNotice({ type: "error", message: "লক্ষ্যের অবস্থা আপডেট করা যায়নি।" }); return; }
    onNotice({ type: "success", message: status === "completed" ? "লক্ষ্য সম্পন্ন হয়েছে।" : "লক্ষ্য আপডেট হয়েছে।" }); await onRefresh();
  }

  const rootTasks = tasks.filter((task) => !task.parent_task_id);
  return (
    <article className="panel goal-card">
      <div className="goal-card-top"><span className={`priority-pill priority-${goal.priority}`}>{goal.priority === "high" ? "উচ্চ অগ্রাধিকার" : goal.priority === "low" ? "কম অগ্রাধিকার" : "স্বাভাবিক"}</span><span className={`status-pill status-${goal.status}`}>{goal.status === "completed" ? "সম্পন্ন" : goal.status === "paused" ? "বিরতিতে" : "চলমান"}</span></div>
      <h3>{goal.title}</h3>
      {goal.reason && <p className="goal-reason">{goal.reason}</p>}
      {goal.plan && <details className="goal-plan-details"><summary>পরিকল্পনা দেখো</summary><p>{goal.plan}</p></details>}
      <div className="goal-dates"><span><CalendarDays size={14} /> {dateLabel(goal.start_date)}</span><span>শেষ: {dateLabel(goal.deadline)}</span></div>
      <div className="goal-progress-head"><span>Task অগ্রগতি</span><strong>{tasks.length ? `${completed}/${tasks.length}` : "শুরু হয়নি"}</strong></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="goal-days-left"><Clock3 size={14} /> {remaining < 0 ? `${Math.abs(remaining).toLocaleString("bn-BD")} দিন সময় পেরিয়েছে` : remaining === 0 ? "আজ Deadline" : `${remaining.toLocaleString("bn-BD")} দিন বাকি`}</div>
      <div className="task-list-header"><button className="text-button" onClick={() => setExpanded((value) => !value)}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />} পরিকল্পনার ধাপ ({tasks.length.toLocaleString("bn-BD")})</button></div>
      {expanded && <>
        {rootTasks.map((task) => <TaskRow key={task.id} task={task} childrenTasks={tasks.filter((child) => child.parent_task_id === task.id)} goalStart={goal.start_date} goalDeadline={goal.deadline} onToggle={() => changeStatus(task)} onRefresh={onRefresh} onNotice={onNotice} goalId={goal.id} />)}
        <form className="task-add-form" onSubmit={(event) => void addTask(event)}><input className="text-input" value={newTask} onChange={(e) => setNewTask(e.target.value)} maxLength={180} placeholder="নতুন Task যোগ করো" aria-label="নতুন Task" /><input className="text-input task-date-input" type="date" min={goal.start_date} max={goal.deadline} value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} aria-label="Task-এর সময়সীমা" /><button className="secondary-button" type="submit" disabled={busy || !newTask.trim()}><Plus size={15} /> যোগ</button></form>
      </>}
      <div className="goal-card-actions">{goal.status !== "completed" && <button className="secondary-button" onClick={() => void setGoalStatus("completed")}><Check size={15} /> লক্ষ্য সম্পন্ন</button>}{goal.status === "active" && <button className="text-button muted-button" onClick={() => void setGoalStatus("paused")}><Pause size={14} /> বিরতি</button>}{goal.status === "paused" && <button className="text-button" onClick={() => void setGoalStatus("active")}><RotateCcw size={14} /> আবার শুরু</button>}</div>
    </article>
  );
}

function TaskRow({ task, childrenTasks, goalStart, goalDeadline, onToggle, onRefresh, onNotice, goalId }: { task: GoalTask; childrenTasks: GoalTask[]; goalStart: string; goalDeadline: string; onToggle: () => void; onRefresh: () => Promise<void>; onNotice: (notice: Notice) => void; goalId: string }) {
  const [showSubtask, setShowSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDueDate, setSubtaskDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  async function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!subtaskTitle.trim()) return; setBusy(true);
    try {
      const response = await fetch(`/api/goals/${goalId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: subtaskTitle.trim(), parentTaskId: task.id, dueDate: subtaskDueDate || null }) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "উপধাপ যোগ করা যায়নি।");
      setSubtaskTitle(""); setSubtaskDueDate(""); setShowSubtask(false); await onRefresh();
    } catch (error) { onNotice({ type: "error", message: error instanceof Error ? error.message : "উপধাপ যোগ করা যায়নি।" }); }
    finally { setBusy(false); }
  }
  return <div className="task-tree-row">
    <div className={`task-row ${task.status === "completed" ? "task-complete" : ""}`}><button className="task-check" type="button" aria-label="Task সম্পন্নের অবস্থা পরিবর্তন" onClick={onToggle}>{task.status === "completed" ? <Check size={13} /> : null}</button><span>{task.title}{task.due_date && <small className="task-due-date"> · {dateLabel(task.due_date)}</small>}</span><button className="task-sub-add" type="button" onClick={() => setShowSubtask((value) => !value)} title="উপধাপ যোগ"><Plus size={14} /></button></div>
    {showSubtask && <form className="subtask-add-form" onSubmit={(event) => void addSubtask(event)}><input className="text-input" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} maxLength={180} placeholder="উপধাপের নাম" autoFocus /><input className="text-input task-date-input" type="date" min={goalStart} max={goalDeadline} value={subtaskDueDate} onChange={(e) => setSubtaskDueDate(e.target.value)} aria-label="উপধাপের সময়সীমা" /><button className="secondary-button" type="submit" disabled={busy || !subtaskTitle.trim()}>যোগ</button></form>}
    {childrenTasks.map((child) => <div className={`task-row task-child ${child.status === "completed" ? "task-complete" : ""}`} key={child.id}><button className="task-check" type="button" aria-label="উপধাপ সম্পন্নের অবস্থা পরিবর্তন" onClick={async () => { const response = await fetch(`/api/tasks/${child.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: child.status === "completed" ? "pending" : "completed" }) }); if (response.ok) await onRefresh(); }} >{child.status === "completed" ? <Check size={13} /> : null}</button><span>{child.title}{child.due_date && <small className="task-due-date"> · {dateLabel(child.due_date)}</small>}</span></div>)}
  </div>;
}
