"use client";

import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronRight, Clock3, Cloud, CloudOff, Compass,
  Download, Heart, LockKeyhole, LogOut, Moon, Trash2,
  MoreHorizontal, Plus, Settings, ShieldCheck, Sparkles, Sun, Target,
  Upload, X, type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import hadithData from "@/data/hadith-bn.json";
import type { HadithDataset, HadithRecord } from "@/types/hadith";
import { formatHijriDate } from "@/lib/date/hijri";
import { useTheme } from "@/providers/theme-provider";
import { TrackerCenter } from "@/modules/trackers/tracker-center";
import { SURAHS } from "@/modules/journal/surahs";
import { PrayerTimeWidget } from "@/modules/trackers/prayer-time-widget";
import { PrayerSettingsPanel, PrayerReminderEngine } from "@/modules/trackers/prayer-settings";
import {
  createLocalId, getCloudSyncMessage, getCloudSyncState, getLocalDataSnapshot, getLocalDataServerSnapshot, getLocalJournalDate, getWorkspaceLoadError,
  hydrateLocalData, replaceLocalData, subscribeLocalData, updateLocalData, flushLocalData,
  type AppSection, type DeadlinePlan, type DeadlineTask, type JourneyMilestone, type JourneyObservation, type PrayerId, type PrayerEntry, type ReminderEvent
} from "@/lib/local/store";
import { getDhakaDateTimeInput, getPrayerCivilDate, getPrayerWaqtWindow, nextDhakaDate, toDhakaIso } from "@/lib/prayer-time";
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
function navigateSection(section: AppSection, tracker?: string, prayer?: PrayerId | "qada") {
  const url = new URL(window.location.href);
  url.pathname = "/dashboard";
  if (section === "home") url.searchParams.delete("section");
  else url.searchParams.set("section", section);
  for (const key of ["tracker", "action", "prayer"]) url.searchParams.delete(key);
  if (section === "journal" && tracker) {
    url.searchParams.set("tracker", tracker);
    url.searchParams.set("action", "new");
    if (prayer) url.searchParams.set("prayer", prayer);
  }
  window.history.pushState({ section, tracker, prayer }, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(SECTION_EVENT));
  window.scrollTo({ top: 0, behavior: "auto" });
}
function useLocalData() {
  const data = useSyncExternalStore(subscribeLocalData, getLocalDataSnapshot, getLocalDataServerSnapshot);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    void hydrateLocalData().finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  return loaded && !getWorkspaceLoadError() ? data : null;
}
function todayKey(timeZone: string, maghribTime: string) {
  return getLocalJournalDate(new Date(), timeZone || "Asia/Dhaka", maghribTime || null);
}
function formatLongDate(value: string, timeZone = "Asia/Dhaka") {
  const date = new Date(`${value}T12:00:00Z`);
  try {
    return new Intl.DateTimeFormat("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(date);
  }
}
function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" }).format(new Date(`${value}T12:00:00Z`));
}
function getInitials(name: string) {
  const clean = name.trim();
  return clean ? clean.slice(0, 1) : "আ";
}
function uid() { return createLocalId(); }

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`} aria-label="Amar Nfser Hisab">
      <span className="brand-mark-icon"><Image src="/brand/logo.svg" alt="" width={31} height={31} /></span>
      {!compact && <span className="brand-mark-copy"><strong>Amar Nfser Hisab</strong><small>ব্যক্তিগত মুহাসাবা</small></span>}
    </div>
  );
}

function PageIntro({ eyebrow, title, description: _description, action, onBack }: { eyebrow: string; title: string; description: string; action?: React.ReactNode; onBack: () => void }) {
  return (
    <div className="page-intro">
      <div className="page-intro-main">
        <button type="button" className="section-back-button" onClick={onBack}><ArrowLeft size={16}/> ড্যাশবোর্ডে ফিরো</button>
        <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>
      </div>
      {action && <div className="page-intro-action">{action}</div>}
    </div>
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
function chooseRandomHadith(exceptId?: string) {
  const available = HADITH_DATA.hadiths.filter((item) => item.id !== exceptId);
  const pool = available.length ? available : HADITH_DATA.hadiths;
  return pool[Math.floor(Math.random() * pool.length)] ?? HADITH_DATA.hadiths[0];
}
function DailyHadithCard() {
  const router = useRouter();
  const [item, setItem] = useState<HadithRecord>(HADITH_DATA.hadiths[0]);
  useEffect(() => { setItem(chooseRandomHadith()); }, []);
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
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(date);
}
function DashboardDateCard({ date }: { date: string }) {
  return <div className="dashboard-date-card"><span lang="en">{formatEnglishGregorianDate(date)}</span><span className="dashboard-date-divider"/><span>{getHijriLabel(date)}</span></div>;
}
function FixedJourneyDashboardCard({ data, date }: { data: ReturnType<typeof getLocalDataSnapshot>; date: string }) {
  const router = useRouter();
  const progress = getFixedJourneyProgress(date);
  const stage = progress.currentStage;
  const nextPlan = [...data.deadlinePlans]
    .filter((plan) => plan.deadline >= date)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const daysToPlan = nextPlan ? Math.max(0, differenceInDateKeys(date, nextPlan.deadline)) : null;
  const module = stage?.module ?? (progress.status === "upcoming" ? 1 : 3);
  const statusTitle = progress.status === "upcoming" ? "যাত্রা শুরুর অপেক্ষা" : progress.status === "completed" ? "যাত্রা সম্পন্ন" : stage?.title || "আত্মশুদ্ধির যাত্রা";
  const dayText = stage ? `${progress.stageDay.toLocaleString("bn-BD")} / ${stage.durationDays.toLocaleString("bn-BD")} দিন` : progress.status === "upcoming" ? "শুরু হবে ২৩ নভেম্বর ২০২৬" : "১,৪৩৮ দিনের যাত্রা সম্পন্ন";
  return <section className={`dashboard-journey-card module-tone-${module}`}>
    <div className="dashboard-journey-main">
      <span className="dashboard-journey-overline">আত্মশুদ্ধির যাত্রা</span>
      <h1>{statusTitle}</h1>
      <div className="dashboard-journey-dates">{formatCompactDate(FIXED_JOURNEY_START_DATE)} – {formatCompactDate(FIXED_JOURNEY_END_DATE)}</div>
      <div className="dashboard-journey-progress"><span style={{ width: `${progress.percent}%` }}/></div>
      <div className="dashboard-journey-progress-meta"><span>সামগ্রিক অগ্রগতি {progress.percent.toLocaleString("bn-BD")}٪</span><span>{progress.remainingDays.toLocaleString("bn-BD")} দিন বাকি</span></div>
    </div>
    <div className="dashboard-journey-side">
      <div className="dashboard-journey-stage-number"><small>বর্তমান পর্যায়</small><strong>{stage ? stage.stageNumber.toLocaleString("bn-BD") : progress.status === "upcoming" ? "—" : "৭১"}</strong><span>{stage ? `পর্যায় ${stage.stageNumber.toLocaleString("bn-BD")}` : progress.status === "completed" ? "শেষ" : "প্রস্তুতি"}</span></div>
      <div className="dashboard-journey-days"><strong>{dayText}</strong><span>{stage ? `${progress.stageRemainingDays.toLocaleString("bn-BD")} দিন পর পরবর্তী পর্যায়` : ""}</span></div>
      <div className="dashboard-journey-next-goal">{nextPlan ? <><small>পরবর্তী লক্ষ্য</small><strong>{nextPlan.title}</strong><span>{daysToPlan === 0 ? "আজ শেষ তারিখ" : `${daysToPlan?.toLocaleString("bn-BD")} দিন বাকি`}</span></> : <><small>পরবর্তী লক্ষ্য</small><strong>এখনো নির্ধারণ করা হয়নি</strong><span>লক্ষ্য যোগ করে পরিকল্পনা সাজাও</span></>}</div>
      <button type="button" className="dashboard-journey-open" onClick={() => router.push("/dashboard?section=goals")}>যাত্রা দেখো <ArrowRight size={15}/></button>
    </div>
  </section>;
}

function DashboardView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const date = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerId | null>(null);
  const prayerEntries = data.prayerEntries.filter((item) => item.date === date && item.method !== "qada");
  const qadaToday = data.prayerEntries.filter((item) => item.date === date && item.method === "qada");
  const completedPrayerIds = new Set(prayerEntries.filter((item) => item.method !== "not-performed" && item.missedRakats === 0 && item.components.some((part) => part.category === "fard" && part.performed && part.performedRakats >= part.plannedRakats)).map((item) => item.prayer));
  const completedPrayerCount = completedPrayerIds.size;
  const recordedPrayerIds = new Set(prayerEntries.map((item) => item.prayer));
  const unrecordedPrayerCount = Math.max(0, 5 - recordedPrayerIds.size);
  const missedPrayerCount = new Set([...prayerEntries.filter((item) => item.method === "not-performed" || item.missedRakats > 0).map((item) => item.prayer), ...data.qadaEntries.filter((item) => item.missedDate === date).map((item) => item.prayer)]).size;
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

    <DailyHadithCard/>
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
        <Panel className="quick-note-panel" eyebrow="দ্রুত নোট" title="আজকের ছোট্ট নোট"><QuickNote date={date} initialValue={note?.body || ""}/></Panel>
      </div>
    </div>

    <Panel eyebrow="একাডেমিক ও ব্যক্তিগত পরিকল্পনা" title="আসন্ন সময়সীমা" action={<button className="text-action" type="button" onClick={() => navigateSection("goals")}>সব পরিকল্পনা <ArrowRight size={15}/></button>}>
      {activeDeadlinePlans.length ? <div className="goal-preview-list">{activeDeadlinePlans.map((plan) => { const done = plan.tasks.filter((task) => task.completed).length; const progress = plan.tasks.length ? Math.round(done / plan.tasks.length * 100) : 0; const left = Math.ceil((new Date(`${plan.deadline}T12:00:00Z`).getTime() - new Date(`${date}T12:00:00Z`).getTime()) / 86400000); return <div className="goal-preview-row" key={plan.id}><div><strong>{plan.title}</strong><small>{left === 0 ? "আজ শেষ তারিখ" : `${left.toLocaleString("bn-BD")} দিন বাকি`} · {formatCompactDate(plan.deadline)}</small></div><span className="goal-progress-label">{progress.toLocaleString("bn-BD")}%</span></div>; })}</div> : <EmptyState icon={Target} title="এখনো কোনো সময়সীমা যোগ করা হয়নি" description="পরীক্ষা বা গুরুত্বপূর্ণ কাজের শেষ তারিখ যোগ করলে এখানে দেখা যাবে।"/>}
    </Panel>
    <div className={`local-data-note cloud-sync-note cloud-sync-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? <Cloud size={15}/> : <CloudOff size={15}/>}<span>{getCloudSyncMessage() || "তোমার পরিবর্তন অনলাইনে সংরক্ষিত হবে।"}</span></div>
  </div>;
}

function QuickNote({ date, initialValue }: { date: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  useEffect(() => setValue(initialValue), [date, initialValue]);
  function save() {
    updateLocalData((current) => {
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
  data: ReturnType<typeof getLocalDataSnapshot>;
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
  const [rewardTitle, setRewardTitle] = useState(milestone?.rewardTitle || "");
  const [rewardAmount, setRewardAmount] = useState(milestone?.rewardAmount == null ? "" : String(milestone.rewardAmount));
  const [rewardNote, setRewardNote] = useState(milestone?.rewardNote || "");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setRewardTitle(milestone?.rewardTitle || "");
    setRewardAmount(milestone?.rewardAmount == null ? "" : String(milestone.rewardAmount));
    setRewardNote(milestone?.rewardNote || "");
  }, [milestone?.id, milestone?.rewardTitle, milestone?.rewardAmount, milestone?.rewardNote]);

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
    updateLocalData((current) => ({
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
    updateLocalData((current) => ({ ...current, journeyObservations: current.journeyObservations.filter((item) => item.id !== id) }));
  }

  function saveReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete || !rewardTitle.trim()) return;
    const amount = rewardAmount.trim() ? Number(rewardAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 100000000)) return;
    const now = new Date().toISOString();
    updateLocalData((current) => {
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
    <div className="stage-detail-heading">
      <button type="button" className="section-back-button" onClick={onBack}><ArrowLeft size={16}/> সব পর্যায়ে ফিরো</button>
      <span className="eyebrow">মডিউল {stage.module.toLocaleString("bn-BD")} · পর্যায় {stage.stageNumber.toLocaleString("bn-BD")}</span>
      <h1>{stage.title}</h1>
      <p>{formatCompactDate(stage.startDate)} – {formatCompactDate(stage.endDate)} · {stage.durationDays.toLocaleString("bn-BD")} দিন</p>
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
        <label className="tracker-field"><span>পুরস্কারের নাম</span><input className="tracker-input" value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} maxLength={120} placeholder="যেমন: পছন্দের একটি বই" required/></label>
        <label className="tracker-field"><span>নির্ধারিত পরিমাণ (ঐচ্ছিক)</span><input className="tracker-input" type="number" min="0" max="100000000" step="1" value={rewardAmount} onChange={(event) => setRewardAmount(event.target.value)} placeholder="ঐচ্ছিক"/></label>
        <label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><textarea className="tracker-input tracker-textarea" rows={2} value={rewardNote} onChange={(event) => setRewardNote(event.target.value)} maxLength={1200}/></label>
        <button type="submit" className="tracker-primary-button" disabled={!rewardTitle.trim()}>পুরস্কার সংরক্ষণ</button>
      </form>
      {milestone?.badgeAwarded && <span className="stage-verified-badge"><CheckCircle2 size={16}/> পর্যায় সম্পন্ন</span>}
    </section>}
  </div>;
}

function GoalsView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const dateNow = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const progress = getFixedJourneyProgress(dateNow);
  const [activeTab, setActiveTab] = useState<"journey" | "goals">("journey");
  const [selectedStageNumber, setSelectedStageNumber] = useState<number | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalStartDate, setGoalStartDate] = useState(dateNow);
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalCategory, setGoalCategory] = useState<DeadlinePlan["category"]>("exam");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalError, setGoalError] = useState("");
  const [taskPlanId, setTaskPlanId] = useState("");
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
    if (missing.length) updateLocalData((current) => ({ ...current, journeyMilestones: [...current.journeyMilestones, ...missing] }));
  }, [completedStages, milestonesSnapshot]);

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
      updateLocalData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id === editingPlanId ? {
        ...plan, title: goalTitle.trim(), startDate: goalStartDate, deadline: goalDeadline, category: goalCategory,
        description: goalDescription.trim(), updatedAt: now
      } : plan) }));
    } else {
      const plan: DeadlinePlan = { id: uid(), title: goalTitle.trim(), startDate: goalStartDate, deadline: goalDeadline,
        category: goalCategory, description: goalDescription.trim(), tasks: [], createdAt: now, updatedAt: now };
      updateLocalData((current) => ({ ...current, deadlinePlans: [...current.deadlinePlans, plan] }));
    }
    cancelGoalForm();
  }

  function addTask(event: FormEvent<HTMLFormElement>, planId: string) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    const now = new Date().toISOString();
    const task: DeadlineTask = { id: uid(), title: taskTitle.trim(), details: taskDetails.trim(), dueDate: taskDueDate,
      completed: false, completedAt: null, createdAt: now };
    updateLocalData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id === planId ? { ...plan, tasks: [...plan.tasks, task], updatedAt: now } : plan) }));
    setTaskTitle(""); setTaskDetails(""); setTaskDueDate(""); setTaskPlanId("");
  }
  function toggleTask(planId: string, taskId: string) {
    const now = new Date().toISOString();
    updateLocalData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id !== planId ? plan : {
      ...plan, updatedAt: now, tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed, completedAt: task.completed ? null : now } : task)
    }) }));
  }
  function removeTask(planId: string, taskId: string) {
    if (!window.confirm("এই কাজটি মুছে ফেলবে?")) return;
    updateLocalData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.map((plan) => plan.id === planId ? { ...plan, tasks: plan.tasks.filter((task) => task.id !== taskId), updatedAt: new Date().toISOString() } : plan) }));
  }
  function removeGoal(planId: string) {
    if (!window.confirm("এই লক্ষ্য ও এর কাজগুলো মুছে ফেলবে?")) return;
    updateLocalData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.filter((plan) => plan.id !== planId) }));
  }

  const sortedPlans = [...data.deadlinePlans].sort((a, b) => (a.startDate || a.createdAt.slice(0, 10)).localeCompare(b.startDate || b.createdAt.slice(0, 10)));
  const completedGoals = sortedPlans.filter((plan) => plan.tasks.length > 0 && plan.tasks.every((task) => task.completed)).length;
  const selectedStage = selectedStageNumber ? FIXED_JOURNEY_STAGES.find((stage) => stage.stageNumber === selectedStageNumber) ?? null : null;
  const categoryLabel = (category: DeadlinePlan["category"]) => ({ exam: "পরীক্ষা", assignment: "অ্যাসাইনমেন্ট", project: "প্রজেক্ট", other: "অন্যান্য" })[category];

  if (selectedStage) return <div className="view-stack"><StageDetailView stage={selectedStage} data={data} currentDate={dateNow} onBack={() => setSelectedStageNumber(null)}/></div>;

  return <div className="view-stack goals-workspace">
    <div className="goals-page-heading">
      <button type="button" className="section-back-button" onClick={() => navigateSection("home")}><ArrowLeft size={16}/> ড্যাশবোর্ডে ফিরো</button>
      <div><span className="eyebrow">নিজের পথ ও পরিকল্পনা</span><h1>লক্ষ্য</h1></div>
    </div>
    <div className="goals-mode-tabs" role="tablist" aria-label="লক্ষ্যের বিভাগ">
      <button type="button" role="tab" aria-selected={activeTab === "journey"} className={activeTab === "journey" ? "selected" : ""} onClick={() => setActiveTab("journey")}><ShieldCheck size={17}/> আত্মশুদ্ধি</button>
      <button type="button" role="tab" aria-selected={activeTab === "goals"} className={activeTab === "goals" ? "selected" : ""} onClick={() => setActiveTab("goals")}><Target size={17}/> লক্ষ্য</button>
    </div>

    {activeTab === "journey" ? <>
      <section className={`journey-current-hero module-tone-${progress.currentStage?.module ?? 1}`}>
        <span className="journey-current-kicker">{progress.status === "completed" ? "সম্পন্ন যাত্রা" : progress.status === "upcoming" ? "শুরুর অপেক্ষা" : `মডিউল ${progress.currentStage?.module.toLocaleString("bn-BD")}`}</span>
        <h2>{progress.currentStage?.title || (progress.status === "completed" ? "নতুন জীবনের অঙ্গীকার" : "আত্মশুদ্ধির যাত্রা")}</h2>
        <p className="journey-current-dates">{formatLongDate(FIXED_JOURNEY_START_DATE)} — {formatLongDate(FIXED_JOURNEY_END_DATE)}</p>
        <div className="journey-current-index"><span>পর্যায় {progress.currentStage?.stageNumber.toLocaleString("bn-BD") || "৭১"}</span><span>{progress.dayNumber.toLocaleString("bn-BD")} / ১,৪৩৮ দিন</span></div>
        <div className="journey-current-track"><span style={{ width: `${progress.percent}%` }}/></div>
        <div className="journey-current-meta"><div><strong>{progress.currentStage ? `${progress.stageDay.toLocaleString("bn-BD")} / ${progress.currentStage.durationDays.toLocaleString("bn-BD")} দিন` : progress.status === "upcoming" ? "শুরু হয়নি" : "৭১টি পর্যায় সম্পন্ন"}</strong><small>এই পর্যায়ের অগ্রগতি {progress.stagePercent.toLocaleString("bn-BD")}٪</small></div><div><strong>{progress.stageRemainingDays.toLocaleString("bn-BD")} দিন</strong><small>পরবর্তী পর্যায়ে বাকি</small></div></div>
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
              const linkedGoal = stageGoal(stage);
              return <button type="button" className={`journey-stage-row stage-${status}`} key={stage.stageNumber} onClick={() => setSelectedStageNumber(stage.stageNumber)}>
                <span className="journey-stage-index">{status === "completed" ? <CheckCircle2 size={18}/> : stage.stageNumber.toLocaleString("bn-BD")}</span>
                <span className="journey-stage-main"><strong>{stage.title}</strong><small>{formatCompactDate(stage.startDate)} – {formatCompactDate(stage.endDate)} · {stage.durationDays.toLocaleString("bn-BD")} দিন</small>{linkedGoal && <em>লক্ষ্য: {linkedGoal.title.length > 22 ? `${linkedGoal.title.slice(0, 22)}…` : linkedGoal.title}</em>}<span className="journey-stage-mini-track"><i style={{ width: `${percent}%` }}/></span></span>
                <span className="journey-stage-trailing"><b>{percent.toLocaleString("bn-BD")}٪</b><small>{status === "completed" ? "সম্পন্ন ব্যাচ" : status === "current" ? `চলমান · ${progress.stageDay.toLocaleString("bn-BD")}/${stage.durationDays.toLocaleString("bn-BD")}` : "পরবর্তী ব্যাচ"}</small></span>
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
          return <article className="deadline-plan-card" key={plan.id}>
            <div className="deadline-plan-heading"><div><span className="deadline-category">{categoryLabel(plan.category)}</span><h3>{plan.title}</h3>{plan.description && <p>{plan.description}</p>}</div><div className="deadline-goal-actions"><button type="button" className="icon-button-soft" aria-label="লক্ষ্য সম্পাদনা" onClick={() => editGoal(plan)}>✎</button><button type="button" className="icon-button-soft" aria-label="লক্ষ্য মুছুন" onClick={() => removeGoal(plan.id)}><X size={16}/></button></div></div>
            <div className="deadline-countdown"><strong>{left < 0 ? `${Math.abs(left).toLocaleString("bn-BD")} দিন পেরিয়েছে` : left === 0 ? "আজ শেষ তারিখ" : `${left.toLocaleString("bn-BD")} দিন বাকি`}</strong><span>{formatCompactDate(start)} – {formatCompactDate(plan.deadline)}</span></div>
            {linked.length > 0 && <div className="goal-linked-stages"><span>সম্পর্কিত পর্যায়</span>{linked.slice(0, 6).map((stage) => {
              const shortTitle = stage.title.length > 12 ? `${stage.title.slice(0, 12)}…` : stage.title;
              return <button type="button" key={stage.stageNumber} title={stage.title} onClick={() => setSelectedStageNumber(stage.stageNumber)}>পর্যায় {stage.stageNumber.toLocaleString("bn-BD")} · {shortTitle}</button>;
            })}{linked.length > 6 && <span className="goal-linked-more">+{(linked.length - 6).toLocaleString("bn-BD")} আরও</span>}</div>}
            <div className="deadline-progress"><span style={{ width: `${percent}%` }}/></div>
            <div className="deadline-progress-label"><span>{done.toLocaleString("bn-BD")} / {plan.tasks.length.toLocaleString("bn-BD")} কাজ সম্পন্ন</span><strong>{percent.toLocaleString("bn-BD")}%</strong></div>
            <div className="deadline-task-list">{plan.tasks.map((task) => <div className={`deadline-task-row ${task.completed ? "is-done" : ""}`} key={task.id}><label><input type="checkbox" checked={task.completed} onChange={() => toggleTask(plan.id, task.id)}/><span><strong>{task.title}</strong>{task.details && <small>{task.details}</small>}{task.dueDate && <small>শেষ তারিখ: {formatCompactDate(task.dueDate)}</small>}</span></label><button type="button" className="tracker-icon-button" aria-label="কাজ মুছুন" onClick={() => removeTask(plan.id, task.id)}><X size={14}/></button></div>)}</div>
            {taskPlanId === plan.id ? <form className="deadline-task-form" onSubmit={(event) => addTask(event, plan.id)}><label className="tracker-field"><span>কাজের নাম</span><input className="tracker-input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="যেমন: প্রথম অধ্যায় শেষ করা" required/></label><label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><input className="tracker-input" value={taskDetails} onChange={(event) => setTaskDetails(event.target.value)} maxLength={600}/></label><label className="tracker-field"><span>কাজের শেষ তারিখ (ঐচ্ছিক)</span><input className="tracker-input" type="date" min={start} max={plan.deadline} value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)}/></label><div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={() => setTaskPlanId("")}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={!taskTitle.trim()}>কাজ যোগ করো</button></div></form> : <button type="button" className="text-action deadline-add-task" onClick={() => { setTaskPlanId(plan.id); setTaskTitle(""); setTaskDetails(""); setTaskDueDate(""); }}><Plus size={15}/> পরিকল্পনায় কাজ যোগ করো</button>}
          </article>;
        })}</div> : <div className="goal-empty-state"><strong>এখনো কোনো লক্ষ্য যোগ করা হয়নি</strong><p>শুরু ও শেষ তারিখ নির্ধারণ করে তোমার পরিকল্পনা সাজাও। একই সময়ে একটি লক্ষ্য রাখা যাবে।</p></div>}
      </section>
    </>}
  </div>;
}

function JournalView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  return <TrackerCenter data={data} onBack={() => navigateSection("home")}/>;
}

function MirrorView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
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
    <PageIntro eyebrow="নিজের রেকর্ডের বিশ্লেষণ" title="নফস আয়না" description="" onBack={() => navigateSection("home")}/>
    <div className="range-control" role="group" aria-label="বিশ্লেষণের সময়সীমা">{[{ value: "7", label: "৭ দিন" }, { value: "30", label: "৩০ দিন" }, { value: "90", label: "৯০ দিন" }].map((item) => <button type="button" key={item.value} onClick={() => setRange(item.value as typeof range)} className={range === item.value ? "active" : ""}>{item.label}</button>)}</div>
    <div className="metric-grid"><MetricCard label="আদায়কৃত রাকাত" value={rakatTotal.toLocaleString("bn-BD")} detail={`শেষ ${range} দিনের সালাত রেকর্ড`} icon={Moon}/><MetricCard label="কুরআনের আয়াত" value={ayahTotal.toLocaleString("bn-BD")} detail={`${quran.length.toLocaleString("bn-BD")}টি পাঠ`} icon={BookOpen} accent="sand"/><MetricCard label="জিকিরের সংখ্যা" value={dhikrTotal.toLocaleString("bn-BD")} detail={`${dhikr.length.toLocaleString("bn-BD")}টি সেশন`} icon={Sparkles} accent="blue"/><MetricCard label="ভালো কাজের রেকর্ড" value={good.length.toLocaleString("bn-BD")} detail={`${avoid.length.toLocaleString("bn-BD")}টি ব্যক্তিগত আত্মসংযম লগ`} icon={Heart} accent="rose"/><MetricCard label="কাজা আদায়" value={qadaPrayers.length.toLocaleString("bn-BD")} detail="নির্বাচিত সময়ে সম্পন্ন কাজার রেকর্ড" icon={Clock3} accent="sand"/></div>
    <div className="content-grid"><Panel eyebrow="দৈনিক কার্যক্রম" title="সাম্প্রতিক সাত দিনের ধারা"><div className="weekly-bars">{days.map((bar) => <div className="weekly-bar-column" key={bar.key}><span className="weekly-bar-value">{bar.count ? bar.count.toLocaleString("bn-BD") : "—"}</span><div className="weekly-bar-track"><span style={{ height: `${Math.max(bar.count ? 8 : 3, bar.count / max * 100)}%` }}/></div><small>{bar.label}</small></div>)}</div><p className="chart-caption">এই চার্টে দৈনিক Tracker Entry-এর সংখ্যা দেখানো হয়েছে; এটি ইবাদতের মান নির্ধারণ করে না।</p></Panel>
      <Panel eyebrow="সালাতের ধরন" title="রাকাতের বিভাগ"><div className="category-breakdown">{[{ id: "fard", label: "ফরজ" }, { id: "sunnah", label: "সুন্নত" }, { id: "wajib", label: "ওয়াজিব" }, { id: "nafl", label: "নফল" }].map((kind) => { const amount = prayers.flatMap((x) => x.components).filter((x) => x.category === kind.id).reduce((n, x) => n + x.performedRakats, 0); return <div className="breakdown-row" key={kind.id}><span className="breakdown-label">{kind.label}</span><span className="breakdown-track"><span style={{ width: `${rakatTotal ? amount / rakatTotal * 100 : 0}%` }}/></span><strong>{amount.toLocaleString("bn-BD")}</strong></div>; })}</div><p className="panel-footnote">রাকাতের হিসাব সেটিংস ও সংরক্ষিত এন্ট্রি থেকে তৈরি।</p></Panel></div>
    <Panel eyebrow="সময়সীমার সারাংশ" title="অন্যান্য ট্র্যাকার"><div className="tracker-stat-grid"><div><strong>{fasting.filter((x) => x.status === "completed").length.toLocaleString("bn-BD")}</strong><small>সম্পন্ন সিয়াম</small></div><div><strong>{good.length.toLocaleString("bn-BD")}</strong><small>ভালো কাজ</small></div><div><strong>{avoid.length.toLocaleString("bn-BD")}</strong><small>ব্যক্তিগত আত্মসংযম লগ</small></div><div><strong>{data.studyEntries.filter((x) => within(x.date)).length.toLocaleString("bn-BD")}</strong><small>অধ্যয়ন সেশন</small></div><div><strong>{data.habitLogs.filter((x) => within(x.date) && x.completed).length.toLocaleString("bn-BD")}</strong><small>সম্পন্ন অভ্যাস</small></div><div><strong>{data.reflections.filter((x) => within(x.date)).length.toLocaleString("bn-BD")}</strong><small>মুহাসাবা জার্নাল</small></div></div></Panel>
    <div className="local-data-note"><Cloud size={15}/>তোমার সংরক্ষিত তথ্য থেকে এই বিশ্লেষণ তৈরি হয়েছে।</div>
  </div>;
}

function WaqtPrayerEntryForm({ data, event, onCancel, onSaved }: { data: ReturnType<typeof getLocalDataSnapshot>; event: ReminderEvent; onCancel: () => void; onSaved: () => void }) {
  const prayerId = event.prayer;
  const configuredFard = prayerId ? data.prayerConfig[prayerId].find((part) => part.category === "fard") : undefined;
  const fard = configuredFard;
  const now = getDhakaDateTimeInput();
  const prayerCivilDate = prayerId ? getPrayerCivilDate(event.date, prayerId) : event.date;
  const [performedDate, setPerformedDate] = useState(now.date);
  const [performedTime, setPerformedTime] = useState(now.time);
  const [method, setMethod] = useState<"jamaat" | "home">("jamaat");
  const [takbir, setTakbir] = useState<PrayerEntry["takbirStatus"]>("with-takbir");
  const [caught, setCaught] = useState(String(fard?.rakats || 4));
  const [completedAfter, setCompletedAfter] = useState("0");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  if (!prayerId || !fard) return <p className="inline-feedback" role="alert">এই ওয়াক্তের ফরজ রাকাতের Configuration পাওয়া যায়নি। Settings পরীক্ষা করো।</p>;

  function save(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    // Re-narrow values inside the callback: TypeScript does not retain the
    // outer render-branch narrowing reliably across this event handler.
    const currentPrayer = event.prayer;
    if (!currentPrayer) { setError("এই রেকর্ডের ওয়াক্ত শনাক্ত করা যায়নি। আবার খুলে চেষ্টা করো।"); return; }
    const currentFard = data.prayerConfig[currentPrayer]?.find((part) => part.category === "fard");
    if (!currentFard) { setError("এই ওয়াক্তের ফরজ রাকাতের Configuration পাওয়া যায়নি। Settings পরীক্ষা করো।"); return; }
    const performedAt = toDhakaIso(performedDate, performedTime);
    if (!performedAt) { setError("তারিখ ও সময় সঠিকভাবে নির্বাচন করো।"); return; }
    const times = data.prayerTimesCache.find((item) => item.date === prayerCivilDate);
    const tomorrow = data.prayerTimesCache.find((item) => item.date === nextDhakaDate(prayerCivilDate));
    const window = getPrayerWaqtWindow(times, tomorrow, currentPrayer);
    if (!window) { setError("এই দিনের ওয়াক্তের সময়সূচি পাওয়া যাচ্ছে না। সময়সূচি হালনাগাদ করে আবার চেষ্টা করো।"); return; }
    const actual = new Date(performedAt).getTime();
    const start = new Date(toDhakaIso(prayerCivilDate, window.start) || "").getTime();
    const endDate = currentPrayer === "isha" ? nextDhakaDate(prayerCivilDate) : prayerCivilDate;
    const end = new Date(toDhakaIso(endDate, window.end) || "").getTime();
    const isQada = performedDate !== prayerCivilDate || actual >= end;
    if (performedDate < prayerCivilDate) { setError("আদায়ের তারিখটি মূল ওয়াক্তের তারিখের আগে হতে পারে না।"); return; }
    if (performedDate === prayerCivilDate && actual < start) { setError("নির্বাচিত সময়টি এই ওয়াক্ত শুরু হওয়ার আগের। সময়টি আবার যাচাই করো।"); return; }
    if (isQada && reason.trim().length < 2) { setError("ওয়াক্তের পরে আদায় হয়ে থাকলে কারণটি সংক্ষেপে লিখো।"); return; }
    const received = Number(caught);
    const completedLater = method === "jamaat" && takbir === "late-join" ? Math.max(0, Math.min(currentFard.rakats - received, Number(completedAfter) || 0)) : 0;
    const outstanding = Math.max(0, currentFard.rakats - received - completedLater);
    if (!isQada && method === "jamaat" && takbir === "late-join" && (!Number.isInteger(received) || received < 1 || received >= currentFard.rakats || reason.trim().length < 2 || (outstanding > 0 && reason.trim().length < 2))) {
      setError("ইমামের সঙ্গে পাওয়া রাকাত এবং দেরির কারণ পূরণ করো।"); return;
    }
    const existingObligation = data.qadaEntries.some((item) => item.prayer === currentPrayer && item.missedDate === event.date && item.status === "settled");
    const existingPartial = data.prayerEntries.find((item) => item.date === event.date && item.prayer === currentPrayer && item.method !== "qada");
    const existingFardDone = existingPartial?.components.find((part) => part.category === "fard")?.performedRakats || 0;
    const duplicateOnWaqtDate = !isQada && !!existingPartial && existingPartial.missedRakats === 0 && existingPartial.components.some((part) => part.category === "fard" && part.performed && part.performedRakats >= part.plannedRakats);
    if (existingObligation || duplicateOnWaqtDate) { setError("এই ওয়াক্তের রেকর্ড ইতিমধ্যে সম্পন্ন হয়েছে। ইতিহাস থেকে যাচাই করো।"); return; }
    const pendingSnapshot = data.qadaEntries.find((item) => item.prayer === currentPrayer && item.missedDate === event.date && item.status === "pending");
    const qadaRakats = pendingSnapshot?.rakats || Math.max(1, currentFard.rakats - existingFardDone);
    const qadaId = isQada ? pendingSnapshot?.id || createLocalId() : undefined;
    const entryId = createLocalId();
    const entry: PrayerEntry = {
      id: entryId,
      date: isQada ? getLocalJournalDate(new Date(performedAt), data.preferences.timeZone, data.preferences.maghribTime || null) : event.date,
      prayer: currentPrayer,
      method: isQada ? "qada" : method,
      ...(qadaId ? { qadaId } : {}),
      components: [{ partId: currentFard.id, label: isQada ? `${currentFard.label} · কাজা` : currentFard.label, category: "fard", plannedRakats: isQada ? qadaRakats : currentFard.rakats, performed: true, performedRakats: isQada ? qadaRakats : Math.min(currentFard.rakats, received + completedLater), reason: "" }],
      takbirStatus: isQada || method !== "jamaat" ? "not-applicable" : takbir,
      caughtRakats: isQada ? qadaRakats : !isQada && method === "jamaat" && takbir === "late-join" ? received : currentFard.rakats,
      completedAfterRakats: isQada ? 0 : completedLater,
      missedRakats: !isQada && method === "jamaat" && takbir === "late-join" ? outstanding : 0,
      lateReason: !isQada && takbir === "late-join" ? reason.trim() : "",
      missedReason: isQada ? reason.trim() : "",
      performedAt,
      note: [note.trim(), isQada ? `ওয়াক্তের পরে আদায় · মূল পদ্ধতি: ${method === "jamaat" ? "জামাতে" : "বাসায় / একাকী"}` : ""].filter(Boolean).join(" · "),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    updateLocalData((current) => {
      const duplicate = isQada
        ? current.prayerEntries.some((item) => item.method === "qada" && item.qadaId === qadaId)
        : current.prayerEntries.some((item) => item.date === entry.date && item.prayer === entry.prayer && item.method !== "qada" && item.missedRakats === 0);
      const prayerEntries = duplicate ? current.prayerEntries : isQada
        ? [entry, ...current.prayerEntries]
        : [entry, ...current.prayerEntries.filter((item) => !(item.date === entry.date && item.prayer === entry.prayer && item.method !== "qada"))];
      const pendingObligation = current.qadaEntries.find((item) => item.id === qadaId && item.status === "pending");
      let qadaEntries = !isQada ? current.qadaEntries.filter((item) => !(item.prayer === currentPrayer && item.missedDate === event.date && item.status === "pending")) : current.qadaEntries;
      if (isQada && pendingObligation) {
        qadaEntries = current.qadaEntries.map((item) => item.id === pendingObligation.id
          ? { ...item, sourceEntryId: entryId, reason: reason.trim(), status: "settled" as const, settledAt: performedAt, settlementNote: note.trim() }
          : item);
      } else if (isQada && !current.qadaEntries.some((item) => item.prayer === currentPrayer && item.missedDate === event.date && item.status === "settled")) {
        qadaEntries = [{ id: qadaId || createLocalId(), prayer: currentPrayer, missedDate: event.date, sourceEntryId: entryId, rakats: qadaRakats, reason: reason.trim(), status: "settled" as const, settledAt: performedAt, settlementNote: note.trim(), createdAt: new Date().toISOString() }, ...current.qadaEntries];
      }
      return { ...current, prayerEntries, qadaEntries, reminderEvents: current.reminderEvents.map((item) => item.id === event.id ? { ...item, resolved: true, response: "prayed" as const } : item) };
    });
    onSaved();
  }

  return <form className="waqt-answer-form" onSubmit={save}>
    <strong>আদায়ের তথ্য নিশ্চিত করো</strong>
    <div className="tracker-form-grid">
      <label className="tracker-field"><span>আদায়ের তারিখ</span><input className="tracker-input" type="date" value={performedDate} onChange={(e) => setPerformedDate(e.target.value)} required/></label>
      <label className="tracker-field"><span>আদায়ের সময় (স্থানীয় সময়)</span><input className="tracker-input" type="time" value={performedTime} onChange={(e) => setPerformedTime(e.target.value)} required/></label>
    </div>
    <label className="tracker-field"><span>কীভাবে আদায় করেছ?</span><select className="tracker-input" value={method} onChange={(e) => setMethod(e.target.value as "jamaat" | "home")}><option value="jamaat">জামাতে</option><option value="home">বাসায় / একাকী</option></select></label>
    {method === "jamaat" && <label className="tracker-field"><span>জামাতে কী অবস্থায় পেয়েছ?</span><select className="tracker-input" value={takbir} onChange={(e) => setTakbir(e.target.value as PrayerEntry["takbirStatus"])}><option value="with-takbir">তাকবিরে উলা পেয়েছি</option><option value="without-takbir">তাকবিরে উলা পাইনি, সব রাকাত পেয়েছি</option><option value="late-join">দেরিতে যোগ দিয়েছি</option></select></label>}
    {method === "jamaat" && takbir === "late-join" && <div className="tracker-form-grid"><label className="tracker-field"><span>ইমামের সঙ্গে কত রাকাত পেয়েছ?</span><select className="tracker-input" value={caught} onChange={(e) => { setCaught(e.target.value); setCompletedAfter("0"); }}>{Array.from({ length: Math.max(1, fard.rakats - 1) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n.toLocaleString("bn-BD")} রাকাত</option>)}</select></label><label className="tracker-field"><span>পরে কত রাকাত পূরণ করেছ?</span><select className="tracker-input" value={completedAfter} onChange={(e) => setCompletedAfter(e.target.value)}>{Array.from({ length: Math.max(0, fard.rakats - Number(caught)) + 1 }, (_, i) => i).map((n) => <option key={n} value={n}>{n.toLocaleString("bn-BD")} রাকাত</option>)}</select></label></div>}
    <label className="tracker-field"><span>কারণ / ব্যাখ্যা (ওয়াক্তের পরে আদায় হলে প্রয়োজনীয়)</span><textarea className="tracker-input tracker-textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="দেরি বা অন্য কোনো কারণ থাকলে লিখো"/></label>
    <label className="tracker-field"><span>অতিরিক্ত নোট (ঐচ্ছিক)</span><textarea className="tracker-input tracker-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)}/></label>
    {error && <p className="inline-feedback" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={onCancel}>বাতিল</button><button type="submit" className="tracker-primary-button">আদায়ের রেকর্ড সংরক্ষণ</button></div>
    <small className="field-hint">ওয়াক্তের পরে আদায় হলে কাজা হিসেবে আলাদা হিসাব হবে।</small>
  </form>;
}

function WaqtNotPerformedForm({ data, event, onCancel, onSaved }: { data: ReturnType<typeof getLocalDataSnapshot>; event: ReminderEvent; onCancel: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const prayerId = event.prayer;
  const fard = prayerId ? data.prayerConfig[prayerId].find((part) => part.category === "fard") : undefined;
  function save(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!prayerId || !fard) { setError("সালাতের Configuration পাওয়া যায়নি।"); return; }
    if (reason.trim().length < 2) { setError("কেন আদায় হয়নি, সংক্ষেপে লিখো।"); return; }
    updateLocalData((current) => {
      const exists = current.qadaEntries.some((item) => item.prayer === prayerId && item.missedDate === event.date && item.status === "pending");
      const previousEntry = current.prayerEntries.find((item) => item.date === event.date && item.prayer === prayerId && item.method !== "qada");
      const alreadyCompleted = previousEntry?.components.find((part) => part.category === "fard")?.performedRakats || 0;
      const remainingRakats = Math.max(1, fard.rakats - alreadyCompleted);
      const entryId = previousEntry?.id || createLocalId();
      const now = new Date().toISOString();
      const updatedPrayerEntries = previousEntry
        ? current.prayerEntries.map((item) => item.id !== previousEntry.id ? item : { ...item, missedRakats: remainingRakats, missedReason: reason.trim(), updatedAt: now })
        : [{ id: entryId, date: event.date, prayer: prayerId, method: "not-performed" as const, components: [{ partId: fard.id, label: fard.label, category: "fard" as const, plannedRakats: fard.rakats, performed: false, performedRakats: 0, reason: reason.trim() }], takbirStatus: "not-applicable" as const, caughtRakats: 0, completedAfterRakats: 0, missedRakats: remainingRakats, lateReason: "", missedReason: reason.trim(), performedAt: "", note: "", createdAt: now, updatedAt: now }, ...current.prayerEntries];
      return {
        ...current,
        prayerEntries: updatedPrayerEntries,
        qadaEntries: exists ? current.qadaEntries : [{ id: createLocalId(), prayer: prayerId, missedDate: event.date, sourceEntryId: entryId, rakats: remainingRakats, reason: reason.trim(), status: "pending", settledAt: null, settlementNote: "", createdAt: now }, ...current.qadaEntries],
        reminderEvents: current.reminderEvents.map((item) => item.id === event.id ? { ...item, resolved: true, response: "not-prayed" as const } : item)
      };
    });
    onSaved();
  }
  return <form className="waqt-answer-form" onSubmit={save}>
    <strong>কাজার রেকর্ড নিশ্চিত করো</strong>
    <p>এই ওয়াক্তের ফরজ সালাত আদায় হয়নি বলে নিশ্চিত করলে বাকি কাজার তালিকায় যোগ হবে।</p>
    <label className="tracker-field"><span>কেন আদায় হয়নি?</span><textarea className="tracker-input tracker-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={2} placeholder="নিজের জন্য সংক্ষেপে কারণ লিখে রাখো"/></label>
    {error && <p className="inline-feedback" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={onCancel}>বাতিল</button><button type="submit" className="tracker-primary-button">কাজার রেকর্ড তৈরি</button></div>
  </form>;
}

function NotificationPopover({ events, data }: { events: ReminderEvent[]; data: ReturnType<typeof getLocalDataSnapshot> }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<{ id: string; choice: "prayed" | "not-prayed" } | null>(null);
  const ordered = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = ordered.filter((item) => !item.readAt).length;
  function markRead(id: string) {
    updateLocalData((current) => ({ ...current, reminderEvents: current.reminderEvents.map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item) }));
  }
  function markAllRead() {
    const now = new Date().toISOString();
    updateLocalData((current) => ({ ...current, reminderEvents: current.reminderEvents.map((item) => ({ ...item, readAt: item.readAt || now })) }));
  }
  function removeOne(id: string) {
    updateLocalData((current) => ({ ...current, reminderEvents: current.reminderEvents.filter((item) => item.id !== id) }));
    if (expandedId === id) setExpandedId(null);
  }
  function removeAll() {
    if (!ordered.length || !window.confirm("সব নোটিফিকেশন মুছে ফেলবে?")) return;
    updateLocalData((current) => ({ ...current, reminderEvents: [] }));
    setExpandedId(null);
  }
  return <div className="notification-popover-wrap">
    <button className="topbar-icon-button notification-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-label="নোটিফিকেশন" aria-expanded={open}>
      <Bell size={18}/>{unread > 0 && <i/>}
    </button>
    {open && <section className="notification-popover" role="dialog" aria-label="নোটিফিকেশন তালিকা">
      <header className="notification-popover-header"><div><strong>নোটিফিকেশন</strong><small>{unread.toLocaleString("bn-BD")}টি নতুন</small></div><button type="button" className="icon-button-soft" aria-label="বন্ধ করো" onClick={() => setOpen(false)}><X size={16}/></button></header>
      <div className="notification-popover-actions"><button type="button" onClick={markAllRead} disabled={!unread}>সব পড়া হয়েছে</button><button type="button" onClick={removeAll} disabled={!ordered.length}>সব মুছো</button></div>
      <div className="notification-popover-list">
        {ordered.length ? ordered.map((item) => <article className={`notification-popover-item ${item.readAt ? "read" : "unread"}`} key={item.id}>
          <button type="button" className="notification-item-main" onClick={() => { setExpandedId((current) => current === item.id ? null : item.id); markRead(item.id); }}>
            <span className="notification-item-title">{item.title}</span>
            <span className="notification-item-summary">{item.message}</span>
            <small>{formatCompactDate(item.date)} · {new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(item.createdAt))}</small>
          </button>
          <button type="button" className="notification-delete-button" aria-label="নোটিফিকেশন মুছুন" onClick={() => removeOne(item.id)}><Trash2 size={14}/></button>
          {expandedId === item.id && <div className="notification-item-detail">
            {item.message}
            {item.kind === "waqt-ended" && item.prayer && !item.resolved && <div className="waqt-confirmation-panel">
              <p>তুমি কি সালাত আদায় করেছ কি না—নিশ্চিত করো।</p>
              {!answerMode || answerMode.id !== item.id ? <div className="waqt-confirmation-actions">
                <button type="button" className="tracker-primary-button" onClick={() => setAnswerMode({ id: item.id, choice: "prayed" })}>হ্যাঁ, আদায় করেছি</button>
                <button type="button" className="tracker-secondary-button" onClick={() => setAnswerMode({ id: item.id, choice: "not-prayed" })}>না, আদায় করিনি</button>
              </div> : answerMode.choice === "prayed" ? <WaqtPrayerEntryForm data={data} event={item} onCancel={() => setAnswerMode(null)} onSaved={() => setAnswerMode(null)}/> : <WaqtNotPerformedForm data={data} event={item} onCancel={() => setAnswerMode(null)} onSaved={() => setAnswerMode(null)}/>}
            </div>}
            {item.resolved && item.response && <small>প্রতিক্রিয়া: {item.response === "prayed" ? "আদায় করেছি" : "আদায় করিনি"}</small>}
          </div>}
        </article>) : <div className="notification-empty">এখনো কোনো নোটিফিকেশন নেই।</div>}
      </div>
    </section>}
  </div>;
}

function SettingsView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const { theme, setTheme, themeSaveState, themeSaveMessage } = useTheme();
  const [displayName, setDisplayName] = useState(data.preferences.displayName);
  const [maghribTime, setMaghribTime] = useState(data.preferences.maghribTime);
  const [saved, setSaved] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDisplayName(data.preferences.displayName);
      setMaghribTime(data.preferences.maghribTime);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.preferences.displayName, data.preferences.maghribTime]);
  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateLocalData((current) => ({ ...current, preferences: { ...current.preferences, displayName: displayName.trim().slice(0, 80), timeZone: "Asia/Dhaka", maghribTime } }));
    await flushLocalData();
    if (getCloudSyncState() === "synced") {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } else {
      setBackupMessage(getCloudSyncMessage() || "অনলাইন সংরক্ষণ সম্পন্ন হয়নি। সংযোগ যাচাই করো।");
    }
  }
  async function exportData() {
    await flushLocalData();
    if (getCloudSyncState() !== "synced") {
      setBackupMessage(getCloudSyncMessage() || "ব্যাকআপের আগে অনলাইন সংরক্ষণ সম্পন্ন করো।");
      return;
    }
    const payload = { app: "Amar Nfser Hisab", schemaVersion: 3, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `amar-nfser-hisab-backup-${todayKey(data.preferences.timeZone, data.preferences.maghribTime)}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    setBackupMessage("JSON ব্যাকআপ ফাইল তৈরি হয়েছে। এটি এনক্রিপ্ট করা নয়—নিরাপদ স্থানে রাখবে।");
  }
  async function importData(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setBackupMessage("Backup ফাইল ১০ MB সীমা অতিক্রম করেছে।"); return; }
    setImporting(true); setBackupMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (typeof parsed !== "object" || parsed === null || !("data" in parsed)) throw new Error("ফাইলটি সঠিক backup নয়।");
      replaceLocalData((parsed as { data: unknown }).data);
      await flushLocalData();
      setBackupMessage(getCloudSyncState() === "synced" ? "Backup সফলভাবে অনলাইন ওয়ার্কস্পেসে পুনরুদ্ধার হয়েছে।" : getCloudSyncMessage() || "পুনরুদ্ধারের তথ্য এখনো অনলাইনে সংরক্ষিত হয়নি।");
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Backup পড়া যায়নি।");
    } finally { setImporting(false); }
  }
  return (
    <div className="view-stack">
      <PageIntro eyebrow="ব্যক্তিগত পছন্দ" title="সেটিংস" description="" onBack={() => navigateSection("home")} />
      <PrayerSettingsPanel data={data}/>
      <div className="content-grid content-grid-wide-left">
        <Panel eyebrow="ব্যক্তিগত পছন্দ" title="ব্যক্তিগত তথ্য"><form className="workspace-form" onSubmit={savePreferences}><label>প্রদর্শিত নাম<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="তোমার নাম" /></label><label>সময় অঞ্চল<input value="বাংলাদেশের সময় (Asia/Dhaka)" readOnly aria-readonly="true" /></label><label>মাগরিবের সময় (ঐচ্ছিক সংশোধন)<input type="time" value={maghribTime} onChange={(event) => setMaghribTime(event.target.value)} /></label><p className="field-hint">সময় অঞ্চল বাংলাদেশে স্থির। সময় ফাঁকা রাখলে হানাফি সূচির মাগরিব নেওয়া হবে; চাইলে নিজে সংশোধন করো। মাগরিবে নতুন দিন শুরু হবে।</p><div className="form-actions"><button type="submit" className="button-primary">{saved ? <Check size={15}/> : <ArrowDownToLine size={15}/>} {saved ? "সংরক্ষিত" : "পছন্দ সংরক্ষণ"}</button></div></form></Panel>
        <Panel eyebrow="দৃশ্যমানতা" title="থিম"><div className="theme-choice-list"><button type="button" className={`theme-choice ${theme === "light" ? "selected" : ""}`} onClick={() => setTheme("light")}><Sun size={17}/><span><strong>সাদা থিম</strong><small>পরিষ্কার উজ্জ্বল ক্যানভাস</small></span>{theme === "light" && <Check size={16}/>}</button><button type="button" className={`theme-choice ${theme === "dark" ? "selected" : ""}`} onClick={() => setTheme("dark")}><Moon size={17}/><span><strong>অন্ধকার থিম</strong><small>কম আলোতে আরামদায়ক</small></span>{theme === "dark" && <Check size={16}/>}</button></div><p className={`field-hint theme-save-${themeSaveState}`} role="status">{themeSaveMessage}</p></Panel>
      </div>
      <Panel eyebrow="অনলাইন সংরক্ষণ" title="ব্যক্তিগত অনলাইন ওয়ার্কস্পেস"><div className="backup-summary"><span className="backup-summary-icon"><ShieldCheck size={20}/></span><div><strong>{getCloudSyncState() === "synced" ? "সব তথ্য অনলাইনে সংরক্ষিত" : getCloudSyncState() === "syncing" ? "অনলাইনে সংরক্ষণ চলছে" : getCloudSyncState() === "offline" ? "ইন্টারনেট সংযোগ নেই" : getCloudSyncState() === "error" ? "অনলাইন সংরক্ষণে সমস্যা" : "অনলাইন সংরক্ষণ প্রস্তুত হচ্ছে"}</strong><p>{data.prayerEntries.length + data.extraPrayerEntries.length}টি সালাত · {data.quranEntries.length}টি কুরআন পাঠ · {data.dhikrSessions.length}টি জিকির · {data.deadlinePlans.length}টি সময়সীমা · {data.journeys.length}টি যাত্রা</p></div><span className={`local-badge cloud-status-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? "অনলাইনে আছে" : getCloudSyncState() === "offline" ? "সংযোগ নেই" : getCloudSyncState() === "error" ? "সমস্যা" : getCloudSyncState() === "syncing" ? "সংরক্ষণ হচ্ছে" : "প্রস্তুতি"}</span></div><div className="backup-actions"><button type="button" className="button-secondary" onClick={exportData}><Download size={15}/> JSON ব্যাকআপ ডাউনলোড</button><label className="button-secondary upload-button"><Upload size={15}/>{importing ? "পড়া হচ্ছে…" : "ব্যাকআপ পুনরুদ্ধার"}<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} disabled={importing}/></label></div>{backupMessage && <p className="inline-feedback" role="status">{backupMessage}</p>}<p className="security-caption"><LockKeyhole size={14}/> রেকর্ড অনলাইনে সংরক্ষিত হয়; ইন্টারনেট না থাকলে নতুন পরিবর্তন সংরক্ষণ হয় না। JSON ব্যাকআপ এনক্রিপ্ট করা নয়—নিরাপদে রাখো।</p></Panel>
      <div className={`local-data-note cloud-sync-note cloud-sync-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? <Cloud size={15}/> : <CloudOff size={15}/>} {getCloudSyncMessage() || "তোমার পরিবর্তন অনলাইনে সংরক্ষিত হয়।"}</div>
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
  useEffect(() => {
    if (!data) return;
    const update = () => setLiveDay(todayKey(data.preferences.timeZone, data.preferences.maghribTime));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, [data]);
  const day = data ? liveDay || todayKey(data.preferences.timeZone, data.preferences.maghribTime) : "";

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
    <div className="workspace-app">
      <aside className="workspace-sidebar">
        <div className="sidebar-brand"><BrandMark /></div>
        <div className="sidebar-caption">প্রধান বিভাগ</div>
        <nav className="sidebar-nav" aria-label="প্রধান বিভাগ">{NAV_ITEMS.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={`sidebar-link ${section === item.id ? "active" : ""}`} onClick={() => navigateSection(item.id)} aria-current={section === item.id ? "page" : undefined}><Icon size={18}/><span>{item.label}</span>{section === item.id && <ChevronRight className="sidebar-chevron" size={15}/>}</button>; })}</nav>
        <div className="sidebar-caption sidebar-caption-spaced">অন্যান্য</div>
        {NAV_ITEMS.slice(4).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={`sidebar-link ${section === item.id ? "active" : ""}`} onClick={() => navigateSection(item.id)}><Icon size={18}/><span>{item.label}</span>{section === item.id && <ChevronRight className="sidebar-chevron" size={15}/>}</button>; })}
        <div className="sidebar-bottom"><div className="sidebar-private"><span><ShieldCheck size={16}/></span><div><strong>ব্যক্তিগত ও সুরক্ষিত</strong><small>শুধু তোমার অ্যাকাউন্ট</small></div></div><div className="sidebar-user"><span className="user-avatar">{getInitials(displayName)}</span><div className="sidebar-user-copy"><strong>{displayName}</strong><small>{userEmail}</small></div><button type="button" className="icon-button-soft" onClick={() => void logout()} disabled={loggingOut} aria-label="লগআউট"><LogOut size={16}/></button></div></div>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar"><div className="mobile-brand"><BrandMark compact/><strong>Amar Nfser Hisab</strong></div><div className="topbar-context"><span className="breadcrumb-root">আমার পরিসর</span><ChevronRight size={14}/><strong>{selected.label}</strong></div><div className="topbar-right"><span className={`local-mode-label cloud-status-${getCloudSyncState()}`}><span/>{getCloudSyncState() === "synced" ? "অনলাইনে সংরক্ষিত" : getCloudSyncState() === "syncing" || getCloudSyncState() === "loading" ? "অনলাইনে সংরক্ষণ হচ্ছে" : getCloudSyncState() === "offline" ? "অফলাইন · সংরক্ষিত নয়" : getCloudSyncState() === "error" ? "অনলাইন সংরক্ষণে সমস্যা" : "অনলাইন সংরক্ষণ প্রস্তুত"}</span><NotificationPopover events={data.reminderEvents} data={data}/><button className="topbar-icon-button mobile-settings-shortcut" type="button" onClick={() => navigateSection("settings")} aria-label="নোটিফিকেশন ও অ্যাপ সেটিংস"><Settings size={18}/></button><button className="topbar-icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="থিম পরিবর্তন">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><span className="topbar-avatar" title={displayName}>{getInitials(displayName)}</span></div></header>
        <div className="workspace-content">
          {section !== "home" && <div className="workspace-section-back"><button type="button" className="section-back-button" onClick={() => navigateSection("home")}><ArrowLeft size={16}/> ড্যাশবোর্ডে ফিরো</button></div>}
          {section === "home" && <DashboardView data={data}/>} 
          {section === "goals" && <GoalsView data={data}/>} 
          {section === "journal" && <JournalView data={data}/>} 
          {section === "mirror" && <MirrorView data={data}/>} 
          {section === "settings" && <SettingsView data={data}/>} 
          <footer className="workspace-footer"><span>রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।</span><span>তাহলে তাদের আর যাওয়ার মতো জায়গা থাকবে না!</span></footer>
        </div>
      </main>
      <nav className="mobile-navigation" aria-label="মোবাইল প্রধান বিভাগ">{NAV_ITEMS.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={section === item.id ? "active" : ""} onClick={() => navigateSection(item.id)}><Icon size={19}/><span>{item.shortLabel}</span></button>; })}<button type="button" className={section === "settings" ? "active" : ""} onClick={() => navigateSection("settings")}><MoreHorizontal size={19}/><span>আরও</span></button></nav>
    </div>
    </>
  );
}
