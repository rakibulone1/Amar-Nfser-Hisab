"use client";

import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronRight, Clock3, Cloud, Compass,
  Download, Heart, LockKeyhole, LogOut, LoaderCircle, Moon, Trash2,
  MoreHorizontal, Pencil, Plus, Settings, ShieldCheck, Sparkles, Sun, Target,
  Upload, X, type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import hadithData from "@/data/hadith-bn.json";
import type { HadithDataset, HadithRecord } from "@/types/hadith";
import { formatHijriDate } from "@/lib/date/hijri";
import { useTheme } from "@/providers/theme-provider";
import { AppToastViewport } from "@/components/app-toast-viewport";
import { showAppToast } from "@/lib/ui/toast";
import { TrackerCenter } from "@/modules/trackers/tracker-center";
import { SURAHS } from "@/modules/journal/surahs";
import { PrayerTimeWidget } from "@/modules/trackers/prayer-time-widget";
import { PrayerSettingsPanel, PrayerReminderEngine } from "@/modules/trackers/prayer-settings";
import {
  createWorkspaceRecordId, getCloudSyncMessage, getCloudSyncState, getLastSuccessfulSyncAt, getWorkspaceData, getWorkspaceServerData, getJournalDate, getWorkspaceLoadError,
  hydrateWorkspaceData, replaceWorkspaceData, subscribeWorkspaceData, updateWorkspaceData, flushWorkspaceChanges,
  type AppSection, type DeadlinePlan, type DeadlineTask, type JourneyMilestone, type JourneyObservation, type PrayerId, type ReminderEvent
} from "@/lib/workspace/store";
import { getDhakaDateTimeInput, toDhakaIso } from "@/lib/prayer-time";
import { addDaysToDateKey, differenceInDateKeys, FIXED_JOURNEY_END_DATE, FIXED_JOURNEY_ID, FIXED_JOURNEY_START_DATE, FIXED_JOURNEY_STAGES, getFixedJourneyProgress } from "@/lib/journey/stages";

const NAV_ITEMS: { id: AppSection; label: string; shortLabel: string; description: string; icon: LucideIcon }[] = [
  { id: "home", label: "জীবন গুছানো", shortLabel: "আজ", description: "আজকের অবস্থা ও সংক্ষিপ্ত পর্যালোচনা", icon: Compass },
  { id: "goals", label: "লক্ষ্য ও সময়সীমা", shortLabel: "লক্ষ্য", description: "লক্ষ্য, অগ্রগতি ও আত্মশুদ্ধির যাত্রা", icon: Target },
  { id: "journal", label: "আত্মশুদ্ধি লিপি", shortLabel: "লিপি", description: "দৈনিক আমল, অভ্যাস ও ব্যক্তিগত নোট", icon: BookOpen },
  { id: "mirror", label: "নফস আয়না", shortLabel: "আয়না", description: "নিজের রেকর্ডের সময়ভিত্তিক বিশ্লেষণ", icon: Activity },
  { id: "settings", label: "সেটিংস", shortLabel: "সেটিংস", description: "ব্যক্তিগত পছন্দ ও ডেটা ব্যবস্থাপনা", icon: Settings }
];

const PRAYERS: { id: PrayerId; label: string }[] = [
  { id: "maghrib", label: "মাগরিব" }, { id: "isha", label: "ইশা" }, { id: "fajr", label: "ফজর" }, { id: "dhuhr", label: "যোহর" }, { id: "asr", label: "আসর" }
];

const SECTION_EVENT = "amar-nfser-hisab:section-change";
function getSectionFromLocation(): AppSection {
  if (typeof window === "undefined") return "home";
  const section = new URL(window.location.href).searchParams.get("section");
  return NAV_ITEMS.some((item) => item.id === section) ? section as AppSection : "home";
}
function subscribeSection(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(SECTION_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(SECTION_EVENT, listener);
  };
}
function useSection(initialSection: AppSection) {
  return useSyncExternalStore(subscribeSection, getSectionFromLocation, () => initialSection);
}
function navigateSection(section: AppSection, tracker?: string, prayer?: PrayerId | "qada", targetDate?: string) {
  const url = new URL(window.location.href);
  url.pathname = "/dashboard";
  if (section === "home") url.searchParams.delete("section");
  else url.searchParams.set("section", section);
  for (const key of ["tracker", "action", "prayer", "entryDate", "tab", "goalId"]) url.searchParams.delete(key);
  if (section === "journal" && tracker) {
    url.searchParams.set("tracker", tracker);
    url.searchParams.set("action", "new");
    if (prayer) url.searchParams.set("prayer", prayer);
    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) url.searchParams.set("entryDate", targetDate);
  }
  window.history.pushState({ section, tracker, prayer }, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(SECTION_EVENT));
  window.scrollTo({ top: 0, behavior: "auto" });
}
function useLocalData() {
  const data = useSyncExternalStore(subscribeWorkspaceData, getWorkspaceData, getWorkspaceServerData);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void hydrateWorkspaceData().finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  return loaded && !getWorkspaceLoadError() ? data : null;
}
function todayKey(timeZone: string, maghribTime: string) {
  return getJournalDate(new Date(), timeZone || "Asia/Dhaka", maghribTime || null);
}
function formatCompactDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
function formatLastSyncTime(value: string | null) {
  if (!value) return "এখনো সিঙ্ক হয়নি";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "এখনো সিঙ্ক হয়নি";
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(date);
}
function formatCompactLastSyncTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(date);
}
function navigateToGoalPlan(planId: string) {
  const url = new URL(window.location.href);
  url.pathname = "/dashboard";
  url.searchParams.set("section", "goals");
  url.searchParams.set("tab", "goals");
  url.searchParams.set("goalId", planId);
  for (const key of ["tracker", "action", "prayer", "entryDate"]) url.searchParams.delete(key);
  window.history.pushState({ section: "goals", tab: "goals", goalId: planId }, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(SECTION_EVENT));
}
function getInitials(name: string) {
  const clean = name.trim();
  return clean ? clean.slice(0, 1) : "আ";
}
function uid() { return createWorkspaceRecordId(); }

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`} aria-label="Amar Nfser Hisab">
      <span className="brand-mark-icon"><Image src="/brand/logo.svg" alt="" width={31} height={31} /></span>
      {!compact && <span className="brand-mark-copy"><strong>Amar Nfser Hisab</strong><small>ব্যক্তিগত মুহাসাবা</small></span>}
    </div>
  );
}

function PageIntro({ title, action, onBack, variant }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; onBack: () => void; variant?: "goals" }) {
  const headingClass = variant === "goals" ? "goals-page-heading release-page-heading page-intro section-heading-unified" : "page-intro release-page-heading section-heading-unified";
  return (
    <header className={headingClass}>
      <button type="button" className="section-back-button" onClick={onBack} aria-label="ড্যাশবোর্ডে ফিরে যাও" title="ড্যাশবোর্ডে ফিরে যাও"><ArrowLeft size={16}/><span>ফিরে যাও</span></button>
      <div className="page-intro-title-chip"><h1>{title}</h1></div>
      <div className="page-intro-action">{action || null}</div>
    </header>
  );
}

function Panel({ children, className = "", title, eyebrow, action }: { children: React.ReactNode; className?: string; title?: string; eyebrow?: string; action?: React.ReactNode }) {
  return (
    <section className={`workspace-panel ${className}`}>
      {(title || eyebrow || action) && <div className="panel-title-row"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}{title && <h2>{title}</h2>}</div>{action}</div>}
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, icon: Icon, accent = "green", onClick }: { label: string; value: string | number; detail: string; icon: LucideIcon; accent?: "green" | "sand" | "blue" | "rose"; onClick?: () => void }) {
  const content = <><div className="metric-card-top"><span>{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.8} /></span></div><strong>{value}</strong><small>{detail}</small></>;
  return onClick ? <button type="button" className={`metric-card metric-${accent} metric-card-button`} onClick={onClick}>{content}</button>
    : <article className={`metric-card metric-${accent}`}>{content}</article>;
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon size={21} /></span><strong>{title}</strong><p>{description}</p></div>;
}

const HADITH_DATA = hadithData as HadithDataset;
function getHijriLabel(dateKey: string) {
  return formatHijriDate(dateKey);
}
function chooseDailyHadith(dateKey: string) {
  const seed = [...dateKey].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  return HADITH_DATA.hadiths[seed % HADITH_DATA.hadiths.length] ?? HADITH_DATA.hadiths[0];
}
function chooseRandomHadith(exceptId?: string) {
  const available = HADITH_DATA.hadiths.filter((item) => item.id !== exceptId);
  const pool = available.length ? available : HADITH_DATA.hadiths;
  return pool[Math.floor(Math.random() * pool.length)] ?? HADITH_DATA.hadiths[0];
}
function DailyHadithCard({ date }: { date: string }) {
  const router = useRouter();
  // The chosen hadith is deterministic for the Maghrib-based day, keeping SSR hydration stable.
  const [item, setItem] = useState<HadithRecord>(() => chooseDailyHadith(date));
  const category = HADITH_DATA.categories.find((value) => value.id === item.category_id)?.name || "হাদিস";
  return <section className="hadith-daily-card">
    <div className="hadith-daily-head"><span>হাদিস থেকে শিক্ষা</span><button type="button" className="hadith-refresh-button" onClick={() => setItem(chooseRandomHadith(item.id))}>অন্য হাদিস</button></div>
    <button type="button" className="hadith-daily-summary" onClick={() => router.push(`/hadith?id=${encodeURIComponent(item.id)}`)}>
      <span className="hadith-daily-category">{category}</span>
      <strong>{item.summary}</strong>
      <span className="hadith-daily-reference">{item.book} · হাদিস {item.hadith_number}</span>
      <span className="hadith-daily-open">সম্পূর্ণ হাদিস পড়ুন <ArrowRight size={15}/></span>
    </button>
  </section>;
}
function formatEnglishGregorianDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("bn-BD", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(date);
}
function DashboardDateCard({ date }: { date: string }) {
  return (
    <div className="dashboard-date-card dashboard-date-card-centered" aria-label={`ইংরেজি তারিখ ${formatEnglishGregorianDate(date)} · হিজরি ${getHijriLabel(date)}`}>
      <span lang="bn">{formatEnglishGregorianDate(date)}</span>
      <span className="dashboard-date-divider" aria-hidden="true"/>
      <span>{getHijriLabel(date)}</span>
    </div>
  );
}
function FixedJourneyDashboardCard({ data, date }: { data: ReturnType<typeof getWorkspaceData>; date: string }) {
  const progress = getFixedJourneyProgress(date);
  const stage = progress.currentStage;
  const nextPlan = [...data.deadlinePlans]
    .filter((plan) => plan.deadline >= date)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const daysToPlan = nextPlan ? Math.max(0, differenceInDateKeys(date, nextPlan.deadline)) : null;
  const journeyModule = stage?.module ?? (progress.status === "upcoming" ? 1 : 3);
  const statusTitle = progress.status === "upcoming"
    ? "নতুন যাত্রার প্রস্তুতি"
    : progress.status === "completed"
      ? "দীর্ঘ পথচলার অর্জন"
      : stage?.title || "আত্মশুদ্ধির যাত্রা";
  const stageDayText = stage
    ? `${progress.stageDay.toLocaleString("bn-BD")} / ${stage.durationDays.toLocaleString("bn-BD")} দিন`
    : progress.status === "upcoming" ? "২৩ নভেম্বর ২০২৬ থেকে শুরু" : "সব পর্যায় সম্পন্ন";
  const stageStart = stage?.startDate || FIXED_JOURNEY_START_DATE;
  const stageEnd = stage?.endDate || FIXED_JOURNEY_END_DATE;
  const stagePercent = stage ? progress.stagePercent : progress.percent;
  const remainingText = stage
    ? `${progress.stageRemainingDays.toLocaleString("bn-BD")} দিন বাকি`
    : progress.status === "upcoming" ? "শুরু হতে বাকি" : "সম্পন্ন";
  return <section className={`dashboard-journey-card dashboard-journey-card-compact module-tone-${journeyModule}`}>
    <button type="button" className="dashboard-journey-card-link" onClick={() => navigateSection("goals")} aria-label="আত্মশুদ্ধির যাত্রা খুলুন" tabIndex={0}/>
    <div className="dashboard-journey-header">
      <div><span className="dashboard-journey-overline">আত্মশুদ্ধির যাত্রা</span><small>{stage ? `মডিউল ${stage.module.toLocaleString("bn-BD")} · পর্যায় ${stage.stageNumber.toLocaleString("bn-BD")}` : progress.status === "upcoming" ? "শুরুর প্রস্তুতি" : "যাত্রা সম্পন্ন"}</small></div>
      <span className="dashboard-journey-open">যাত্রা দেখো <ArrowRight size={14}/></span>
    </div>
    <div className="dashboard-journey-title">
      <h1>{statusTitle}</h1>
      <span>{formatCompactDate(stageStart)} – {formatCompactDate(stageEnd)}</span>
    </div>
    <div className="dashboard-journey-progress"><span style={{ width: `${stagePercent}%` }}/></div>
    <div className="dashboard-journey-facts">
      <div><small>পর্যায়</small><strong>{stage ? `${stage.stageNumber.toLocaleString("bn-BD")} / ৭১` : progress.status === "completed" ? "৭১ / ৭১" : "—"}</strong></div>
      <div><small>এই পর্যায়</small><strong>{stageDayText}</strong></div>
      <div><small>পরবর্তী ধাপ</small><strong>{remainingText}</strong></div>
      <button type="button" className="dashboard-journey-next-plan" onClick={() => { if (nextPlan) navigateToGoalPlan(nextPlan.id); else navigateSection("goals"); }}><small>পরবর্তী লক্ষ্য</small><strong>{nextPlan?.title || "এখনো নির্ধারিত নয়"}</strong><span>{nextPlan ? (daysToPlan === 0 ? "আজ শেষ তারিখ" : `${daysToPlan?.toLocaleString("bn-BD")} দিন বাকি`) : "লক্ষ্য যোগ করতে দেখো"}</span></button>
    </div>
  </section>;
}

function DashboardView({ data }: { data: ReturnType<typeof getWorkspaceData> }) {
  const date = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerId | null>(null);
  const prayerEntries = data.prayerEntries.filter((item) => item.date === date && item.method !== "qada");
  const qadaToday = data.prayerEntries.filter((item) => item.date === date && item.method === "qada");
  const completedPrayerIds = new Set(prayerEntries.filter((item) => item.method !== "not-performed" && item.missedRakats === 0 && item.components.some((part) => part.category === "fard" && part.performed && part.performedRakats >= part.plannedRakats)).map((item) => item.prayer));
  const completedPrayerCount = completedPrayerIds.size;
  const extraPrayerToday = data.extraPrayerEntries.filter((item) => item.date === date);
  const extraRakats = extraPrayerToday.reduce((sum, item) => sum + item.rakats, 0);
  const regularRakats = prayerEntries.flatMap((item) => item.components).reduce((sum, part) => sum + part.performedRakats, 0) + extraRakats;
  const qadaRakatsToday = qadaToday.flatMap((item) => item.components).reduce((sum, part) => sum + part.performedRakats, 0);
  const rakats = regularRakats + qadaRakatsToday;
  const categoryRakats = prayerEntries.flatMap((item) => item.components).reduce((acc, part) => { acc[part.category] = (acc[part.category] || 0) + part.performedRakats; return acc; }, {} as Record<string, number>);
  extraPrayerToday.forEach((item) => { categoryRakats[item.category] = (categoryRakats[item.category] || 0) + item.rakats; });
  const pendingQadaRecords = data.qadaEntries.filter((item) => item.status === "pending");
  const pendingQada = pendingQadaRecords.length;
  const pendingQadaRakats = pendingQadaRecords.reduce((sum, item) => sum + item.rakats, 0);
  const quranToday = data.quranEntries.filter((item) => item.date === date);
  const ayahTotal = quranToday.reduce((sum, item) => sum + item.ayahTo - item.ayahFrom + 1, 0);
  const dhikrToday = data.dhikrSessions.filter((item) => item.date === date).reduce((sum, item) => sum + item.count, 0);
  const note = data.notes.find((item) => item.date === date);
  const activeDeadlinePlans = [...data.deadlinePlans].filter((plan) => plan.deadline >= date).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  
  return <div className="view-stack">
    <DashboardDateCard date={date}/>
    <FixedJourneyDashboardCard data={data} date={date}/>
    <div className="metric-grid">
      <MetricCard label="আজকের আদায়কৃত রাকাত" value={rakats.toLocaleString("bn-BD")} detail={`ফরজ ${categoryRakats.fard || 0} · সুন্নত ${categoryRakats.sunnah || 0} · ওয়াজিব ${categoryRakats.wajib || 0} · নফল ${categoryRakats.nafl || 0} · কাজা ${qadaRakatsToday.toLocaleString("bn-BD")}`} icon={Moon} onClick={() => navigateSection("journal", "prayer")}/>
      <MetricCard label="বাকি কাজা সালাত" value={pendingQada.toLocaleString("bn-BD")} detail={`মোট ${pendingQadaRakats.toLocaleString("bn-BD")} রাকাত · আজ আদায় ${qadaRakatsToday.toLocaleString("bn-BD")} রাকাত`} icon={Clock3} accent="sand" onClick={() => navigateSection("journal", "prayer")}/>
      <MetricCard label="আজকের কুরআন" value={`${ayahTotal.toLocaleString("bn-BD")} আয়াত`} detail={`${quranToday.length.toLocaleString("bn-BD")}টি পাঠের এন্ট্রি`} icon={BookOpen} accent="blue" onClick={() => navigateSection("journal", "quran")}/>
      <MetricCard label="আজকের জিকির" value={dhikrToday.toLocaleString("bn-BD")} detail="কাউন্টারে সংরক্ষিত সংখ্যা" icon={Sparkles} accent="rose" onClick={() => navigateSection("journal", "dhikr")}/>

    </div>

    <DailyHadithCard date={date}/>
    <PrayerTimeWidget data={data}/>
    <Panel eyebrow="কুরআন তেলাওয়াত" title="আজকের পাঠ ও সর্বশেষ অবস্থান" action={<button className="text-action" type="button" onClick={() => navigateSection("journal", "quran")}>তেলাওয়াত এন্ট্রি <ArrowRight size={15}/></button>}>
      <div className="quran-dashboard-summary"><div><strong>{ayahTotal.toLocaleString("bn-BD")}</strong><small>আজকের আয়াত</small></div><div><strong>{data.quranEntries.reduce((sum, item) => sum + item.ayahTo - item.ayahFrom + 1, 0).toLocaleString("bn-BD")}</strong><small>মোট সংরক্ষিত আয়াত</small></div><div><strong>{data.quranEntries[0] ? `${SURAHS[data.quranEntries[0].surahFrom - 1]?.name || "সূরা"} · ${data.quranEntries[0].ayahFrom.toLocaleString("bn-BD")}–${data.quranEntries[0].ayahTo.toLocaleString("bn-BD")}` : "এখনো পাঠ নেই"}</strong><small>সর্বশেষ পড়ার অবস্থান</small></div></div>
    </Panel>

    <div className="content-grid content-grid-wide-left">
      <Panel className="prayer-panel-new" eyebrow="আজকের সালাত" title="সালাতের বিস্তারিত হিসাব" action={<button className="text-action" type="button" onClick={() => navigateSection("journal", "prayer")}>এন্ট্রি খুলুন <ArrowRight size={15}/></button>}>
        <div className="prayer-progress-track"><span style={{ width: `${completedPrayerCount * 20}%` }}/></div>
        <div className="prayer-check-list">{PRAYERS.map((prayer) => {
          const entries = prayerEntries.filter((item) => item.prayer === prayer.id);
          const latest = entries[0];
          const qada = data.qadaEntries.filter((item) => item.prayer === prayer.id && item.missedDate === date).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          const label = latest?.method === "not-performed" ? (qada?.status === "settled" ? "ওয়াক্তে আদায় হয়নি · কাজা সম্পন্ন" : "আদায় হয়নি · কাজা বাকি")
            : latest?.missedRakats ? "আংশিক আদায় · কিছু রাকাত বাকি"
            : latest?.method === "jamaat" ? "জামাতে আদায়" : latest?.method === "qada" ? "কাজা আদায়" : latest?.method === "home" ? "বাসায় / একাকী আদায়" : qada?.status === "settled" ? "কাজা আদায় সম্পন্ন" : qada ? "কাজা বাকি" : "রেকর্ড হয়নি";
          const detail = [latest?.missedRakats ? `${latest.missedRakats.toLocaleString("bn-BD")} রাকাত বাকি` : "", latest?.caughtRakats && latest.completedAfterRakats ? `পরে ${latest.completedAfterRakats.toLocaleString("bn-BD")} রাকাত পূরণ` : "", latest?.lateReason, latest?.missedReason, qada?.status === "pending" ? `কাজা ${qada.rakats.toLocaleString("bn-BD")} রাকাত বাকি` : qada?.status === "settled" ? "কাজা আদায়ের রেকর্ড আছে" : ""].filter(Boolean).join(" · ");
          const expanded = expandedPrayer === prayer.id;
          return <div className="prayer-check-item" key={prayer.id}>
            <button type="button" className={`prayer-check-row ${latest || qada ? "is-checked" : ""}`} onClick={() => setExpandedPrayer(expanded ? null : prayer.id)} aria-expanded={expanded} aria-label={`${prayer.label}: ${label}; বিস্তারিত ${expanded ? "বন্ধ" : "দেখো"}`}>
              <span className="prayer-order">{PRAYERS.findIndex((x) => x.id === prayer.id) + 1}</span>
              <span className="prayer-name-wrap"><strong>{prayer.label}</strong><small>{label}{detail ? ` · ${detail}` : ""}</small></span>
              <span className={`status-label ${latest?.method === "not-performed" || latest?.missedRakats || qada?.status === "pending" ? "status-active" : latest || qada ? "status-done" : "status-active"}`}>{expanded ? "বন্ধ করো" : latest || qada ? "বিস্তারিত দেখো" : "এন্ট্রি দাও"}</span><ChevronRight size={15}/>
            </button>
            {expanded && <div className="prayer-check-details">
              {latest ? <>
                <div className="prayer-detail-meta"><span>আদায়ের পদ্ধতি: <strong>{latest.method === "jamaat" ? "জামাতে" : latest.method === "home" ? "বাসায় / একাকী" : latest.method === "qada" ? "কাজা" : "আদায় হয়নি"}</strong></span>{latest.performedAt && <span>সময়: <strong>{new Intl.DateTimeFormat("bn-BD", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(latest.performedAt))}</strong></span>}</div>
                <div className="prayer-detail-components">{latest.components.map((part) => <div key={part.partId}><span>{part.label} · {({fard:"ফরজ",sunnah:"সুন্নত",wajib:"ওয়াজিব",nafl:"নফল"} as const)[part.category]}</span><strong>{part.performedRakats.toLocaleString("bn-BD")} / {part.plannedRakats.toLocaleString("bn-BD")} রাকাত</strong>{part.reason && <small>কারণ: {part.reason}</small>}</div>)}</div>
                {(latest.lateReason || latest.missedReason) && <p className="prayer-detail-reason">কারণ ও নোট: {[latest.lateReason, latest.missedReason].filter(Boolean).join(" · ")}</p>}
              </> : <p className="prayer-detail-empty">এই ওয়াক্তের কোনো এন্ট্রি এখনো সংরক্ষিত হয়নি।</p>}
              {qada && <p className="prayer-detail-qada">কাজা: {qada.rakats.toLocaleString("bn-BD")} রাকাত · {qada.status === "pending" ? "এখনো বাকি" : "আদায় সম্পন্ন"}{qada.reason ? ` · কারণ: ${qada.reason}` : ""}</p>}
              <button type="button" className="prayer-detail-action" onClick={() => navigateSection("journal", "prayer", prayer.id)}>{latest || qada ? "সালাতের রেকর্ড খুলে দেখো" : "এই ওয়াক্তের এন্ট্রি দাও"} <ArrowRight size={14}/></button>
            </div>}
          </div>;
        })}</div>
        <div className="dashboard-rakat-breakdown"><button type="button" onClick={() => navigateSection("journal", "prayer")}>সুন্নত <strong>{(categoryRakats.sunnah || 0).toLocaleString("bn-BD")}</strong></button><button type="button" onClick={() => navigateSection("journal", "prayer")}>ফরজ <strong>{(categoryRakats.fard || 0).toLocaleString("bn-BD")}</strong></button><button type="button" onClick={() => navigateSection("journal", "prayer")}>ওয়াজিব <strong>{(categoryRakats.wajib || 0).toLocaleString("bn-BD")}</strong></button><button type="button" onClick={() => navigateSection("journal", "prayer")}>নফল <strong>{(categoryRakats.nafl || 0).toLocaleString("bn-BD")}</strong></button></div>
        <p className="panel-footnote">রাকাতের হিসাব তোমার সালাত সেটিংস অনুযায়ী।</p>
      </Panel>
      <div className="side-stack">
        <Panel className="reflection-panel" eyebrow="আজকের আত্মপর্যালোচনা" title="নিজের কাছে একটি প্রশ্ন"><div className="reflection-mark">“</div><p className="reflection-question">আজ এমন কোন কাজটি করেছি, যা আগামীকাল আরও ভালোভাবে করতে পারি?</p><span className="reflection-note">নিজেকে বিচার নয়—নিজেকে বোঝার চেষ্টা।</span><button className="text-action" type="button" onClick={() => navigateSection("journal", "reflection")}>মুহাসাবা লিখি <ArrowRight size={15}/></button></Panel>
        <Panel className="quick-note-panel" eyebrow="দ্রুত নোট" title="আজকের ছোট্ট নোট"><QuickNote key={date} date={date} initialValue={note?.body || ""}/></Panel>
      </div>
    </div>

    <Panel eyebrow="একাডেমিক ও ব্যক্তিগত পরিকল্পনা" title="আসন্ন সময়সীমা" action={<button className="text-action" type="button" onClick={() => navigateSection("goals")}>সব পরিকল্পনা <ArrowRight size={15}/></button>}>
      {activeDeadlinePlans.length ? <div className="goal-preview-list">{activeDeadlinePlans.map((plan) => { const done = plan.tasks.filter((task) => task.completed).length; const progress = plan.tasks.length ? Math.round(done / plan.tasks.length * 100) : 0; const left = Math.ceil((new Date(`${plan.deadline}T12:00:00Z`).getTime() - new Date(`${date}T12:00:00Z`).getTime()) / 86400000); return <div className="goal-preview-row" key={plan.id}><div><strong>{plan.title}</strong><small>{left === 0 ? "আজ শেষ তারিখ" : `${left.toLocaleString("bn-BD")} দিন বাকি`} · {formatCompactDate(plan.deadline)}</small></div><span className="goal-progress-label">{progress.toLocaleString("bn-BD")}%</span></div>; })}</div> : <EmptyState icon={Target} title="এখনো কোনো সময়সীমা যোগ করা হয়নি" description="পরীক্ষা বা গুরুত্বপূর্ণ কাজের শেষ তারিখ যোগ করলে এখানে দেখা যাবে।"/>}
    </Panel>
  </div>;
}

function QuickNote({ date, initialValue }: { date: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  function save() {
    updateWorkspaceData((current) => {
      const old = current.notes.find((note) => note.date === date);
      const next = { date, mood: old?.mood || "", body: value.slice(0, 4000), reflection: old?.reflection || "", gratitude: old?.gratitude || "", updatedAt: new Date().toISOString() };
      return { ...current, notes: old ? current.notes.map((note) => note.date === date ? next : note) : [next, ...current.notes] };
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  return <div className="quick-note-editor"><textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} maxLength={4000} placeholder="আজকের কোনো ভাবনা লিখে রাখো…"/><div><small>{value.length.toLocaleString("bn-BD")}/৪০০০</small><button type="button" className="button-primary button-small" onClick={save} disabled={!value.trim()}>{saved ? <Check size={14}/> : <ArrowDownToLine size={14}/>}{saved ? "সংরক্ষিত" : "নোট রাখো"}</button></div></div>;
}

const MOOD_OPTIONS = [
  { value: "hopeful", emoji: "🌱", label: "আশাবাদী" },
  { value: "calm", emoji: "🌿", label: "শান্ত" },
  { value: "focused", emoji: "🎯", label: "মনোযোগী" },
  { value: "restless", emoji: "🌊", label: "অস্থির" },
  { value: "challenged", emoji: "🧭", label: "চ্যালেঞ্জের মধ্যে" },
  { value: "tired", emoji: "☁️", label: "ক্লান্ত" },
  { value: "mixed", emoji: "🌤️", label: "মিশ্র অনুভূতি" }
] as const;
const MOOD_LABELS: Record<string, string> = Object.fromEntries(MOOD_OPTIONS.map((item) => [item.value, `${item.emoji} ${item.label}`]));
type MoodValue = (typeof MOOD_OPTIONS)[number]["value"];
type ContextValue = "positive" | "difficult" | "neutral";

function stageStatus(stageNumber: number, currentStageNumber: number, progressStatus: string) {
  if (progressStatus === "completed") return "completed" as const;
  if (progressStatus === "upcoming") return "upcoming" as const;
  if (stageNumber < currentStageNumber) return "completed" as const;
  if (stageNumber === currentStageNumber) return "current" as const;
  return "upcoming" as const;
}

function StageDetailView({
  stage,
  data,
  currentDate,
  onBack
}: {
  stage: (typeof FIXED_JOURNEY_STAGES)[number];
  data: ReturnType<typeof getWorkspaceData>;
  currentDate: string;
  onBack: () => void;
}) {
  const complete = currentDate > stage.endDate;
  const milestone = data.journeyMilestones.find((item) => item.journeyId === FIXED_JOURNEY_ID && item.stageNumber === stage.stageNumber);
  const observations = data.journeyObservations
    .filter((item) => item.journeyId === FIXED_JOURNEY_ID && item.stageNumber === stage.stageNumber)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const defaultDate = currentDate >= stage.startDate && currentDate <= stage.endDate
    ? currentDate : currentDate > stage.endDate ? stage.endDate : stage.startDate;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodValue>("hopeful");
  const [context, setContext] = useState<ContextValue>("neutral");
  const [entryDate, setEntryDate] = useState(defaultDate);
  const [entryTime, setEntryTime] = useState(getDhakaDateTimeInput().time);
  const [situation, setSituation] = useState("");
  const [response, setResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const milestoneKey = `${milestone?.id ?? "new"}:${milestone?.rewardTitle ?? ""}:${milestone?.rewardAmount ?? ""}:${milestone?.rewardNote ?? ""}`;
  const initialRewardDraft = {
    sourceKey: milestoneKey,
    title: milestone?.rewardTitle || "",
    amount: milestone?.rewardAmount == null ? "" : String(milestone.rewardAmount),
    note: milestone?.rewardNote || ""
  };
  const [rewardDraft, setRewardDraft] = useState(initialRewardDraft);
  // React's guarded render-phase adjustment keeps an external milestone update in sync
  // without an effect that triggers an avoidable cascading render.
  if (rewardDraft.sourceKey !== milestoneKey) setRewardDraft(initialRewardDraft);
  const rewardTitle = rewardDraft.title;
  const rewardAmount = rewardDraft.amount;
  const rewardNote = rewardDraft.note;
  const [feedback, setFeedback] = useState("");

  function resetEntryForm() {
    setEditingId(null);
    setMood("hopeful");
    setContext("neutral");
    setEntryDate(defaultDate);
    setEntryTime(getDhakaDateTimeInput().time);
    setSituation("");
    setResponse("");
    setReflection("");
    setShowForm(false);
  }

  function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!situation.trim() && !response.trim() && !reflection.trim()) {
      setFeedback("অন্তত একটি ছোট নোট লিখে রাখো।");
      return;
    }
    if (entryDate < stage.startDate || entryDate > stage.endDate) {
      setFeedback("এই পর্যায়ের তারিখের মধ্যেই এন্ট্রি দিতে হবে।");
      return;
    }
    const maghribForDay = data.prayerTimesCache.find((item) => item.date === entryDate)?.maghrib || data.preferences.maghribTime;
    const civilDate = maghribForDay && entryTime >= maghribForDay ? addDaysToDateKey(entryDate, -1) : entryDate;
    const occurredAt = toDhakaIso(civilDate, entryTime);
    if (!occurredAt) {
      setFeedback("সময়টি সঠিকভাবে নির্বাচন করো।");
      return;
    }
    const now = new Date().toISOString();
    const entry: JourneyObservation = {
      id: editingId || uid(), journeyId: FIXED_JOURNEY_ID, stageNumber: stage.stageNumber,
      date: entryDate, occurredAt, mood, context,
      situation: situation.trim().slice(0, 1600), response: response.trim().slice(0, 1600),
      reflection: reflection.trim().slice(0, 2000), createdAt: editingId
        ? observations.find((item) => item.id === editingId)?.createdAt || now : now
    };
    updateWorkspaceData((current) => ({
      ...current,
      journeyObservations: editingId
        ? current.journeyObservations.map((item) => item.id === editingId ? entry : item)
        : [entry, ...current.journeyObservations]
    }));
    setFeedback(editingId ? "অনুভূতির নোট আপডেট হয়েছে।" : "অনুভূতির নোট সংরক্ষিত হয়েছে।");
    resetEntryForm();
  }

  function beginEdit(item: JourneyObservation) {
    setEditingId(item.id);
    setMood(item.mood);
    setContext(item.context);
    setEntryDate(item.date);
    setEntryTime(getDhakaDateTimeInput(new Date(item.occurredAt)).time);
    setSituation(item.situation);
    setResponse(item.response);
    setReflection(item.reflection);
    setShowForm(true);
    setFeedback("");
  }

  function deleteObservation(id: string) {
    if (!window.confirm("এই অনুভূতির নোটটি মুছে ফেলবে?")) return;
    updateWorkspaceData((current) => ({ ...current, journeyObservations: current.journeyObservations.filter((item) => item.id !== id) }));
  }

  function saveReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete || !rewardTitle.trim()) return;
    const amount = rewardAmount.trim() ? Number(rewardAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 100000000)) return;
    const now = new Date().toISOString();
    updateWorkspaceData((current) => {
      const existing = current.journeyMilestones.find((item) => item.journeyId === FIXED_JOURNEY_ID && item.stageNumber === stage.stageNumber);
      if (existing) return {
        ...current,
        journeyMilestones: current.journeyMilestones.map((item) => item.id === existing.id
          ? { ...item, rewardTitle: rewardTitle.trim(), rewardAmount: amount, rewardNote: rewardNote.trim() }
          : item)
      };
      const record: JourneyMilestone = {
        id: uid(), journeyId: FIXED_JOURNEY_ID, stageNumber: stage.stageNumber, title: stage.title,
        requiredDays: stage.durationDays, completedAt: stage.endDate, rewardTitle: rewardTitle.trim(),
        rewardAmount: amount, rewardNote: rewardNote.trim(), badgeAwarded: true, createdAt: now
      };
      return { ...current, journeyMilestones: [...current.journeyMilestones, record] };
    });
    setFeedback("এই পর্যায়ের অর্জন সংরক্ষিত হয়েছে।");
  }

  const counts = {
    positive: observations.filter((item) => item.context === "positive").length,
    difficult: observations.filter((item) => item.context === "difficult").length,
    neutral: observations.filter((item) => item.context === "neutral").length
  };
  const topMood = MOOD_OPTIONS
    .map((item) => ({ ...item, count: observations.filter((entry) => entry.mood === item.value).length }))
    .sort((a, b) => b.count - a.count)[0];

  return <div className="stage-detail-view view-stack">
    <div className="stage-detail-heading release-page-heading section-heading-unified">
      <button type="button" className="section-back-button" onClick={onBack} aria-label="লক্ষ্যে ফিরে যাও" title="লক্ষ্যে ফিরে যাও"><ArrowLeft size={16}/><span>ফিরে যাও</span></button>
      <div className="page-intro-title-chip stage-title-chip"><span>মডিউল {stage.module.toLocaleString("bn-BD")} · পর্যায় {stage.stageNumber.toLocaleString("bn-BD")}</span><h1>{stage.title}</h1><small>{formatCompactDate(stage.startDate)} – {formatCompactDate(stage.endDate)}</small></div>
      <span className="section-heading-spacer" aria-hidden="true"/>
    </div>
    <section className={`stage-detail-status module-tone-${stage.module}`}>
      <span>{complete ? "সম্পন্ন পর্যায়" : currentDate >= stage.startDate && currentDate <= stage.endDate ? "চলমান পর্যায়" : "পরবর্তী পর্যায়"}</span>
      <strong>{complete ? "সবুজ যাচাইকৃত ব্যাজ অর্জিত" : currentDate < stage.startDate ? "শুরু হওয়ার অপেক্ষায়" : `${Math.max(1, Math.min(stage.durationDays, differenceInDateKeys(stage.startDate, currentDate) + 1)).toLocaleString("bn-BD")} / ${stage.durationDays.toLocaleString("bn-BD")} দিন`}</strong>
    </section>
    <section className="stage-observation-summary">
      <div><strong>{observations.length.toLocaleString("bn-BD")}</strong><span>মোট নোট</span></div>
      <div><strong>{counts.positive.toLocaleString("bn-BD")}</strong><span>ইতিবাচক অভিজ্ঞতা</span></div>
      <div><strong>{counts.difficult.toLocaleString("bn-BD")}</strong><span>কঠিন সময়</span></div>
      <div><strong>{topMood?.count ? `${topMood.emoji} ${topMood.label}` : "—"}</strong><span>প্রধান অনুভূতি</span></div>
    </section>
    <section className="stage-observation-panel">
      <div className="stage-section-head"><div><span className="eyebrow">নিজের অভিজ্ঞতা</span><h2>এই পর্যায়ে কেমন কাটছে?</h2></div><button type="button" className="button-primary button-small" disabled={currentDate < stage.startDate} onClick={() => { setEditingId(null); setShowForm((value) => !value); setFeedback(""); }}><Plus size={15}/> অনুভূতি যোগ করো</button></div>
      {currentDate < stage.startDate && <p className="stage-empty-state">এই পর্যায় শুরু হলে অনুভূতি ও অভিজ্ঞতার নোট যোগ করতে পারবে।</p>}
      {showForm && <form className="stage-observation-form" onSubmit={saveObservation}>
        <div className="stage-mood-grid">{MOOD_OPTIONS.map((option) => <button type="button" key={option.value} className={`stage-mood-option ${mood === option.value ? "selected" : ""}`} onClick={() => setMood(option.value)}><span>{option.emoji}</span><small>{option.label}</small></button>)}</div>
        <div className="tracker-form-grid">
          <label className="tracker-field"><span>অভিজ্ঞতার ধরন</span><select className="tracker-input" value={context} onChange={(event) => setContext(event.target.value as ContextValue)}><option value="positive">ইতিবাচক</option><option value="difficult">কঠিন</option><option value="neutral">সাধারণ</option></select></label>
          <label className="tracker-field"><span>তারিখ</span><input className="tracker-input" type="date" min={stage.startDate} max={currentDate < stage.endDate ? currentDate : stage.endDate} value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required/></label>
          <label className="tracker-field"><span>সময়</span><input className="tracker-input" type="time" value={entryTime} onChange={(event) => setEntryTime(event.target.value)} required/></label>
        </div>
        <label className="tracker-field"><span>কী ঘটেছিল বা কী অনুভব করেছ?</span><textarea className="tracker-input tracker-textarea" rows={2} value={situation} onChange={(event) => setSituation(event.target.value)} maxLength={1600} placeholder="ঘটনা বা অনুভূতির সংক্ষিপ্ত বিবরণ…"/></label>
        <label className="tracker-field"><span>কীভাবে সামলেছ?</span><textarea className="tracker-input tracker-textarea" rows={2} value={response} onChange={(event) => setResponse(event.target.value)} maxLength={1600} placeholder="যে পদক্ষেপটি সাহায্য করেছে…"/></label>
        <label className="tracker-field"><span>কারণ বা নিজের উপলব্ধি</span><textarea className="tracker-input tracker-textarea" rows={2} value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000} placeholder="পরের বার কী মনে রাখতে চাও…"/></label>
        <div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={resetEntryForm}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={!situation.trim() && !response.trim() && !reflection.trim()}>{editingId ? "পরিবর্তন সংরক্ষণ" : "নোট সংরক্ষণ"}</button></div>
      </form>}
      {feedback && <p className="stage-feedback" role="status">{feedback}</p>}
      {observations.length ? <div className="stage-observation-list">{observations.map((item) => <article className="stage-observation-item" key={item.id}>
        <div className="stage-observation-item-head"><div><strong>{MOOD_LABELS[item.mood] || item.mood}</strong><span>{formatCompactDate(item.date)} · {getDhakaDateTimeInput(new Date(item.occurredAt)).time}</span></div><span className={`stage-context-chip context-${item.context}`}>{item.context === "positive" ? "ইতিবাচক" : item.context === "difficult" ? "কঠিন" : "সাধারণ"}</span></div>
        {item.situation && <p>{item.situation}</p>}{item.response && <p><b>সামলানোর উপায়:</b> {item.response}</p>}{item.reflection && <p><b>উপলব্ধি:</b> {item.reflection}</p>}
        <div className="stage-observation-actions"><button type="button" onClick={() => beginEdit(item)}>সম্পাদনা</button><button type="button" onClick={() => deleteObservation(item.id)}>মুছে ফেলো</button></div>
      </article>)}</div> : <p className="stage-empty-state">এই পর্যায়ের অনুভূতি বা অভিজ্ঞতা এখনো লেখা হয়নি। প্রয়োজনমতো ছোট নোট যোগ করতে পারো।</p>}
    </section>
    {complete && <section className="stage-reward-panel">
      <div><span className="eyebrow">অর্জনের স্বীকৃতি</span><h2>নিজেকে কী পুরস্কার দেবে?</h2></div>
      <form onSubmit={saveReward}>
        <label className="tracker-field"><span>পুরস্কারের নাম</span><input className="tracker-input" value={rewardTitle} onChange={(event) => setRewardDraft((current) => ({ ...current, title: event.target.value }))} maxLength={120} placeholder="যেমন: পছন্দের একটি বই" required/></label>
        <label className="tracker-field"><span>নির্ধারিত পরিমাণ (ঐচ্ছিক)</span><input className="tracker-input" type="number" min="0" max="100000000" step="1" value={rewardAmount} onChange={(event) => setRewardDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="ঐচ্ছিক"/></label>
        <label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><textarea className="tracker-input tracker-textarea" rows={2} value={rewardNote} onChange={(event) => setRewardDraft((current) => ({ ...current, note: event.target.value }))} maxLength={1200}/></label>
        <button type="submit" className="tracker-primary-button" disabled={!rewardTitle.trim()}>পুরস্কার সংরক্ষণ</button>
      </form>
      {milestone?.badgeAwarded && <span className="stage-verified-badge"><CheckCircle2 size={16}/> পর্যায় সম্পন্ন</span>}
    </section>}
  </div>;
}

function GoalsView({ data }: { data: ReturnType<typeof getWorkspaceData> }) {
  const dateNow = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const progress = getFixedJourneyProgress(dateNow);
  const [activeTab, setActiveTab] = useState<"journey" | "goals">(() => typeof window !== "undefined" && new URL(window.location.href).searchParams.get("tab") === "goals" ? "goals" : "journey");
  const [focusGoalId, setFocusGoalId] = useState<string | null>(() => typeof window !== "undefined" ? new URL(window.location.href).searchParams.get("goalId") : null);
  const [selectedStageNumber, setSelectedStageNumber] = useState<number | null>(null);
  const [stageReturnTab, setStageReturnTab] = useState<"journey" | "goals">("journey");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalStartDate, setGoalStartDate] = useState(dateNow);
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalCategory, setGoalCategory] = useState<DeadlinePlan["category"]>("exam");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalError, setGoalError] = useState("");
  const [taskPlanId, setTaskPlanId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const completedStages = progress.currentStage ? progress.currentStage.stageNumber - 1 : progress.status === "completed" ? 71 : 0;
  const milestonesSnapshot = data.journeyMilestones;
  useEffect(() => {
    if (completedStages < 1) return;
    const existing = new Set(milestonesSnapshot.filter((item) => item.journeyId === FIXED_JOURNEY_ID).map((item) => item.stageNumber));
    const missing = FIXED_JOURNEY_STAGES.filter((stage) => stage.stageNumber <= completedStages && !existing.has(stage.stageNumber)).map((stage) => ({
      id: uid(), journeyId: FIXED_JOURNEY_ID, stageNumber: stage.stageNumber, title: stage.title,
      requiredDays: stage.durationDays, completedAt: stage.endDate, rewardTitle: "", rewardAmount: null,
      rewardNote: "", badgeAwarded: true, createdAt: new Date().toISOString()
    }));
    if (missing.length) updateWorkspaceData((current) => ({ ...current, journeyMilestones: [...current.journeyMilestones, ...missing] }));
  }, [completedStages, milestonesSnapshot]);

  useEffect(() => {
    const applyGoalTarget = () => {
      const url = new URL(window.location.href);
      const requestedTab = url.searchParams.get("tab");
      const requestedGoal = url.searchParams.get("goalId");
      if (requestedTab === "goals" || requestedGoal) setActiveTab("goals");
      if (requestedGoal) setFocusGoalId(requestedGoal);
    };
    window.addEventListener("popstate", applyGoalTarget);
    window.addEventListener(SECTION_EVENT, applyGoalTarget);
    return () => {
      window.removeEventListener("popstate", applyGoalTarget);
      window.removeEventListener(SECTION_EVENT, applyGoalTarget);
    };
  }, []);

  function stageGoal(stage: (typeof FIXED_JOURNEY_STAGES)[number]) {
    return data.deadlinePlans.find((plan) => {
      const start = plan.startDate || plan.createdAt.slice(0, 10);
      return start <= stage.endDate && plan.deadline >= stage.startDate;
    }) ?? null;
  }

  function editGoal(plan: DeadlinePlan) {
    setEditingPlanId(plan.id);
    setGoalTitle(plan.title);
    setGoalStartDate(plan.startDate || plan.createdAt.slice(0, 10));
    setGoalDeadline(plan.deadline);
    setGoalCategory(plan.category);
    setGoalDescription(plan.description);
    setGoalError("");
    setShowGoalForm(true);
    setActiveTab("goals");
  }

  function cancelGoalForm() {
    setShowGoalForm(false);
    setEditingPlanId(null);
    setGoalTitle(""); setGoalStartDate(dateNow); setGoalDeadline(""); setGoalDescription(""); setGoalCategory("exam"); setGoalError("");
  }

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goalTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(goalStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(goalDeadline) || goalDeadline < goalStartDate) {
      setGoalError("নাম এবং সঠিক শুরু ও শেষ তারিখ দাও।");
      return;
    }
    const overlap = data.deadlinePlans.find((plan) => {
      if (plan.id === editingPlanId) return false;
      const otherStart = plan.startDate || plan.createdAt.slice(0, 10);
      return goalStartDate <= plan.deadline && goalDeadline >= otherStart;
    });
    if (overlap) {
      setGoalError(`এই সময়ে “${overlap.title}” লক্ষ্যটি রয়েছে। আলাদা সময়সীমা নির্বাচন করো।`);
      return;
    }
    const now = new Date().toISOString();
    if (editingPlanId) {
      updateWorkspaceData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id === editingPlanId ? {
        ...plan, title: goalTitle.trim(), startDate: goalStartDate, deadline: goalDeadline, category: goalCategory,
        description: goalDescription.trim(), updatedAt: now
      } : plan) }));
    } else {
      const plan: DeadlinePlan = { id: uid(), title: goalTitle.trim(), startDate: goalStartDate, deadline: goalDeadline,
        category: goalCategory, description: goalDescription.trim(), tasks: [], createdAt: now, updatedAt: now };
      updateWorkspaceData((current) => ({ ...current, deadlinePlans: [...current.deadlinePlans, plan] }));
    }
    cancelGoalForm();
  }

  function addTask(event: FormEvent<HTMLFormElement>, planId: string) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    const now = new Date().toISOString();
    if (editingTaskId) {
      updateWorkspaceData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id !== planId ? plan : {
        ...plan, updatedAt: now, tasks: plan.tasks.map((task) => task.id === editingTaskId ? { ...task, title: taskTitle.trim(), details: taskDetails.trim(), dueDate: taskDueDate } : task)
      }) }));
    } else {
      const task: DeadlineTask = { id: uid(), title: taskTitle.trim(), details: taskDetails.trim(), dueDate: taskDueDate,
        completed: false, completedAt: null, createdAt: now };
      updateWorkspaceData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id === planId ? { ...plan, tasks: [...plan.tasks, task], updatedAt: now } : plan) }));
    }
    setTaskTitle(""); setTaskDetails(""); setTaskDueDate(""); setTaskPlanId(""); setEditingTaskId(null);
  }
  function editTask(planId: string, task: DeadlineTask) {
    setTaskPlanId(planId); setEditingTaskId(task.id); setTaskTitle(task.title); setTaskDetails(task.details); setTaskDueDate(task.dueDate);
  }
  function cancelTaskEdit() {
    setTaskPlanId(""); setEditingTaskId(null); setTaskTitle(""); setTaskDetails(""); setTaskDueDate("");
  }
  function toggleTask(planId: string, taskId: string) {
    const now = new Date().toISOString();
    updateWorkspaceData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id !== planId ? plan : {
      ...plan, updatedAt: now, tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: task.completed ? null : now } : task)
    }) }));
  }
  function removeTask(planId: string, taskId: string) {
    if (!window.confirm("এই কাজটি মুছে ফেলবে?")) return;
    updateWorkspaceData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id === planId ? { ...plan, tasks: plan.tasks.filter((task) => task.id !== taskId), updatedAt: new Date().toISOString() } : plan) }));
    if (editingTaskId === taskId) cancelTaskEdit();
  }
  function removeGoal(planId: string) {
    if (!window.confirm("এই লক্ষ্য ও এর কাজগুলো মুছে ফেলবে?")) return;
    updateWorkspaceData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.filter((plan) => plan.id !== planId) }));
    if (taskPlanId === planId) cancelTaskEdit();
  }

  const sortedPlans = [...data.deadlinePlans].sort((a, b) => (a.startDate || a.createdAt.slice(0, 10)).localeCompare(b.startDate || b.createdAt.slice(0, 10)));
  const completedGoals = sortedPlans.filter((plan) => plan.tasks.length > 0 && plan.tasks.every((task) => task.completed)).length;
  const selectedStage = selectedStageNumber ? FIXED_JOURNEY_STAGES.find((stage) => stage.stageNumber === selectedStageNumber) ?? null : null;
  const categoryLabel = (category: DeadlinePlan["category"]) => ({ exam: "পরীক্ষা", assignment: "অ্যাসাইনমেন্ট", project: "প্রজেক্ট", other: "অন্যান্য" })[category];
  useEffect(() => {
    if (!focusGoalId || activeTab !== "goals") return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`deadline-plan-${focusGoalId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("is-focused");
    }, 100);
    return () => window.clearTimeout(timer);
  }, [focusGoalId, activeTab, sortedPlans.length]);

  if (selectedStage) return <div className="view-stack"><StageDetailView stage={selectedStage} data={data} currentDate={dateNow} onBack={() => { setSelectedStageNumber(null); setActiveTab(stageReturnTab); }}/></div>;

  return <div className="view-stack goals-workspace">
    <PageIntro title="লক্ষ্য" variant="goals" onBack={() => navigateSection("home")} />
    <div className="goals-mode-tabs" role="tablist" aria-label="লক্ষ্যের বিভাগ">
      <button type="button" role="tab" aria-selected={activeTab === "journey"} className={activeTab === "journey" ? "selected" : ""} onClick={() => { setActiveTab("journey"); setFocusGoalId(null); const url = new URL(window.location.href); url.searchParams.delete("tab"); url.searchParams.delete("goalId"); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); }}><ShieldCheck size={17}/> আত্মশুদ্ধি</button>
      <button type="button" role="tab" aria-selected={activeTab === "goals"} className={activeTab === "goals" ? "selected" : ""} onClick={() => { setActiveTab("goals"); const url = new URL(window.location.href); url.searchParams.set("tab", "goals"); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); }}><Target size={17}/> লক্ষ্য</button>
    </div>

    {activeTab === "journey" ? <>
      <section className={`journey-current-hero journey-current-hero-compact module-tone-${progress.currentStage?.module ?? 1}`} role="button" tabIndex={0} onClick={() => { setStageReturnTab("journey"); if (progress.currentStage) { setSelectedStageNumber(progress.currentStage.stageNumber); } else { setActiveTab("goals"); } }} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); setStageReturnTab("journey"); if (progress.currentStage) { setSelectedStageNumber(progress.currentStage.stageNumber); } else { setActiveTab("goals"); } }} aria-label="বর্তমান আত্মশুদ্ধির পর্যায়ের বিস্তারিত খুলুন">
        <span className="journey-current-kicker">{progress.status === "completed" ? "অর্জনের স্বীকৃতি" : progress.status === "upcoming" ? "শুরুর প্রস্তুতি" : `মডিউল ${progress.currentStage?.module.toLocaleString("bn-BD")} · বর্তমান পর্যায়`}</span>
        <h2>{progress.currentStage?.title || (progress.status === "completed" ? "নতুন অধ্যায়ের সূচনা" : "আত্মশুদ্ধির যাত্রা")}</h2>
        <p className="journey-current-dates">{formatCompactDate(progress.currentStage?.startDate || FIXED_JOURNEY_START_DATE)} — {formatCompactDate(progress.currentStage?.endDate || FIXED_JOURNEY_END_DATE)}</p>
        <div className="journey-current-index"><span>পর্যায় {progress.currentStage?.stageNumber.toLocaleString("bn-BD") || (progress.status === "completed" ? "৭১" : "—")} / ৭১</span><span>{progress.currentStage ? `দিন ${progress.stageDay.toLocaleString("bn-BD")} / ${progress.currentStage.durationDays.toLocaleString("bn-BD")}` : progress.status === "upcoming" ? "শুরু হয়নি" : "সব পর্যায় সম্পন্ন"}</span></div>
        <div className="journey-current-track"><span style={{ width: `${progress.currentStage ? progress.stagePercent : progress.percent}%` }}/></div>
        <div className="journey-current-meta"><div><strong>{progress.currentStage ? `${progress.stagePercent.toLocaleString("bn-BD")}٪ সম্পন্ন` : progress.status === "upcoming" ? "প্রস্তুতির সময়" : "১০০٪ সম্পন্ন"}</strong><small>এই পর্যায়ের অগ্রগতি</small></div><div><strong>{progress.stageRemainingDays.toLocaleString("bn-BD")} দিন</strong><small>পরবর্তী পর্যায়ে বাকি</small></div><div className="journey-overall-progress" title="শুরুর তারিখ থেকে নির্ধারিত মোট যাত্রার দিনের তুলনায় অতিক্রান্ত দিনের অনুপাত"><strong>{progress.percent.toLocaleString("bn-BD")}٪</strong><small>সামগ্রিক অগ্রগতি</small><span>শুরুর দিন থেকে অতিক্রান্ত দিন ÷ মোট নির্ধারিত দিন</span></div></div>
      </section>
      <div className="journey-module-intro"><div><span className="eyebrow">৭১টি পর্যায়</span><h2>তোমার অগ্রযাত্রা</h2></div><span>{completedStages.toLocaleString("bn-BD")} / ৭১ সম্পন্ন</span></div>
      <div className="journey-modules-list">
        {[1, 2, 3].map((moduleNumber) => {
          const moduleStages = FIXED_JOURNEY_STAGES.filter((stage) => stage.module === moduleNumber);
          const moduleDone = moduleStages.filter((stage) => stageStatus(stage.stageNumber, progress.currentStage?.stageNumber || 72, progress.status) === "completed").length;
          const label = moduleNumber === 1 ? "ভিত্তি গঠন" : moduleNumber === 2 ? "দৃঢ়তার শিখর" : "অর্জন ধরে রাখা";
          return <section className={`journey-module-card module-tone-${moduleNumber}`} key={moduleNumber}>
            <div className="journey-module-heading"><div><span>মডিউল {moduleNumber.toLocaleString("bn-BD")}</span><h3>{label}</h3></div><strong>{moduleDone.toLocaleString("bn-BD")} / {moduleStages.length.toLocaleString("bn-BD")}</strong></div>
            <div className="journey-module-track"><span style={{ width: `${moduleStages.length ? moduleDone / moduleStages.length * 100 : 0}%` }}/></div>
            <div className="journey-stage-list">{moduleStages.map((stage) => {
              const status = stageStatus(stage.stageNumber, progress.currentStage?.stageNumber || 72, progress.status);
              const percent = status === "completed" ? 100 : status === "current" ? progress.stagePercent : 0;
              const elapsedDays = status === "completed" ? stage.durationDays : status === "current" ? progress.stageDay : 0;
              const remainingDays = Math.max(0, stage.durationDays - elapsedDays);
              const linkedGoal = stageGoal(stage);
              const statusLabel = status === "completed" ? "সম্পন্ন ব্যাচ" : status === "current" ? "চলমান ব্যাচ" : "পরবর্তী ব্যাচ";
              return <button type="button" className={`journey-stage-row stage-${status}`} key={stage.stageNumber} onClick={() => { setStageReturnTab("journey"); setSelectedStageNumber(stage.stageNumber); }} aria-label={`পর্যায় ${stage.stageNumber}: ${stage.title}, ${statusLabel}`}>
                <span className="journey-stage-index">{status === "completed" ? <CheckCircle2 size={18}/> : stage.stageNumber.toLocaleString("bn-BD")}</span>
                <span className="journey-stage-main">
                  <span className="journey-stage-title-line"><strong>{stage.title}</strong><em className={`journey-stage-status-chip stage-chip-${status}`}>{statusLabel}</em></span>
                  <small>{formatCompactDate(stage.startDate)} – {formatCompactDate(stage.endDate)}</small>
                  {linkedGoal && <em className="journey-stage-goal-chip" title={linkedGoal.title}>লক্ষ্য · {linkedGoal.title.length > 18 ? `${linkedGoal.title.slice(0, 18)}…` : linkedGoal.title}</em>}
                  <span className="journey-stage-mini-track"><i style={{ width: `${percent}%` }}/></span>
                </span>
                <span className="journey-stage-trailing"><b>{percent.toLocaleString("bn-BD")}٪</b><small>{elapsedDays.toLocaleString("bn-BD")} / {stage.durationDays.toLocaleString("bn-BD")} দিন</small><small>{remainingDays ? `${remainingDays.toLocaleString("bn-BD")} দিন বাকি` : status === "completed" ? "অর্জিত" : ""}</small></span>
                <ChevronRight size={16}/>
              </button>;
            })}</div>
          </section>;
        })}
      </div>
    </> : <>
      <div className="metric-grid metric-grid-three">
        <MetricCard label="মোট লক্ষ্য" value={sortedPlans.length.toLocaleString("bn-BD")} detail="সময়সীমা নির্ধারিত" icon={Target}/>
        <MetricCard label="চলমান লক্ষ্য" value={sortedPlans.filter((plan) => plan.deadline >= dateNow).length.toLocaleString("bn-BD")} detail="সময় এখনো বাকি" icon={CalendarDays} accent="sand"/>
        <MetricCard label="সম্পন্ন লক্ষ্য" value={completedGoals.toLocaleString("bn-BD")} detail="সব কাজ টিক দেওয়া" icon={CheckCircle2} accent="blue"/>
      </div>
      <section className="goal-plans-section">
        <div className="goal-section-heading"><div><span className="eyebrow">সময় ধরে পরিকল্পনা</span><h2>তোমার লক্ষ্যগুলো</h2></div><button type="button" className="button-primary button-small" onClick={() => { cancelGoalForm(); setShowGoalForm(true); }}><Plus size={15}/> লক্ষ্য যোগ করো</button></div>
        {showGoalForm && <form className="deadline-create-form goal-create-form" onSubmit={saveGoal}>
          <div className="tracker-form-grid"><label className="tracker-field"><span>লক্ষ্যের নাম</span><input className="tracker-input" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} maxLength={140} placeholder="যেমন: ফাইনাল পরীক্ষার প্রস্তুতি" required/></label><label className="tracker-field"><span>ধরন</span><select className="tracker-input" value={goalCategory} onChange={(event) => setGoalCategory(event.target.value as DeadlinePlan["category"])}><option value="exam">পরীক্ষা</option><option value="assignment">অ্যাসাইনমেন্ট</option><option value="project">প্রজেক্ট</option><option value="other">অন্যান্য</option></select></label><label className="tracker-field"><span>শুরুর তারিখ</span><input className="tracker-input" type="date" value={goalStartDate} onChange={(event) => setGoalStartDate(event.target.value)} required/></label><label className="tracker-field"><span>শেষ তারিখ</span><input className="tracker-input" type="date" min={goalStartDate} value={goalDeadline} onChange={(event) => setGoalDeadline(event.target.value)} required/></label></div>
          <label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><textarea className="tracker-input tracker-textarea" rows={2} value={goalDescription} onChange={(event) => setGoalDescription(event.target.value)} maxLength={1600} placeholder="এই লক্ষ্যে কী অর্জন করতে চাও…"/></label>
          {goalError && <p className="inline-feedback" role="alert">{goalError}</p>}
          <div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={cancelGoalForm}>বাতিল</button><button type="submit" className="tracker-primary-button">{editingPlanId ? "লক্ষ্য আপডেট" : "লক্ষ্য সংরক্ষণ"}</button></div>
        </form>}
        {sortedPlans.length ? <div className="deadline-plan-list">{sortedPlans.map((plan) => {
          const start = plan.startDate || plan.createdAt.slice(0, 10);
          const done = plan.tasks.filter((task) => task.completed).length;
          const percent = plan.tasks.length ? Math.round(done / plan.tasks.length * 100) : 0;
          const left = differenceInDateKeys(dateNow, plan.deadline);
          const linked = FIXED_JOURNEY_STAGES.filter((stage) => start <= stage.endDate && plan.deadline >= stage.startDate);
          return <article id={`deadline-plan-${plan.id}`} className={`deadline-plan-card ${focusGoalId === plan.id ? "is-focused" : ""}`} key={plan.id}>
            <div className="deadline-plan-heading"><div><span className="deadline-category">{categoryLabel(plan.category)}</span><h3>{plan.title}</h3>{plan.description && <p>{plan.description}</p>}</div><div className="deadline-goal-actions"><button type="button" className="icon-button-soft" aria-label="লক্ষ্য সম্পাদনা" onClick={() => editGoal(plan)}>✎</button><button type="button" className="icon-button-soft" aria-label="লক্ষ্য মুছুন" onClick={() => removeGoal(plan.id)}><X size={16}/></button></div></div>
            <div className="deadline-countdown"><strong>{left < 0 ? `${Math.abs(left).toLocaleString("bn-BD")} দিন পেরিয়েছে` : left === 0 ? "আজ শেষ তারিখ" : `${left.toLocaleString("bn-BD")} দিন বাকি`}</strong><span>{formatCompactDate(start)} – {formatCompactDate(plan.deadline)}</span></div>
            {linked.length > 0 && <div className="goal-linked-stages"><span>সম্পর্কিত পর্যায়</span>{linked.slice(0, 6).map((stage) => {
              const shortTitle = stage.title.length > 12 ? `${stage.title.slice(0, 12)}…` : stage.title;
              return <button type="button" key={stage.stageNumber} title={stage.title} onClick={() => { setStageReturnTab("goals"); setSelectedStageNumber(stage.stageNumber); }}>পর্যায় {stage.stageNumber.toLocaleString("bn-BD")} · {shortTitle}</button>;
            })}{linked.length > 6 && <span className="goal-linked-more">+{(linked.length - 6).toLocaleString("bn-BD")} আরও</span>}</div>}
            <div className="deadline-progress"><span style={{ width: `${percent}%` }}/></div>
            <div className="deadline-progress-label"><span>{done.toLocaleString("bn-BD")} / {plan.tasks.length.toLocaleString("bn-BD")} কাজ সম্পন্ন</span><strong>{percent.toLocaleString("bn-BD")}%</strong></div>
            <div className="deadline-task-list">{plan.tasks.map((task) => <div className={`deadline-task-row ${task.completed ? "is-done" : ""}`} key={task.id}><label><input type="checkbox" checked={task.completed} onChange={() => toggleTask(plan.id, task.id)}/><span><strong>{task.title}</strong>{task.details && <small>{task.details}</small>}{task.dueDate && <small>শেষ তারিখ: {formatCompactDate(task.dueDate)}</small>}</span></label><div className="deadline-task-actions"><button type="button" className="tracker-icon-button" aria-label="কাজ সম্পাদনা" onClick={() => editTask(plan.id, task)}><Pencil size={14}/></button><button type="button" className="tracker-icon-button" aria-label="কাজ মুছুন" onClick={() => removeTask(plan.id, task.id)}><X size={14}/></button></div></div>)}</div>
            {taskPlanId === plan.id ? <form className="deadline-task-form" onSubmit={(event) => addTask(event, plan.id)}><label className="tracker-field"><span>কাজের নাম</span><input className="tracker-input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="যেমন: প্রথম অধ্যায় শেষ করা" required/></label><label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><input className="tracker-input" value={taskDetails} onChange={(event) => setTaskDetails(event.target.value)} maxLength={600}/></label><label className="tracker-field"><span>কাজের শেষ তারিখ (ঐচ্ছিক)</span><input className="tracker-input" type="date" min={start} max={plan.deadline} value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)}/></label><div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={cancelTaskEdit}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={!taskTitle.trim()}>{editingTaskId ? "কাজ আপডেট" : "কাজ যোগ করো"}</button></div></form> : <button type="button" className="text-action deadline-add-task" onClick={() => { setTaskPlanId(plan.id); setEditingTaskId(null); setTaskTitle(""); setTaskDetails(""); setTaskDueDate(""); }}><Plus size={15}/> পরিকল্পনায় কাজ যোগ করো</button>}
          </article>;
        })}</div> : <div className="goal-empty-state"><strong>এখনো কোনো লক্ষ্য যোগ করা হয়নি</strong><p>শুরু ও শেষ তারিখ নির্ধারণ করে তোমার পরিকল্পনা সাজাও। একই সময়ে একটি লক্ষ্য রাখা যাবে।</p></div>}
      </section>
    </>}
  </div>;
}

function JournalView({ data }: { data: ReturnType<typeof getWorkspaceData> }) {
  return <TrackerCenter data={data} onBack={() => navigateSection("home")}/>;
}

function MirrorView({ data }: { data: ReturnType<typeof getWorkspaceData> }) {
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const end = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const startDate = new Date(`${end}T12:00:00`); startDate.setDate(startDate.getDate() - Number(range) + 1);
  const startKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(startDate);
  const within = (date: string) => date >= startKey && date <= end;
  const prayers = data.prayerEntries.filter((item) => within(item.date) && item.method !== "qada");
  const qadaPrayers = data.prayerEntries.filter((item) => within(item.date) && item.method === "qada");
  const quran = data.quranEntries.filter((item) => within(item.date));
  const dhikr = data.dhikrSessions.filter((item) => within(item.date));
  const fasting = data.fastingEntries.filter((item) => within(item.date));
  const good = data.deedEntries.filter((item) => within(item.date));
  const avoid = data.avoidEntries.filter((item) => within(item.date));
  const rakatTotal = prayers.flatMap((item) => item.components).reduce((sum, part) => sum + part.performedRakats, 0);
  const ayahTotal = quran.reduce((sum, item) => sum + item.ayahTo - item.ayahFrom + 1, 0);
  const dhikrTotal = dhikr.reduce((sum, item) => sum + item.count, 0);
  const days = Array.from({ length: 7 }, (_, index) => { const key = addDaysToDateKey(end, index - 6); const d = new Date(`${key}T12:00:00Z`); const count = prayers.filter((x) => x.date === key).length + quran.filter((x) => x.date === key).length + dhikr.filter((x) => x.date === key).length + good.filter((x) => x.date === key).length + fasting.filter((x) => x.date === key).length; return { key, label: new Intl.DateTimeFormat("bn-BD", { weekday: "short", timeZone: "UTC" }).format(d), count }; });
  const max = Math.max(1, ...days.map((x) => x.count));
  return <div className="view-stack">
    <PageIntro title="নফস আয়না" onBack={() => navigateSection("home")}/>
    <div className="range-control" role="group" aria-label="বিশ্লেষণের সময়সীমা">{[{ value: "7", label: "৭ দিন" }, { value: "30", label: "৩০ দিন" }, { value: "90", label: "৯০ দিন" }].map((item) => <button type="button" key={item.value} onClick={() => setRange(item.value as typeof range)} className={range === item.value ? "active" : ""}>{item.label}</button>)}</div>
    <div className="metric-grid"><MetricCard label="আদায়কৃত রাকাত" value={rakatTotal.toLocaleString("bn-BD")} detail={`শেষ ${range} দিনের সালাত রেকর্ড`} icon={Moon}/><MetricCard label="কুরআনের আয়াত" value={ayahTotal.toLocaleString("bn-BD")} detail={`${quran.length.toLocaleString("bn-BD")}টি পাঠ`} icon={BookOpen} accent="sand"/><MetricCard label="জিকিরের সংখ্যা" value={dhikrTotal.toLocaleString("bn-BD")} detail={`${dhikr.length.toLocaleString("bn-BD")}টি সেশন`} icon={Sparkles} accent="blue"/><MetricCard label="ভালো কাজের রেকর্ড" value={good.length.toLocaleString("bn-BD")} detail={`${avoid.length.toLocaleString("bn-BD")}টি ব্যক্তিগত আত্মসংযম লগ`} icon={Heart} accent="rose"/><MetricCard label="কাজা আদায়" value={qadaPrayers.length.toLocaleString("bn-BD")} detail="নির্বাচিত সময়ে সম্পন্ন কাজার রেকর্ড" icon={Clock3} accent="sand"/></div>
    <div className="content-grid"><Panel eyebrow="দৈনিক কার্যক্রম" title="সাম্প্রতিক সাত দিনের ধারা"><div className="weekly-bars">{days.map((bar) => <div className="weekly-bar-column" key={bar.key}><span className="weekly-bar-value">{bar.count ? bar.count.toLocaleString("bn-BD") : "—"}</span><div className="weekly-bar-track"><span style={{ height: `${Math.max(bar.count ? 8 : 3, bar.count / max * 100)}%` }}/></div><small>{bar.label}</small></div>)}</div><p className="chart-caption">এই চার্টে দৈনিক Tracker Entry-এর সংখ্যা দেখানো হয়েছে; এটি ইবাদতের মান নির্ধারণ করে না।</p></Panel>
      <Panel eyebrow="সালাতের ধরন" title="রাকাতের বিভাগ"><div className="category-breakdown">{[{ id: "fard", label: "ফরজ" }, { id: "sunnah", label: "সুন্নত" }, { id: "wajib", label: "ওয়াজিব" }, { id: "nafl", label: "নফল" }].map((kind) => { const amount = prayers.flatMap((x) => x.components).filter((x) => x.category === kind.id).reduce((n, x) => n + x.performedRakats, 0); return <div className="breakdown-row" key={kind.id}><span className="breakdown-label">{kind.label}</span><span className="breakdown-track"><span style={{ width: `${rakatTotal ? amount / rakatTotal * 100 : 0}%` }}/></span><strong>{amount.toLocaleString("bn-BD")}</strong></div>; })}</div><p className="panel-footnote">রাকাতের হিসাব সেটিংস ও সংরক্ষিত এন্ট্রি থেকে তৈরি।</p></Panel></div>
    <Panel eyebrow="সময়সীমার সারাংশ" title="অন্যান্য ট্র্যাকার"><div className="tracker-stat-grid"><div><strong>{fasting.filter((x) => x.status === "completed").length.toLocaleString("bn-BD")}</strong><small>সম্পন্ন সিয়াম</small></div><div><strong>{good.length.toLocaleString("bn-BD")}</strong><small>ভালো কাজ</small></div><div><strong>{avoid.length.toLocaleString("bn-BD")}</strong><small>ব্যক্তিগত আত্মসংযম লগ</small></div><div><strong>{data.studyEntries.filter((x) => within(x.date)).length.toLocaleString("bn-BD")}</strong><small>অধ্যয়ন সেশন</small></div><div><strong>{data.habitLogs.filter((x) => within(x.date) && x.completed).length.toLocaleString("bn-BD")}</strong><small>সম্পন্ন অভ্যাস</small></div><div><strong>{data.reflections.filter((x) => within(x.date)).length.toLocaleString("bn-BD")}</strong><small>মুহাসাবা জার্নাল</small></div></div></Panel>
    <div className="local-data-note"><Cloud size={15}/>তোমার সংরক্ষিত তথ্য থেকে এই বিশ্লেষণ তৈরি হয়েছে।</div>
  </div>;
}

function NotificationPopover({ events }: { events: ReminderEvent[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const ordered = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = ordered.filter((item) => !item.readAt).length;

  useEffect(() => {
    if (!open) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markRead(id: string) {
    updateWorkspaceData((current) => ({ ...current, reminderEvents: current.reminderEvents.map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item) }));
  }
  function markAllRead() {
    const now = new Date().toISOString();
    updateWorkspaceData((current) => ({ ...current, reminderEvents: current.reminderEvents.map((item) => ({ ...item, readAt: item.readAt || now })) }));
  }
  function removeOne(id: string) {
    updateWorkspaceData((current) => ({ ...current, reminderEvents: current.reminderEvents.filter((item) => item.id !== id) }));
  }
  function removeAll() {
    if (!ordered.length || !window.confirm("সব নোটিফিকেশন মুছে ফেলবে?")) return;
    updateWorkspaceData((current) => ({ ...current, reminderEvents: [] }));
  }
  function openTarget(item: ReminderEvent) {
    markRead(item.id);
    setOpen(false);
    if (item.kind === "night-qada") {
      navigateSection("journal", "prayer", "qada", item.date);
      return;
    }
    if (item.prayer) {
      navigateSection("journal", "prayer", item.prayer, item.date);
      return;
    }
    navigateSection("journal", "prayer");
  }

  return <div className="notification-popover-wrap" ref={panelRef}>
    <button className="topbar-icon-button notification-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-label="নোটিফিকেশন" aria-expanded={open} aria-haspopup="dialog">
      <Bell size={18}/>{unread > 0 && <i/>}
    </button>
    {open && <section className="notification-popover" role="dialog" aria-label="নোটিফিকেশন তালিকা" aria-modal="true">
      <header className="notification-popover-header"><div><strong>নোটিফিকেশন</strong><small>{unread.toLocaleString("bn-BD")}টি নতুন</small></div><button type="button" className="icon-button-soft" aria-label="বন্ধ করো" onClick={() => setOpen(false)}><X size={16}/></button></header>
      <div className="notification-popover-actions"><button type="button" onClick={markAllRead} disabled={!unread}>সব পড়া হয়েছে</button><button type="button" onClick={removeAll} disabled={!ordered.length}>সব মুছো</button></div>
      <div className="notification-popover-list">
        {ordered.length ? ordered.map((item) => <article className={`notification-popover-item ${item.readAt ? "read" : "unread"}`} key={item.id}>
          <button type="button" className="notification-item-main" onClick={() => openTarget(item)}>
            <span className="notification-item-title">{item.title}</span>
            <span className="notification-item-summary">{item.message}</span>
            <small>{formatCompactDate(item.date)} · {new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(new Date(item.createdAt))}</small>
            <span className="notification-open-target">সংশ্লিষ্ট অংশে যাও <ArrowRight size={13}/></span>
          </button>
          <button type="button" className="notification-delete-button" aria-label="নোটিফিকেশন মুছুন" onClick={() => removeOne(item.id)}><Trash2 size={14}/></button>
        </article>) : <div className="notification-empty">এখনো কোনো নোটিফিকেশন নেই।</div>}
      </div>
    </section>}
  </div>;
}

function SettingsView({ data, userEmail, onLogout, loggingOut }: { data: ReturnType<typeof getWorkspaceData>; userEmail: string; onLogout: () => void; loggingOut: boolean }) {
  const { theme, setTheme, themeSaveState, themeSaveMessage } = useTheme();
  const [displayName, setDisplayName] = useState(data.preferences.displayName);
  const [phone, setPhone] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [maghribTime, setMaghribTime] = useState(data.preferences.maghribTime);
  const [saved, setSaved] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/profile", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("প্রোফাইলের তথ্য লোড করা যায়নি।");
        return response.json() as Promise<{ profile?: { displayName?: string | null; phone?: string | null } }>;
      })
      .then((result) => {
        if (!active) return;
        if (typeof result.profile?.displayName === "string" && result.profile.displayName.trim()) setDisplayName(result.profile.displayName);
        if (typeof result.profile?.phone === "string") setPhone(result.profile.phone);
      })
      .catch((error: unknown) => { if (active) setProfileMessage(error instanceof Error ? error.message : "প্রোফাইল লোড করা যায়নি।"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setMaghribTime(data.preferences.maghribTime), 0);
    return () => window.clearTimeout(timer);
  }, [data.preferences.maghribTime]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ displayName: displayName.trim(), phone: phone.trim() }) });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "প্রোফাইল সংরক্ষণ করা যায়নি।");
      updateWorkspaceData((current) => ({ ...current, preferences: { ...current.preferences, displayName: displayName.trim().slice(0, 80) } }));
      await flushWorkspaceChanges();
      if (getCloudSyncState() !== "synced") throw new Error(getCloudSyncMessage() || "প্রোফাইলের নাম Workspace-এ সংরক্ষণ হয়নি।");
      setProfileMessage("প্রোফাইল অনলাইনে সংরক্ষিত হয়েছে।");
    } catch {
      const message = "প্রোফাইল আপডেট করা যায়নি। সংযোগ ও তথ্য যাচাই করে আবার চেষ্টা করো।";
      setProfileMessage(message);
      showAppToast("error", message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateWorkspaceData((current) => ({ ...current, preferences: { ...current.preferences, timeZone: "Asia/Dhaka", maghribTime } }));
    await flushWorkspaceChanges();
    setSaved(getCloudSyncState() === "synced");
    if (getCloudSyncState() !== "synced") {
      const message = getCloudSyncMessage() || "অনলাইন সংরক্ষণ সম্পন্ন হয়নি। সংযোগ যাচাই করো।";
      setBackupMessage(message);
    }
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function exportData() {
    await flushWorkspaceChanges();
    if (getCloudSyncState() !== "synced") {
      setBackupMessage(getCloudSyncMessage() || "ব্যাকআপের আগে অনলাইন সংরক্ষণ সম্পন্ন করো।");
      return;
    }
    const payload = { app: "Amar Nfser Hisab", schemaVersion: 3, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `amar-nfser-hisab-backup-${todayKey(data.preferences.timeZone, data.preferences.maghribTime)}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    setBackupMessage("JSON ব্যাকআপ ফাইল তৈরি হয়েছে। এটি এনক্রিপ্ট করা নয়—নিরাপদে রাখো।");
  }

  async function importData(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setBackupMessage("Backup ফাইল ১০ MB সীমা অতিক্রম করেছে।"); return; }
    setImporting(true); setBackupMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (typeof parsed !== "object" || parsed === null || !("data" in parsed)) throw new Error("ফাইলটি সঠিক backup নয়।");
      replaceWorkspaceData((parsed as { data: unknown }).data);
      await flushWorkspaceChanges();
      setBackupMessage(getCloudSyncState() === "synced" ? "Backup সফলভাবে অনলাইন ওয়ার্কস্পেসে পুনরুদ্ধার হয়েছে।" : getCloudSyncMessage() || "পুনরুদ্ধারের তথ্য এখনো অনলাইনে সংরক্ষিত হয়নি।");
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Backup পড়া যায়নি।");
    } finally { setImporting(false); }
  }

  return (
    <div className="view-stack settings-view">
      <PageIntro title="সেটিংস" onBack={() => navigateSection("home")} />
      <section className="settings-profile-panel">
        <div className="settings-profile-heading"><span className="settings-profile-avatar">{getInitials(displayName)}</span><div><span className="eyebrow">অ্যাকাউন্ট</span><h2>ব্যক্তিগত প্রোফাইল</h2><p>তোমার পরিচিতি ও যোগাযোগের তথ্য</p></div></div>
        <form className="workspace-form settings-profile-form" onSubmit={saveProfile}>
          <label>প্রদর্শিত নাম<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="তোমার নাম" required /></label>
          <label>অ্যাকাউন্ট ইমেইল<input value={userEmail} readOnly aria-readonly="true" /></label>
          <label>মোবাইল নম্বর <small>(ঐচ্ছিক)</small><input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={25} inputMode="tel" placeholder="মোবাইল নম্বর" /></label>
          {profileMessage && <p className="inline-feedback" role="status">{profileMessage}</p>}
          <div className="form-actions"><button type="submit" className="button-primary" disabled={profileBusy}>{profileBusy ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>} প্রোফাইল সংরক্ষণ</button></div>
        </form>
      </section>
      <PrayerSettingsPanel data={data}/>
      <div className="content-grid content-grid-wide-left">
        <Panel eyebrow="মুহাসাবার দিন" title="তারিখ ও মাগরিব"><form className="workspace-form" onSubmit={savePreferences}><label>সময় অঞ্চল<input value="বাংলাদেশের সময় (Asia/Dhaka)" readOnly aria-readonly="true" /></label><label>মাগরিবের সময় (ঐচ্ছিক সংশোধন)<input type="time" value={maghribTime} onChange={(event) => setMaghribTime(event.target.value)} /></label><p className="field-hint">সময় ফাঁকা রাখলে হানাফি সূচির মাগরিব নেওয়া হবে। মাগরিবে নতুন মুহাসাবার দিন শুরু হবে।</p><div className="form-actions"><button type="submit" className="button-primary">{saved ? <Check size={15}/> : <ArrowDownToLine size={15}/>} {saved ? "সংরক্ষিত" : "তারিখের পছন্দ সংরক্ষণ"}</button></div></form></Panel>
        <Panel eyebrow="দৃশ্যমানতা" title="অ্যাপের থিম"><div className="theme-choice-list"><button type="button" className={`theme-choice ${theme === "light" ? "selected" : ""}`} onClick={() => setTheme("light")}><Sun size={17}/><span><strong>লাইট থিম</strong><small>পরিষ্কার ও উজ্জ্বল</small></span>{theme === "light" && <Check size={16}/>}</button><button type="button" className={`theme-choice ${theme === "dark" ? "selected" : ""}`} onClick={() => setTheme("dark")}><Moon size={17}/><span><strong>ডার্ক থিম</strong><small>কম আলোতে আরামদায়ক</small></span>{theme === "dark" && <Check size={16}/>}</button></div><p className={`field-hint theme-save-${themeSaveState}`} role="status">{themeSaveMessage}</p></Panel>
      </div>
      <Panel eyebrow="অনলাইন সংরক্ষণ" title="ব্যক্তিগত ওয়ার্কস্পেস"><div className="backup-summary"><span className="backup-summary-icon"><ShieldCheck size={20}/></span><div><strong>{getCloudSyncState() === "synced" ? "সব তথ্য অনলাইনে সংরক্ষিত" : getCloudSyncState() === "syncing" ? "অনলাইনে সংরক্ষণ চলছে" : getCloudSyncState() === "offline" ? "ইন্টারনেট সংযোগ নেই" : getCloudSyncState() === "error" ? "অনলাইন সংরক্ষণে সমস্যা" : "অনলাইন সংরক্ষণ প্রস্তুত হচ্ছে"}</strong><p>{data.prayerEntries.length + data.extraPrayerEntries.length}টি সালাত · {data.quranEntries.length}টি কুরআন পাঠ · {data.dhikrSessions.length}টি জিকির · {data.deadlinePlans.length}টি সময়সীমা · {data.journeys.length}টি যাত্রা</p></div><span className={`local-badge cloud-status-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? "অনলাইনে আছে" : getCloudSyncState() === "offline" ? "সংযোগ নেই" : getCloudSyncState() === "error" ? "সমস্যা" : getCloudSyncState() === "syncing" ? "সংরক্ষণ হচ্ছে" : "প্রস্তুতি"}</span></div><div className="backup-actions"><button type="button" className="button-secondary" onClick={exportData}><Download size={15}/> JSON ব্যাকআপ ডাউনলোড</button><label className="button-secondary upload-button"><Upload size={15}/>{importing ? "পড়া হচ্ছে…" : "ব্যাকআপ পুনরুদ্ধার"}<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} disabled={importing}/></label></div>{backupMessage && <p className="inline-feedback" role="status">{backupMessage}</p>}<p className="security-caption"><LockKeyhole size={14}/> রেকর্ড অনলাইনে সংরক্ষিত হয়; ইন্টারনেট না থাকলে নতুন পরিবর্তন সংরক্ষণ হয় না। JSON ব্যাকআপ এনক্রিপ্ট করা নয়—নিরাপদে রাখো।</p></Panel>
      <section className="settings-logout-panel"><div><span className="settings-logout-icon"><LogOut size={18}/></span><div><strong>এই ডিভাইস থেকে লগআউট</strong><p>তোমার অনলাইন রেকর্ড অ্যাকাউন্টে নিরাপদ থাকবে।</p></div></div><button type="button" className="button-secondary settings-logout-button" onClick={onLogout} disabled={loggingOut}>{loggingOut ? <LoaderCircle className="spin" size={15}/> : <LogOut size={15}/>} {loggingOut ? "লগআউট হচ্ছে…" : "লগআউট"}</button></section>
    </div>
  );
}

export function FrontendWorkspace({ userEmail, initialSection = "home" }: { userEmail: string; initialSection?: AppSection }) {
  const data = useLocalData();
  const section = useSection(initialSection);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [liveDay, setLiveDay] = useState("");
  const selected = NAV_ITEMS.find((item) => item.id === section) || NAV_ITEMS[0];
  const displayName = data?.preferences.displayName || userEmail.split("@")[0] || "আমার হিসাব";
  const syncState = getCloudSyncState();
  const lastSyncAt = getLastSuccessfulSyncAt();
  const fullSyncTime = formatLastSyncTime(lastSyncAt);
  const compactSyncTime = formatCompactLastSyncTime(lastSyncAt);
  const syncDesktopLabel = syncState === "syncing" || syncState === "loading"
    ? "সিঙ্ক হচ্ছে…"
    : syncState === "offline" ? `শেষ সিঙ্ক · ${fullSyncTime}`
      : syncState === "error" ? `সিঙ্ক সমস্যা · ${fullSyncTime}`
        : `সর্বশেষ সিঙ্ক · ${fullSyncTime}`;
  const syncMobileLabel = syncState === "syncing" || syncState === "loading" ? "সিঙ্ক" : compactSyncTime;
  const syncTooltip = syncState === "syncing" || syncState === "loading"
    ? "অনলাইন তথ্য সিঙ্ক হচ্ছে"
    : syncState === "error" ? getCloudSyncMessage()
      : syncState === "offline" ? `ইন্টারনেট সংযোগ নেই · শেষ সফল সিঙ্ক: ${fullSyncTime}`
        : `সার্ভার নিশ্চিত করেছে: ${fullSyncTime}`;
  useEffect(() => {
    if (!data) return;
    const update = () => setLiveDay(todayKey(data.preferences.timeZone, data.preferences.maghribTime));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, [data]);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.id !== section) return;
      document.title = `${item.label} · Amar Nfser Hisab`;
    });
  }, [section]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      router.replace("/login");
    }
  }

  if (!data) {
    const loadError = getWorkspaceLoadError();
    return <main className="workspace-loading" role="status" aria-live="polite"><span className="workspace-loading-mark"><Image src="/brand/logo.svg" alt="" width={38} height={38}/></span><strong>{loadError ? "অনলাইন তথ্য খোলা যায়নি" : "তোমার ব্যক্তিগত তথ্য প্রস্তুত করা হচ্ছে"}</strong><span>{loadError || "তোমার ব্যক্তিগত রেকর্ড প্রস্তুত হচ্ছে।"}</span>{loadError ? <button className="button-primary" type="button" onClick={() => window.location.reload()}>আবার চেষ্টা করো</button> : <i/>}</main>;
  }

  return (
    <>
    <PrayerReminderEngine userName={displayName}/>
    <AppToastViewport />
    <div className="workspace-app">
      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="desktop-brand"><BrandMark/></div>
          <div className="mobile-brand"><BrandMark compact/><strong>Amar Nfser Hisab</strong></div>
          <div className="topbar-context"><span className="breadcrumb-root">আমার পরিসর</span><ChevronRight size={14}/><strong>{selected.label}</strong></div>
          <div className="topbar-right">
            <span className={`local-mode-label last-sync-label cloud-status-${syncState}`} title={syncTooltip} aria-label={syncTooltip}>
              <span className="sync-status-dot" aria-hidden="true"/>
              <span className="sync-label-desktop">{syncDesktopLabel}</span>
              <span className="sync-label-mobile">{syncMobileLabel}</span>
            </span>
            <NotificationPopover events={data.reminderEvents}/>
            <button className="topbar-icon-button mobile-settings-shortcut" type="button" onClick={() => navigateSection("settings")} aria-label="সেটিংস"><Settings size={18}/></button>
            <button className="topbar-icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="থিম পরিবর্তন">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <span className="topbar-avatar" title={displayName}>{getInitials(displayName)}</span>
          </div>
        </header>
        <nav className="workspace-desktop-nav" aria-label="প্রধান বিভাগ">{NAV_ITEMS.map((item) => { const Icon = item.icon; const active = section === item.id; return <button key={item.id} type="button" className={`workspace-desktop-tab ${active ? "active" : ""}`} onClick={() => navigateSection(item.id)} aria-current={active ? "page" : undefined}><Icon size={17}/><span>{item.label}</span></button>; })}</nav>
        <div className="workspace-content">
          {section === "home" && <DashboardView key={liveDay} data={data}/>} 
          {section === "goals" && <GoalsView data={data}/>} 
          {section === "journal" && <JournalView data={data}/>} 
          {section === "mirror" && <MirrorView data={data}/>} 
          {section === "settings" && <SettingsView data={data} userEmail={userEmail} onLogout={() => void logout()} loggingOut={loggingOut}/>} 
          <footer className="workspace-footer"><span className="workspace-footer-copy"><span className="footer-copyright-mark">©</span><span>রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।</span></span><span>তাহলে তাদের আর যাওয়ার মতো জায়গা থাকবে না!</span></footer>
        </div>
      </main>
      <nav className="mobile-navigation" aria-label="মোবাইল প্রধান বিভাগ">{NAV_ITEMS.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={section === item.id ? "active" : ""} onClick={() => navigateSection(item.id)}><Icon size={19}/><span>{item.shortLabel}</span></button>; })}<button type="button" className={section === "settings" ? "active" : ""} onClick={() => navigateSection("settings")}><MoreHorizontal size={19}/><span>আরও</span></button></nav>
    </div>
    </>
  );
}
