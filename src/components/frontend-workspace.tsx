"use client";

import {
  Activity, ArrowDownToLine, ArrowRight, Bell, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronRight, Clock3, Cloud, CloudOff, Compass,
  Download, Heart, LockKeyhole, LogOut, Moon,
  MoreHorizontal, Plus, RefreshCw, Settings, ShieldCheck, Sparkles, Sun, Target,
  Upload, X, type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import hadithData from "@/data/hadith-bn.json";
import { useTheme } from "@/providers/theme-provider";
import { TrackerCenter } from "@/modules/trackers/tracker-center";
import { SURAHS } from "@/modules/journal/surahs";
import { PrayerTimeWidget } from "@/modules/trackers/prayer-time-widget";
import { PrayerSettingsPanel, PrayerReminderEngine } from "@/modules/trackers/prayer-settings";
import {
  createLocalId, getCloudSyncMessage, getCloudSyncState, getLocalDataServerSnapshot, getLocalDataSnapshot, getLocalJournalDate, getWorkspaceLoadError,
  hydrateLocalData, replaceLocalData, subscribeLocalData, updateLocalData, flushLocalData, syncCloudNow,
  type AppSection, type DeadlinePlan, type DeadlineTask, type PrayerId, type PrayerEntry, type ReminderEvent
} from "@/lib/local/store";
import { getDhakaDateTimeInput, getPrayerCivilDate, getPrayerWaqtWindow, nextDhakaDate, toDhakaIso } from "@/lib/prayer-time";
import { addDaysToDateKey, getCompletedJourneyStages, getJourneyStage, getJourneyStageTitle, getStageCompletionOffset } from "@/lib/journey/stages";

const NAV_ITEMS: { id: AppSection; label: string; shortLabel: string; description: string; icon: LucideIcon }[] = [
  { id: "home", label: "জীবন গুছানো", shortLabel: "আজ", description: "আজকের অবস্থা ও সংক্ষিপ্ত পর্যালোচনা", icon: Compass },
  { id: "goals", label: "লক্ষ্য ও সময়সীমা", shortLabel: "লক্ষ্য", description: "লক্ষ্য, অগ্রগতি ও আত্মশুদ্ধির যাত্রা", icon: Target },
  { id: "journal", label: "আত্মশুদ্ধি লিপি", shortLabel: "লিপি", description: "দৈনিক আমল, অভ্যাস ও ব্যক্তিগত নোট", icon: BookOpen },
  { id: "mirror", label: "নফস আয়না", shortLabel: "আয়না", description: "নিজের রেকর্ডের সময়ভিত্তিক বিশ্লেষণ", icon: Activity },
  { id: "notifications", label: "নোটিফিকেশন", shortLabel: "বার্তা", description: "স্মরণিকা ও ব্যক্তিগত আপডেট", icon: Bell },
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
function navigateSection(section: AppSection) {
  const url = new URL(window.location.href);
  url.pathname = "/dashboard";
  if (section === "home") url.searchParams.delete("section");
  else url.searchParams.set("section", section);
  window.history.pushState({ section }, "", `${url.pathname}${url.search}${url.hash}`);
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

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-intro">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
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

type HadithCardItem = (typeof hadithData)[number];
function getHijriLabel(dateKey: string) {
  try {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return new Intl.DateTimeFormat("bn-BD-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  } catch { return ""; }
}
function DailyHadithCard({ date }: { date: string }) {
  const [selection, setSelection] = useState({ date, offset: 0 });
  const numeric = Number(date.replaceAll("-", "")) || 0;
  const baseIndex = numeric % hadithData.length;
  const offset = selection.date === date ? selection.offset : 0;
  const index = (baseIndex + offset) % hadithData.length;
  const item = hadithData[index] as HadithCardItem;
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSelection((current) => ({ date, offset: (current.date === date ? current.offset : 0) + 1 }));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [date]);
  return <Panel className="hadith-daily-card" eyebrow="আজকের হাদিস" title="জ্ঞান, আমল ও সুন্দর আচরণ" action={<button type="button" className="text-action" onClick={() => setSelection({ date, offset: offset + 1 })}>পরবর্তী হাদিস <ArrowRight size={15}/></button>}>
    <div className="hadith-card-body" aria-live="polite" aria-atomic="true">
      <div className="hadith-card-symbol" aria-hidden="true">ﷺ</div>
      <div className="hadith-card-copy">
        <span className="hadith-category">{item.category}</span>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <div className="hadith-reference-grid"><span><small>বর্ণনাকারী</small><strong>{item.narrator}</strong></span><span><small>গ্রন্থ</small><strong>{item.collection}</strong></span><span><small>রেফারেন্স</small><strong>{item.reference}</strong></span></div>
        <div className="hadith-card-footer"><span>{(index + 1).toLocaleString("bn-BD")} / {hadithData.length.toLocaleString("bn-BD")}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">মূল রেফারেন্স দেখো <ArrowRight size={13}/></a></div>
      </div>
    </div>
  </Panel>;
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
  const activeJourney = data.journeys.find((item) => item.status === "active");
  const dayCount = activeJourney ? Math.max(1, Math.floor((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${activeJourney.startDate}T12:00:00`).getTime()) / 86_400_000) + 1) : 0;
  const activeDeadlinePlans = [...data.deadlinePlans].filter((plan) => plan.deadline >= date).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  
  return <div className="view-stack">
    <section className="today-hero">
      <div className="today-hero-content">
        <div className="today-kicker"><span className="live-dot"/> ব্যক্তিগত মুহাসাবা</div>
        <h2>আজকের দিনটি <em>কেমন কাটছে?</em></h2>
        <p>নিজের কাজের দিকে ফিরে তাকাও। ছোট সচেতন পদক্ষেপই ধারাবাহিক পরিবর্তনের শুরু।</p>
        <div className="today-date-line"><CalendarDays size={15}/><span>{formatLongDate(date, data.preferences.timeZone)}</span><span className="date-divider"/><span>{getHijriLabel(date)} হিজরি (গণনাভিত্তিক)</span><span className="date-divider"/><span>মাগরিব থেকে আসর পর্যন্ত হিসাব</span></div>
      </div>
      <div className="hero-progress" aria-label={`পাঁচ ওয়াক্তের ${completedPrayerCount}টি রেকর্ড`}>
        <div className="hero-progress-ring" style={{ "--progress": `${completedPrayerCount * 20}%` } as React.CSSProperties & { "--progress": string }}><strong>{completedPrayerCount}<small>/৫</small></strong></div>
        <span>ওয়াক্তের হিসাব</span><small>আদায় {completedPrayerCount.toLocaleString("bn-BD")} · আদায় হয়নি {missedPrayerCount.toLocaleString("bn-BD")} · রেকর্ড বাকি {unrecordedPrayerCount.toLocaleString("bn-BD")}</small>
      </div>
    </section>

    <div className="metric-grid">
      <MetricCard label="আজকের আদায়কৃত রাকাত" value={rakats.toLocaleString("bn-BD")} detail={`ফরজ ${categoryRakats.fard || 0} · সুন্নত ${categoryRakats.sunnah || 0} · ওয়াজিব ${categoryRakats.wajib || 0} · নফল ${categoryRakats.nafl || 0} · কাজা ${qadaRakatsToday.toLocaleString("bn-BD")}`} icon={Moon} onClick={() => navigateSection("journal")}/>
      <MetricCard label="বাকি কাজা সালাত" value={pendingQada.toLocaleString("bn-BD")} detail={`মোট ${pendingQadaRakats.toLocaleString("bn-BD")} রাকাত · আজ আদায় ${qadaRakatsToday.toLocaleString("bn-BD")} রাকাত`} icon={Clock3} accent="sand" onClick={() => navigateSection("journal")}/>
      <MetricCard label="আজকের কুরআন" value={`${ayahTotal.toLocaleString("bn-BD")} আয়াত`} detail={`${quranToday.length.toLocaleString("bn-BD")}টি পাঠের এন্ট্রি`} icon={BookOpen} accent="blue" onClick={() => navigateSection("journal")}/>
      <MetricCard label="আজকের জিকির" value={dhikrToday.toLocaleString("bn-BD")} detail="কাউন্টারে সংরক্ষিত সংখ্যা" icon={Sparkles} accent="rose" onClick={() => navigateSection("journal")}/>

    </div>

    <DailyHadithCard date={date}/>
    <PrayerTimeWidget data={data}/>
    <Panel eyebrow="কুরআন তেলাওয়াত" title="আজকের পাঠ ও সর্বশেষ অবস্থান" action={<button className="text-action" type="button" onClick={() => navigateSection("journal")}>তেলাওয়াত এন্ট্রি <ArrowRight size={15}/></button>}>
      <div className="quran-dashboard-summary"><div><strong>{ayahTotal.toLocaleString("bn-BD")}</strong><small>আজকের আয়াত</small></div><div><strong>{data.quranEntries.reduce((sum, item) => sum + item.ayahTo - item.ayahFrom + 1, 0).toLocaleString("bn-BD")}</strong><small>মোট সংরক্ষিত আয়াত</small></div><div><strong>{data.quranEntries[0] ? `${SURAHS[data.quranEntries[0].surahFrom - 1]?.name || "সূরা"} · ${data.quranEntries[0].ayahFrom.toLocaleString("bn-BD")}–${data.quranEntries[0].ayahTo.toLocaleString("bn-BD")}` : "এখনো পাঠ নেই"}</strong><small>সর্বশেষ পড়ার অবস্থান</small></div></div>
    </Panel>

    <div className="content-grid content-grid-wide-left">
      <Panel className="prayer-panel-new" eyebrow="আজকের সালাত" title="সালাতের বিস্তারিত হিসাব" action={<button className="text-action" type="button" onClick={() => navigateSection("journal")}>এন্ট্রি খুলুন <ArrowRight size={15}/></button>}>
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
              <button type="button" className="prayer-detail-action" onClick={() => navigateSection("journal")}>{latest || qada ? "সালাতের রেকর্ড খুলে দেখো" : "এই ওয়াক্তের এন্ট্রি দাও"} <ArrowRight size={14}/></button>
            </div>}
          </div>;
        })}</div>
        <div className="dashboard-rakat-breakdown"><button type="button" onClick={() => navigateSection("journal")}>সুন্নত <strong>{(categoryRakats.sunnah || 0).toLocaleString("bn-BD")}</strong></button><button type="button" onClick={() => navigateSection("journal")}>ফরজ <strong>{(categoryRakats.fard || 0).toLocaleString("bn-BD")}</strong></button><button type="button" onClick={() => navigateSection("journal")}>ওয়াজিব <strong>{(categoryRakats.wajib || 0).toLocaleString("bn-BD")}</strong></button><button type="button" onClick={() => navigateSection("journal")}>নফল <strong>{(categoryRakats.nafl || 0).toLocaleString("bn-BD")}</strong></button></div>
        <p className="panel-footnote">রাকাতের হিসাব তোমার সালাত সেটিংস অনুযায়ী।</p>
      </Panel>
      <div className="side-stack">
        <Panel className="reflection-panel" eyebrow="আজকের আত্মপর্যালোচনা" title="নিজের কাছে একটি প্রশ্ন"><div className="reflection-mark">“</div><p className="reflection-question">আজ এমন কোন কাজটি করেছি, যা আগামীকাল আরও ভালোভাবে করতে পারি?</p><span className="reflection-note">নিজেকে বিচার নয়—নিজেকে বোঝার চেষ্টা।</span><button className="text-action" type="button" onClick={() => navigateSection("journal")}>মুহাসাবা লিখি <ArrowRight size={15}/></button></Panel>
        <Panel className="quick-note-panel" eyebrow="দ্রুত নোট" title="আজকের ছোট্ট নোট"><QuickNote date={date} initialValue={note?.body || ""}/></Panel>
      </div>
    </div>

    <Panel eyebrow="আত্মশুদ্ধির যাত্রা" title="চলমান পর্যায়" action={<button className="text-action" type="button" onClick={() => navigateSection("goals")}>যাত্রা দেখো <ArrowRight size={15}/></button>}>
      {activeJourney ? <div className="dashboard-journey-summary"><div><span>অতিক্রান্ত দিন</span><strong>{dayCount.toLocaleString("bn-BD")}</strong></div><div><span>বর্তমান পর্যায়</span><strong>{getJourneyStage(dayCount).title}</strong></div><div><span>শুরুর তারিখ</span><strong>{formatCompactDate(activeJourney.startDate)}</strong></div></div> : <div className="journey-empty-inline"><span>নিজের পরিবর্তনের জন্য একটি নির্দিষ্ট শুরুর তারিখ বেছে নাও।</span><button className="button-primary button-small" type="button" onClick={() => navigateSection("goals")}>যাত্রা শুরু</button></div>}
    </Panel>

    <Panel eyebrow="একাডেমিক ও ব্যক্তিগত পরিকল্পনা" title="আসন্ন সময়সীমা" action={<button className="text-action" type="button" onClick={() => navigateSection("goals")}>সব পরিকল্পনা <ArrowRight size={15}/></button>}>
      {activeDeadlinePlans.length ? <div className="goal-preview-list">{activeDeadlinePlans.map((plan) => { const done = plan.tasks.filter((task) => task.completed).length; const progress = plan.tasks.length ? Math.round(done / plan.tasks.length * 100) : 0; const left = Math.ceil((new Date(`${plan.deadline}T12:00:00Z`).getTime() - new Date(`${date}T12:00:00Z`).getTime()) / 86400000); return <div className="goal-preview-row" key={plan.id}><div><strong>{plan.title}</strong><small>{left === 0 ? "আজ শেষ তারিখ" : `${left.toLocaleString("bn-BD")} দিন বাকি`} · {formatCompactDate(plan.deadline)}</small></div><span className="goal-progress-label">{progress.toLocaleString("bn-BD")}%</span></div>; })}</div> : <EmptyState icon={Target} title="এখনো কোনো সময়সীমা যোগ করা হয়নি" description="পরীক্ষা বা গুরুত্বপূর্ণ কাজের শেষ তারিখ যোগ করলে এখানে দেখা যাবে।"/>}
    </Panel>
    <div className={`local-data-note cloud-sync-note cloud-sync-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? <Cloud size={15}/> : <CloudOff size={15}/>}<span>{getCloudSyncMessage() || "তথ্য সরাসরি তোমার ব্যক্তিগত অনলাইন ওয়ার্কস্পেসে সংরক্ষিত হবে।"}</span></div>
  </div>;
}

const MOOD_LABELS: Record<string, string> = { hopeful: "আশাবাদী", calm: "শান্ত", focused: "মনোযোগী", restless: "অস্থির", challenged: "চ্যালেঞ্জের মধ্যে", tired: "ক্লান্ত", mixed: "মিশ্র অনুভূতি" };
function JourneyProgressCard({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const dateNow = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const [startDateSelection, setStartDateSelection] = useState({ dayKey: dateNow, value: dateNow });
  const startDate = startDateSelection.dayKey === dateNow ? startDateSelection.value : dateNow;
  const setStartDate = (value: string) => setStartDateSelection({ dayKey: dateNow, value });
  const [title, setTitle] = useState("আত্মশুদ্ধির যাত্রা");
  const [showObservation, setShowObservation] = useState(false);
  const [mood, setMood] = useState<"hopeful" | "calm" | "focused" | "restless" | "challenged" | "tired" | "mixed">("hopeful");
  const [context, setContext] = useState<"positive" | "difficult" | "neutral">("neutral");
  const [situation, setSituation] = useState("");
  const [response, setResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const [rewardStage, setRewardStage] = useState<number | null>(null);
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardNote, setRewardNote] = useState("");
  const active = data.journeys.find((item) => item.status === "active");
  const dayDifference = active ? Math.floor((new Date(`${dateNow}T12:00:00Z`).getTime() - new Date(`${active.startDate}T12:00:00Z`).getTime()) / 86_400_000) : -1;
  const elapsed = active && dayDifference >= 0 ? dayDifference + 1 : 0;
  const stage = getJourneyStage(Math.max(1, elapsed));
  const completedStages = getCompletedJourneyStages(elapsed);
  const journeyMilestones = active ? data.journeyMilestones.filter((item) => item.journeyId === active.id).sort((a, b) => a.stageNumber - b.stageNumber) : [];
  const observations = active ? data.journeyObservations.filter((item) => item.journeyId === active.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) : [];

  const activeJourneyId = active?.id ?? null;
  const activeJourneyStartDate = active?.startDate ?? null;
  const milestoneSnapshot = data.journeyMilestones;
  useEffect(() => {
    if (!activeJourneyId || !activeJourneyStartDate || completedStages < 1) return;
    const existing = new Set(milestoneSnapshot.filter((item) => item.journeyId === activeJourneyId).map((item) => item.stageNumber));
    const missing: (typeof milestoneSnapshot)[number][] = [];
    for (let number = 1; number <= completedStages; number += 1) {
      if (!existing.has(number)) {
        const titleForStage = getJourneyStageTitle(number);
        missing.push({ id: uid(), journeyId: activeJourneyId, stageNumber: number, title: titleForStage, requiredDays: number + 2,
          completedAt: addDaysToDateKey(activeJourneyStartDate, getStageCompletionOffset(number)), rewardTitle: "", rewardAmount: null, rewardNote: "", badgeAwarded: true, createdAt: new Date().toISOString() });
      }
    }
    if (missing.length) updateLocalData((current) => ({ ...current, journeyMilestones: [...missing, ...current.journeyMilestones] }));
  }, [activeJourneyId, activeJourneyStartDate, completedStages, milestoneSnapshot]);

  function start() {
    if (!startDate || startDate > dateNow) return;
    const entry = { id: uid(), title: title.trim() || "আত্মশুদ্ধির যাত্রা", startDate, endDate: null, status: "active" as const, note: "", createdAt: new Date().toISOString() };
    updateLocalData((current) => ({ ...current, journeys: [{ ...entry }, ...current.journeys.map((item) => item.status === "active" ? { ...item, status: "completed" as const, endDate: startDate } : item)] }));
    setTitle("আত্মশুদ্ধির যাত্রা");
  }
  function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || (!situation.trim() && !response.trim() && !reflection.trim())) return;
    const entry = { id: uid(), journeyId: active.id, stageNumber: stage.stage, date: dateNow, occurredAt: new Date().toISOString(), mood, context,
      situation: situation.trim().slice(0, 1600), response: response.trim().slice(0, 1600), reflection: reflection.trim().slice(0, 2000), createdAt: new Date().toISOString() };
    updateLocalData((current) => ({ ...current, journeyObservations: [entry, ...current.journeyObservations] }));
    setSituation(""); setResponse(""); setReflection(""); setShowObservation(false);
  }
  function editReward(milestone: (typeof data.journeyMilestones)[number]) {
    setRewardStage(milestone.stageNumber); setRewardTitle(milestone.rewardTitle); setRewardAmount(milestone.rewardAmount == null ? "" : String(milestone.rewardAmount)); setRewardNote(milestone.rewardNote);
  }
  function saveReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || rewardStage === null || !rewardTitle.trim()) return;
    const amount = rewardAmount.trim() ? Number(rewardAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 100000000)) return;
    updateLocalData((current) => ({ ...current, journeyMilestones: current.journeyMilestones.map((item) => item.journeyId === active.id && item.stageNumber === rewardStage ? { ...item, rewardTitle: rewardTitle.trim(), rewardAmount: amount, rewardNote: rewardNote.trim() } : item) }));
    setRewardStage(null); setRewardTitle(""); setRewardAmount(""); setRewardNote("");
  }
  function finishAndRestart() {
    if (!active || !window.confirm("বর্তমান যাত্রা শেষ করে নতুন যাত্রা শুরু করবে? আগের পর্যায়, পুরস্কার ও ব্যক্তিগত নোট সংরক্ষিত থাকবে।")) return;
    const now = new Date().toISOString();
    const nextJourney = { id: uid(), title: "আত্মশুদ্ধির নতুন যাত্রা", startDate: dateNow, endDate: null, status: "active" as const, note: "", createdAt: now };
    setStartDate(dateNow); setTitle("আত্মশুদ্ধির যাত্রা");
    updateLocalData((current) => ({ ...current, journeys: [nextJourney, ...current.journeys.map((item) => item.status === "active" ? { ...item, status: "completed" as const, endDate: dateNow } : item)] }));
  }

  return <Panel eyebrow="আত্মশুদ্ধির যাত্রা" title="নিজের পরিবর্তনের ধারাবাহিকতা">
    {active ? <div className="journey-stage-card">
      <div className="journey-stage-top"><div><span>বর্তমান পর্যায় · {stage.stage.toLocaleString("bn-BD")}</span><h3>{elapsed ? stage.title : "যাত্রা শুরু হওয়ার অপেক্ষা"}</h3><p>{active.title}</p></div><div className="journey-day-number"><strong>{elapsed.toLocaleString("bn-BD")}</strong><small>দিন</small></div></div>
      <div className="journey-stage-track"><span style={{ width: `${stage.dayInStage / stage.length * 100}%` }}/></div>
      <div className="journey-stage-foot"><span>এই পর্যায়ে {stage.dayInStage.toLocaleString("bn-BD")} / {stage.length.toLocaleString("bn-BD")} দিন</span><span>পরবর্তী পর্যায়ে {Math.max(0, stage.length - stage.dayInStage).toLocaleString("bn-BD")} দিন বাকি</span></div>
      <p className="journey-quote">“ধীরে এগোলেও প্রতিদিন নিজের যত্ন নেওয়া গুরুত্বপূর্ণ।”</p>
      <div className="journey-stage-actions"><span>শুরু: {formatLongDate(active.startDate, data.preferences.timeZone)}</span><button type="button" className="tracker-secondary-button" onClick={finishAndRestart}>নতুন যাত্রা শুরু</button></div>
      <div className="journey-milestone-heading"><div><strong>তোমার অর্জিত মাইলফলক</strong><small>প্রতি পর্যায় শেষে একটি সবুজ যাচাইকৃত ব্যাজ</small></div><span>{completedStages.toLocaleString("bn-BD")}টি অর্জন</span></div>
      <div className="journey-milestone-list">
        {Array.from({ length: Math.min(6, Math.max(3, completedStages + 2)) }, (_, index) => {
          const stageNumber = Math.max(1, completedStages - 2) + index;
          const name = getJourneyStageTitle(stageNumber);
          const done = stageNumber <= completedStages;
          const current = stageNumber === stage.stage;
          const milestone = journeyMilestones.find((item) => item.stageNumber === stageNumber);
          return <article className={`journey-milestone ${done ? "is-complete" : current ? "is-current" : "is-locked"}`} key={stageNumber}>
            <span className="journey-milestone-badge">{done ? <CheckCircle2 size={17}/> : <span>{stageNumber.toLocaleString("bn-BD")}</span>}</span>
            <div className="journey-milestone-copy"><strong>{name}</strong><small>{done ? `সম্পন্ন · ${formatCompactDate(milestone?.completedAt || dateNow)}` : current ? `চলমান · ${stage.length.toLocaleString("bn-BD")} দিনের পর্যায়` : `${(stageNumber + 2).toLocaleString("bn-BD")} দিনের পর্যায়`}</small>{milestone?.rewardTitle && <p>নিজের পুরস্কার: {milestone.rewardTitle}</p>}{milestone?.rewardAmount != null && <small>নির্ধারিত পরিমাণ: ৳{milestone.rewardAmount.toLocaleString("bn-BD")}</small>}{milestone?.rewardNote && <small>{milestone.rewardNote}</small>}</div>
            {done && milestone && <button type="button" className="tracker-quiet-button" onClick={() => editReward(milestone)}>{milestone.rewardTitle ? "পুরস্কার সম্পাদনা" : "নিজেকে পুরস্কার দাও"}</button>}
          </article>;
        })}
      </div>
      {rewardStage !== null && <form className="journey-reward-form" onSubmit={saveReward}><strong>পর্যায় {rewardStage.toLocaleString("bn-BD")} · নিজের পুরস্কার</strong><label className="tracker-field"><span>নিজেকে কী উপহার বা আনন্দ দিতে চাও?</span><input className="tracker-input" value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} maxLength={120} placeholder="যেমন: পছন্দের বই কেনা" required/></label><label className="tracker-field"><span>নিজের জন্য নির্ধারিত পরিমাণ (টাকা, ঐচ্ছিক)</span><input className="tracker-input" type="number" min="0" max="100000000" step="1" inputMode="numeric" value={rewardAmount} onChange={(event) => setRewardAmount(event.target.value)} placeholder="যেমন: ৫০০"/></label><label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><textarea className="tracker-input tracker-textarea" rows={2} value={rewardNote} onChange={(event) => setRewardNote(event.target.value)} maxLength={1200}/></label><div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={() => { setRewardStage(null); setRewardAmount(""); }}>বাতিল</button><button type="submit" className="tracker-primary-button">পুরস্কার সংরক্ষণ</button></div></form>}
      <div className="journey-observation-section"><div className="journey-milestone-heading"><div><strong>এই যাত্রার অভিজ্ঞতা</strong><small>ভালো-মন্দ, অনুভূতি ও নিজের প্রতিক্রিয়া লিখে রাখো</small></div><button className="tracker-primary-button" type="button" onClick={() => setShowObservation((value) => !value)}><Plus size={15}/> অভিজ্ঞতা যোগ করো</button></div>
        {showObservation && <form className="journey-observation-form" onSubmit={saveObservation}><div className="tracker-form-grid"><label className="tracker-field"><span>মনের অবস্থা</span><select className="tracker-input" value={mood} onChange={(event) => setMood(event.target.value as typeof mood)}>{Object.entries(MOOD_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="tracker-field"><span>দিনের অভিজ্ঞতা</span><select className="tracker-input" value={context} onChange={(event) => setContext(event.target.value as typeof context)}><option value="positive">ইতিবাচক</option><option value="difficult">কঠিন</option><option value="neutral">সাধারণ</option></select></label></div><label className="tracker-field"><span>কী পরিস্থিতির মুখোমুখি হয়েছ?</span><textarea className="tracker-input tracker-textarea" rows={2} value={situation} onChange={(event) => setSituation(event.target.value)} maxLength={1600}/></label><label className="tracker-field"><span>তুমি কীভাবে সামলেছ?</span><textarea className="tracker-input tracker-textarea" rows={2} value={response} onChange={(event) => setResponse(event.target.value)} maxLength={1600}/></label><label className="tracker-field"><span>নিজের জন্য কী শিখলে বা মনে রাখতে চাও?</span><textarea className="tracker-input tracker-textarea" rows={2} value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={2000}/></label><div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={() => setShowObservation(false)}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={!situation.trim() && !response.trim() && !reflection.trim()}>অভিজ্ঞতা সংরক্ষণ</button></div></form>}
        {observations.length ? <div className="journey-observation-list">{observations.slice(0, 8).map((item) => <article key={item.id}><div><strong>{formatCompactDate(item.date)} · {MOOD_LABELS[item.mood]}</strong><span className={`observation-context context-${item.context}`}>{item.context === "positive" ? "ইতিবাচক" : item.context === "difficult" ? "কঠিন" : "সাধারণ"}</span></div>{item.situation && <p><b>পরিস্থিতি:</b> {item.situation}</p>}{item.response && <p><b>প্রতিক্রিয়া:</b> {item.response}</p>}{item.reflection && <p><b>উপলব্ধি:</b> {item.reflection}</p>}</article>)}</div> : <p className="journey-empty-observation">এখনো কোনো অভিজ্ঞতা লেখা হয়নি। প্রয়োজন মনে হলে বিভিন্ন সময়ে ছোট নোট যোগ করতে পারো।</p>}
      </div>
    </div> : <div className="journey-start-form"><p>নিজের পরিবর্তনের যাত্রা শুরু করার তারিখ বেছে নাও। প্রথম পর্যায় ৩ দিন; এরপর প্রতিটি পর্যায় এক দিন করে দীর্ঘ হবে।</p><div className="tracker-form-grid"><label className="tracker-field"><span>যাত্রার নাম</span><input className="tracker-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}/></label><label className="tracker-field"><span>শুরুর তারিখ (মাগরিবভিত্তিক)</span><input className="tracker-input" type="date" value={startDate} max={dateNow} onChange={(e) => setStartDate(e.target.value)} required/></label></div><button className="tracker-primary-button" type="button" disabled={!startDate || startDate > dateNow} onClick={start}><Plus size={16}/> যাত্রা শুরু</button></div>}
    {data.journeys.length > 1 && <div className="journey-history-line"><strong>আগের যাত্রা</strong>{data.journeys.filter((item) => item.status === "completed").slice(0, 5).map((item) => <span key={item.id}>{item.title} · {formatCompactDate(item.startDate)}–{item.endDate ? formatCompactDate(item.endDate) : "—"}</span>)}</div>}
  </Panel>;
}

function QuickNote({ date, initialValue }: { date: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  function save() {
    updateLocalData((current) => {
      const old = current.notes.find((note) => note.date === date);
      const next = { date, mood: old?.mood || "", body: value.slice(0, 4000), reflection: old?.reflection || "", gratitude: old?.gratitude || "", updatedAt: new Date().toISOString() };
      return { ...current, notes: old ? current.notes.map((note) => note.date === date ? next : note) : [next, ...current.notes] };
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  return <div className="quick-note-editor"><textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} maxLength={4000} placeholder="আজকের কোনো ভাবনা বা উপলব্ধি লিখে রাখো…" /><div><small>{value.length}/৪০০০</small><button type="button" className="button-primary button-small" onClick={save} disabled={!value.trim()}>{saved ? <Check size={14} /> : <ArrowDownToLine size={14} />}{saved ? "সংরক্ষিত" : "নোট রাখো"}</button></div></div>;
}

function GoalsView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const dateNow = todayKey(data.preferences.timeZone, data.preferences.maghribTime);
  const [activeTab, setActiveTab] = useState<"journey" | "deadlines">("journey");
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineCategory, setDeadlineCategory] = useState<DeadlinePlan["category"]>("exam");
  const [deadlineDescription, setDeadlineDescription] = useState("");
  const [taskPlanId, setTaskPlanId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  function addDeadline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deadlineTitle.trim() || !deadlineDate || deadlineDate < dateNow) return;
    const now = new Date().toISOString();
    const plan: DeadlinePlan = { id: uid(), title: deadlineTitle.trim(), category: deadlineCategory, deadline: deadlineDate,
      description: deadlineDescription.trim(), tasks: [], createdAt: now, updatedAt: now };
    updateLocalData((current) => ({ ...current, deadlinePlans: [plan, ...current.deadlinePlans] }));
    setDeadlineTitle(""); setDeadlineDate(""); setDeadlineDescription(""); setShowDeadlineForm(false);
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
  function removeDeadline(planId: string) {
    if (!window.confirm("এই সময়সীমা ও এর কাজগুলো মুছে ফেলবে?")) return;
    updateLocalData((current) => ({ ...current, deadlinePlans: current.deadlinePlans.filter((plan) => plan.id !== planId) }));
  }
  const sortedPlans = [...data.deadlinePlans].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const completedPlans = sortedPlans.filter((plan) => plan.tasks.length > 0 && plan.tasks.every((task) => task.completed)).length;
  const daysRemaining = (deadline: string) => Math.ceil((new Date(`${deadline}T12:00:00Z`).getTime() - new Date(`${dateNow}T12:00:00Z`).getTime()) / 86_400_000);
  const categoryLabel = (category: DeadlinePlan["category"]) => ({ exam: "পরীক্ষা", assignment: "অ্যাসাইনমেন্ট", project: "প্রজেক্ট", other: "অন্যান্য" })[category];

  return <div className="view-stack">
    <PageIntro eyebrow="ব্যক্তিগত পরিকল্পনা" title="লক্ষ্য ও সময়সীমা" description="আত্মশুদ্ধির লক্ষ্য ও পড়াশোনার সময়সীমা আলাদাভাবে সাজাও।"/>
    <div className="goals-mode-tabs" role="tablist" aria-label="লক্ষ্য ও সময়সীমা">
      <button type="button" role="tab" aria-selected={activeTab === "journey"} className={activeTab === "journey" ? "selected" : ""} onClick={() => setActiveTab("journey")}><ShieldCheck size={17}/> আত্মশুদ্ধির যাত্রা</button>
      <button type="button" role="tab" aria-selected={activeTab === "deadlines"} className={activeTab === "deadlines" ? "selected" : ""} onClick={() => setActiveTab("deadlines")}><CalendarDays size={17}/> সময়সীমা ও পরিকল্পনা</button>
    </div>
    {activeTab === "journey" ? <>
      <JourneyProgressCard data={data}/>
      <Panel eyebrow="কেন এই যাত্রা" title="নিজের জন্য একটি বাস্তবসম্মত সংকল্প"><p className="journey-principle-copy">এটি প্রতিযোগিতা নয়—নিজের সঙ্গে এগিয়ে চলার যাত্রা। কঠিন দিনেও কী শিখলে, তা লিখে রাখো।</p></Panel>
    </> : <>
      <div className="metric-grid metric-grid-three">
        <MetricCard label="মোট সময়সীমা" value={sortedPlans.length} detail="পরীক্ষা, কাজ ও প্রজেক্ট" icon={CalendarDays}/>
        <MetricCard label="সামনে রয়েছে" value={sortedPlans.filter((plan) => daysRemaining(plan.deadline) >= 0).length} detail="এখনো সময় আছে" icon={Clock3} accent="sand"/>
        <MetricCard label="কাজ সম্পন্ন" value={completedPlans} detail="সব সাবটাস্ক সম্পন্ন" icon={CheckCircle2} accent="blue"/>
      </div>
      <Panel eyebrow="পরিকল্পনা তৈরি" title="নতুন সময়সীমা" action={<button type="button" className="button-primary button-small" onClick={() => setShowDeadlineForm((value) => !value)}><Plus size={15}/> সময়সীমা যোগ করো</button>}>
        {showDeadlineForm && <form className="deadline-create-form" onSubmit={addDeadline}>
          <div className="tracker-form-grid"><label className="tracker-field"><span>পরীক্ষা বা কাজের নাম</span><input className="tracker-input" value={deadlineTitle} onChange={(event) => setDeadlineTitle(event.target.value)} maxLength={140} placeholder="যেমন: ফাইনাল পরীক্ষা" required/></label><label className="tracker-field"><span>ধরন</span><select className="tracker-input" value={deadlineCategory} onChange={(event) => setDeadlineCategory(event.target.value as DeadlinePlan["category"])}><option value="exam">পরীক্ষা</option><option value="assignment">অ্যাসাইনমেন্ট</option><option value="project">প্রজেক্ট</option><option value="other">অন্যান্য</option></select></label><label className="tracker-field"><span>শেষ তারিখ</span><input className="tracker-input" type="date" min={dateNow} value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} required/></label></div>
          <label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><textarea className="tracker-input tracker-textarea" rows={2} value={deadlineDescription} onChange={(event) => setDeadlineDescription(event.target.value)} maxLength={1600} placeholder="পরীক্ষার বিষয়, প্রস্তুতি বা প্রয়োজনীয় তথ্য…"/></label>
          <div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={() => setShowDeadlineForm(false)}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={!deadlineTitle.trim() || !deadlineDate}>সময়সীমা সংরক্ষণ</button></div>
        </form>}
        {sortedPlans.length ? <div className="deadline-plan-list">{sortedPlans.map((plan) => {
          const left = daysRemaining(plan.deadline);
          const done = plan.tasks.filter((task) => task.completed).length;
          const percent = plan.tasks.length ? Math.round(done / plan.tasks.length * 100) : 0;
          return <article className="deadline-plan-card" key={plan.id}>
            <div className="deadline-plan-heading"><div><span className="deadline-category">{categoryLabel(plan.category)}</span><h3>{plan.title}</h3>{plan.description && <p>{plan.description}</p>}</div><button type="button" className="icon-button-soft" aria-label="সময়সীমা মুছুন" onClick={() => removeDeadline(plan.id)}><X size={16}/></button></div>
            <div className="deadline-countdown"><strong>{left < 0 ? `${Math.abs(left).toLocaleString("bn-BD")} দিন পেরিয়েছে` : left === 0 ? "আজই শেষ তারিখ" : `${left.toLocaleString("bn-BD")} দিন বাকি`}</strong><span>{formatLongDate(plan.deadline, data.preferences.timeZone)}</span></div>
            <div className="deadline-progress"><span style={{ width: `${percent}%` }}/></div>
            <div className="deadline-progress-label"><span>{done.toLocaleString("bn-BD")} / {plan.tasks.length.toLocaleString("bn-BD")} কাজ সম্পন্ন</span><strong>{percent.toLocaleString("bn-BD")}%</strong></div>
            <div className="deadline-task-list">{plan.tasks.map((task) => <div className={`deadline-task-row ${task.completed ? "is-done" : ""}`} key={task.id}><label><input type="checkbox" checked={task.completed} onChange={() => toggleTask(plan.id, task.id)}/><span><strong>{task.title}</strong>{task.details && <small>{task.details}</small>}{task.dueDate && <small>শেষ তারিখ: {formatCompactDate(task.dueDate)}</small>}</span></label><button type="button" className="tracker-icon-button" aria-label="কাজ মুছুন" onClick={() => removeTask(plan.id, task.id)}><X size={14}/></button></div>)}</div>
            {taskPlanId === plan.id ? <form className="deadline-task-form" onSubmit={(event) => addTask(event, plan.id)}><label className="tracker-field"><span>কাজের নাম</span><input className="tracker-input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="যেমন: প্রথম অধ্যায় শেষ করা" required/></label><label className="tracker-field"><span>বিস্তারিত (ঐচ্ছিক)</span><input className="tracker-input" value={taskDetails} onChange={(event) => setTaskDetails(event.target.value)} maxLength={600}/></label><label className="tracker-field"><span>কাজের শেষ তারিখ (ঐচ্ছিক)</span><input className="tracker-input" type="date" min={dateNow} max={plan.deadline} value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)}/></label><div className="form-actions"><button type="button" className="tracker-quiet-button" onClick={() => setTaskPlanId("")}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={!taskTitle.trim()}>কাজ যোগ করো</button></div></form> : <button type="button" className="text-action deadline-add-task" onClick={() => { setTaskPlanId(plan.id); setTaskTitle(""); setTaskDetails(""); setTaskDueDate(""); }}><Plus size={15}/> পরিকল্পনায় কাজ যোগ করো</button>}
          </article>;
        })}</div> : <EmptyState icon={CalendarDays} title="এখনো কোনো সময়সীমা নেই" description="পরীক্ষা, অ্যাসাইনমেন্ট বা প্রজেক্টের শেষ তারিখ যোগ করলে বাকি দিন ও প্রস্তুতির কাজ এক জায়গায় দেখতে পাবে।"/>}
      </Panel>
    </>}
    {data.goals.length > 0 && <details className="legacy-goals-details"><summary>আগের সংস্করণের লক্ষ্যসমূহ ({data.goals.length.toLocaleString("bn-BD")})</summary><div className="legacy-goal-list">{data.goals.map((goal) => <div key={goal.id}><strong>{goal.title}</strong><small>{goal.complete ? "সম্পন্ন" : "আগের লক্ষ্য · রূপান্তর না করা পর্যন্ত সংরক্ষিত"}</small></div>)}</div></details>}
  </div>;
}

function JournalView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  return <TrackerCenter data={data}/>;
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
    <PageIntro eyebrow="নিজের রেকর্ডের বিশ্লেষণ" title="নফস আয়না" description="সংরক্ষিত রেকর্ডের সারাংশ দেখো—এটি কোনো আধ্যাত্মিক স্কোর নয়।"/>
    <div className="range-control" role="group" aria-label="বিশ্লেষণের সময়সীমা">{[{ value: "7", label: "৭ দিন" }, { value: "30", label: "৩০ দিন" }, { value: "90", label: "৯০ দিন" }].map((item) => <button type="button" key={item.value} onClick={() => setRange(item.value as typeof range)} className={range === item.value ? "active" : ""}>{item.label}</button>)}</div>
    <div className="metric-grid"><MetricCard label="আদায়কৃত রাকাত" value={rakatTotal.toLocaleString("bn-BD")} detail={`শেষ ${range} দিনের সালাত রেকর্ড`} icon={Moon}/><MetricCard label="কুরআনের আয়াত" value={ayahTotal.toLocaleString("bn-BD")} detail={`${quran.length.toLocaleString("bn-BD")}টি পাঠ`} icon={BookOpen} accent="sand"/><MetricCard label="জিকিরের সংখ্যা" value={dhikrTotal.toLocaleString("bn-BD")} detail={`${dhikr.length.toLocaleString("bn-BD")}টি সেশন`} icon={Sparkles} accent="blue"/><MetricCard label="ভালো কাজের রেকর্ড" value={good.length.toLocaleString("bn-BD")} detail={`${avoid.length.toLocaleString("bn-BD")}টি ব্যক্তিগত আত্মসংযম লগ`} icon={Heart} accent="rose"/><MetricCard label="কাজা আদায়" value={qadaPrayers.length.toLocaleString("bn-BD")} detail="নির্বাচিত সময়ে সম্পন্ন কাজার রেকর্ড" icon={Clock3} accent="sand"/></div>
    <div className="content-grid"><Panel eyebrow="দৈনিক কার্যক্রম" title="সাম্প্রতিক সাত দিনের ধারা"><div className="weekly-bars">{days.map((bar) => <div className="weekly-bar-column" key={bar.key}><span className="weekly-bar-value">{bar.count ? bar.count.toLocaleString("bn-BD") : "—"}</span><div className="weekly-bar-track"><span style={{ height: `${Math.max(bar.count ? 8 : 3, bar.count / max * 100)}%` }}/></div><small>{bar.label}</small></div>)}</div><p className="chart-caption">এই চার্টে দৈনিক Tracker Entry-এর সংখ্যা দেখানো হয়েছে; এটি ইবাদতের মান নির্ধারণ করে না।</p></Panel>
      <Panel eyebrow="সালাতের ধরন" title="রাকাতের বিভাগ"><div className="category-breakdown">{[{ id: "fard", label: "ফরজ" }, { id: "sunnah", label: "সুন্নত" }, { id: "wajib", label: "ওয়াজিব" }, { id: "nafl", label: "নফল" }].map((kind) => { const amount = prayers.flatMap((x) => x.components).filter((x) => x.category === kind.id).reduce((n, x) => n + x.performedRakats, 0); return <div className="breakdown-row" key={kind.id}><span className="breakdown-label">{kind.label}</span><span className="breakdown-track"><span style={{ width: `${rakatTotal ? amount / rakatTotal * 100 : 0}%` }}/></span><strong>{amount.toLocaleString("bn-BD")}</strong></div>; })}</div><p className="panel-footnote">রাকাতের হিসাব সেটিংস ও সংরক্ষিত এন্ট্রি থেকে তৈরি।</p></Panel></div>
    <Panel eyebrow="সময়সীমার সারাংশ" title="অন্যান্য ট্র্যাকার"><div className="tracker-stat-grid"><div><strong>{fasting.filter((x) => x.status === "completed").length.toLocaleString("bn-BD")}</strong><small>সম্পন্ন সিয়াম</small></div><div><strong>{good.length.toLocaleString("bn-BD")}</strong><small>ভালো কাজ</small></div><div><strong>{avoid.length.toLocaleString("bn-BD")}</strong><small>ব্যক্তিগত আত্মসংযম লগ</small></div><div><strong>{data.studyEntries.filter((x) => within(x.date)).length.toLocaleString("bn-BD")}</strong><small>অধ্যয়ন সেশন</small></div><div><strong>{data.habitLogs.filter((x) => within(x.date) && x.completed).length.toLocaleString("bn-BD")}</strong><small>সম্পন্ন অভ্যাস</small></div><div><strong>{data.reflections.filter((x) => within(x.date)).length.toLocaleString("bn-BD")}</strong><small>মুহাসাবা জার্নাল</small></div></div></Panel>
    <div className="local-data-note"><Cloud size={15}/>বিশ্লেষণ তোমার ব্যক্তিগত Supabase ওয়ার্কস্পেসের তথ্য থেকে তৈরি।</div>
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

function NotificationsView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const events = data.reminderEvents;
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notPerformed, setNotPerformed] = useState<string | null>(null);
  function dismiss(id: string) { updateLocalData((current) => ({ ...current, reminderEvents: current.reminderEvents.map((item) => item.id === id ? { ...item, resolved: true } : item) })); }
  function completed() { setConfirming(null); setNotPerformed(null); }
  return <div className="view-stack"><PageIntro eyebrow="স্মরণিকা ও আপডেট" title="নোটিফিকেশন" description="ওয়াক্ত, জামাত ও কাজার স্মরণিকা এখানে থাকবে।"/>
    <Panel eyebrow="অপেক্ষমাণ স্মরণিকা" title="তোমার জন্য বার্তা" action={<span className="panel-meta">{events.filter((x) => !x.resolved).length.toLocaleString("bn-BD")}টি অপেক্ষমাণ</span>}>
      {events.length ? <div className="reminder-event-list">{events.slice(0, 50).map((event) => <article className={`reminder-event-card ${event.resolved ? "resolved" : ""}`} key={event.id}><div className="reminder-event-icon"><Bell size={18}/></div><div className="reminder-event-copy"><strong>{event.title}</strong><p>{event.message}</p><small>{new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(event.createdAt))}</small>
        {!event.resolved && event.kind === "waqt-ended" && <div className="reminder-event-actions"><button type="button" className="tracker-primary-button" onClick={() => { setNotPerformed(null); setConfirming(event.id); }}>হ্যাঁ, আদায় করেছি</button><button type="button" className="tracker-secondary-button" onClick={() => { setConfirming(null); setNotPerformed(event.id); }}>না, আদায় করিনি</button></div>}
        {!event.resolved && event.kind !== "waqt-ended" && <button type="button" className="tracker-secondary-button" onClick={() => dismiss(event.id)}>পড়া হয়েছে</button>}
        {confirming === event.id && <WaqtPrayerEntryForm data={data} event={event} onCancel={() => setConfirming(null)} onSaved={completed}/>}
        {notPerformed === event.id && <WaqtNotPerformedForm data={data} event={event} onCancel={() => setNotPerformed(null)} onSaved={completed}/>}
        </div><span className={`reminder-state ${event.resolved ? "done" : "pending"}`}>{event.resolved ? "সম্পন্ন" : "নতুন"}</span></article>)}</div> : <EmptyState icon={Bell} title="এখনো কোনো স্মরণিকা নেই" description="ওয়াক্ত, জামাত ও রাতের কাজার স্মরণ Settings-এ চালু করলে এখানে দেখা যাবে।"/>}
    </Panel>
    <Panel eyebrow="স্মরণিকার নিয়ম" title="কীভাবে কাজ করবে"><div className="notice-status"><span className="notice-status-icon"><ShieldCheck size={20}/></span><div><strong>আগে তোমার নিশ্চিতকরণ নেওয়া হবে</strong><p>ওয়াক্ত শেষ হলে অ্যাপ জিজ্ঞেস করবে—তুমি কি সালাত আদায় করেছ কি না? না হলে কাজার রেকর্ড হবে; আদায় করলে সময় ও পদ্ধতি সংরক্ষিত হবে।</p></div></div></Panel>
    <div className="local-data-note"><Bell size={15}/>ব্রাউজারের সাধারণ নোটিফিকেশনের জন্য অ্যাপ খোলা থাকতে হবে। অ্যাপ বন্ধ থাকলেও নোটিফিকেশন পাঠানোর ব্যবস্থা পরবর্তী সার্ভার ধাপে যুক্ত হবে।</div>
  </div>;
}

function SettingsView({ data }: { data: ReturnType<typeof getLocalDataSnapshot> }) {
  const { theme, setTheme, themeSaveState, themeSaveMessage } = useTheme();
  const [displayName, setDisplayName] = useState(data.preferences.displayName);
  const [maghribTime, setMaghribTime] = useState(data.preferences.maghribTime);
  const [saved, setSaved] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
  async function manualSync() {
    setSyncing(true); setBackupMessage("");
    try { await syncCloudNow(); setBackupMessage(getCloudSyncMessage() || "সিঙ্ক সম্পন্ন হয়েছে।"); }
    finally { setSyncing(false); }
  }
  async function clearData() {
    if (!window.confirm("এই অ্যাকাউন্টের অনলাইন ওয়ার্কস্পেসের সব জার্নাল, লক্ষ্য ও রেকর্ড স্থায়ীভাবে খালি হয়ে যাবে। আগে Backup নিয়েছ কি?")) return;
    replaceLocalData({ schemaVersion: 3, goals: [], records: [], prayerDays: [], notes: [], preferences: { displayName: "", timeZone: "Asia/Dhaka", maghribTime: "", maghribRollover: true, remindersEnabled: false, prayerReminderMinutes: 10, sleepReminder: "22:30" }, journeyMilestones: [], journeyObservations: [], deadlinePlans: [], updatedAt: new Date().toISOString() });
    await flushLocalData();
    setDisplayName(""); setMaghribTime("");
    setBackupMessage(getCloudSyncState() === "synced" ? "অনলাইন ওয়ার্কস্পেস খালি করা হয়েছে।" : getCloudSyncMessage() || "অনলাইন তথ্য খালি করা নিশ্চিত করা যায়নি।");
  }
  return (
    <div className="view-stack">
      <PageIntro eyebrow="ব্যক্তিগত পছন্দ" title="সেটিংস" description="প্রোফাইল, থিম, সালাত ও অনলাইন সংরক্ষণ।" />
      <PrayerSettingsPanel data={data}/>
      <div className="content-grid content-grid-wide-left">
        <Panel eyebrow="ব্যক্তিগত পছন্দ" title="ব্যক্তিগত তথ্য"><form className="workspace-form" onSubmit={savePreferences}><label>প্রদর্শিত নাম<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="তোমার নাম" /></label><label>সময় অঞ্চল<input value="বাংলাদেশের সময় (Asia/Dhaka)" readOnly aria-readonly="true" /></label><label>মাগরিবের সময় (ঐচ্ছিক সংশোধন)<input type="time" value={maghribTime} onChange={(event) => setMaghribTime(event.target.value)} /></label><p className="field-hint">সময় অঞ্চল বাংলাদেশে স্থির। সময় ফাঁকা রাখলে হানাফি সূচির মাগরিব নেওয়া হবে; চাইলে নিজে সংশোধন করো। মাগরিবে নতুন দিন শুরু হবে।</p><div className="form-actions"><button type="submit" className="button-primary">{saved ? <Check size={15}/> : <ArrowDownToLine size={15}/>} {saved ? "সংরক্ষিত" : "পছন্দ সংরক্ষণ"}</button></div></form></Panel>
        <Panel eyebrow="দৃশ্যমানতা" title="থিম"><div className="theme-choice-list"><button type="button" className={`theme-choice ${theme === "light" ? "selected" : ""}`} onClick={() => setTheme("light")}><Sun size={17}/><span><strong>সাদা থিম</strong><small>পরিষ্কার উজ্জ্বল ক্যানভাস</small></span>{theme === "light" && <Check size={16}/>}</button><button type="button" className={`theme-choice ${theme === "dark" ? "selected" : ""}`} onClick={() => setTheme("dark")}><Moon size={17}/><span><strong>অন্ধকার থিম</strong><small>কম আলোতে আরামদায়ক</small></span>{theme === "dark" && <Check size={16}/>}</button></div><p className={`field-hint theme-save-${themeSaveState}`} role="status">{themeSaveMessage}</p></Panel>
      </div>
      <Panel eyebrow="অনলাইন সংরক্ষণ" title="ব্যক্তিগত অনলাইন ওয়ার্কস্পেস"><div className="backup-summary"><span className="backup-summary-icon"><ShieldCheck size={20}/></span><div><strong>{getCloudSyncState() === "synced" ? "সব তথ্য অনলাইনে সংরক্ষিত" : getCloudSyncState() === "syncing" ? "অনলাইনে সংরক্ষণ চলছে" : getCloudSyncState() === "offline" ? "ইন্টারনেট সংযোগ নেই" : getCloudSyncState() === "error" ? "অনলাইন সংরক্ষণে সমস্যা" : "অনলাইন সংরক্ষণ প্রস্তুত হচ্ছে"}</strong><p>{data.prayerEntries.length + data.extraPrayerEntries.length}টি সালাত · {data.quranEntries.length}টি কুরআন পাঠ · {data.dhikrSessions.length}টি জিকির · {data.deadlinePlans.length}টি সময়সীমা · {data.journeys.length}টি যাত্রা</p></div><span className={`local-badge cloud-status-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? "অনলাইনে আছে" : getCloudSyncState() === "offline" ? "সংযোগ নেই" : getCloudSyncState() === "error" ? "সমস্যা" : getCloudSyncState() === "syncing" ? "সংরক্ষণ হচ্ছে" : "প্রস্তুতি"}</span></div><div className="backup-actions"><button type="button" className="button-secondary" onClick={() => void manualSync()} disabled={syncing}><RefreshCw size={15} className={syncing ? "spin" : ""}/> {syncing ? "যাচাই হচ্ছে…" : "অনলাইন তথ্য যাচাই"}</button><button type="button" className="button-secondary" onClick={exportData}><Download size={15}/> JSON ব্যাকআপ ডাউনলোড</button><label className="button-secondary upload-button"><Upload size={15}/>{importing ? "পড়া হচ্ছে…" : "ব্যাকআপ পুনরুদ্ধার"}<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} disabled={importing}/></label><button type="button" className="button-danger-quiet" onClick={clearData}><X size={15}/> অনলাইন তথ্য খালি করো</button></div>{backupMessage && <p className="inline-feedback" role="status">{backupMessage}</p>}<p className="security-caption"><LockKeyhole size={14}/> সব রেকর্ড ও পছন্দ Supabase-এ থাকে; IndexedDB বা Local Storage-এ নতুন রেকর্ড লেখে না। ইন্টারনেট না থাকলে সংরক্ষণ হয় না। JSON ব্যাকআপ এনক্রিপ্ট করা নয়—নিরাপদে রাখো।</p></Panel>
      <div className={`local-data-note cloud-sync-note cloud-sync-${getCloudSyncState()}`}>{getCloudSyncState() === "synced" ? <Cloud size={15}/> : <CloudOff size={15}/>} {getCloudSyncMessage() || "তথ্য সরাসরি Supabase-এ সংরক্ষিত হয়।"}</div>
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
  const unreadCount = data?.reminderEvents.filter((event) => !event.resolved).length || 0;

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
    return <main className="workspace-loading" role="status" aria-live="polite"><span className="workspace-loading-mark"><Image src="/brand/logo.svg" alt="" width={38} height={38}/></span><strong>{loadError ? "অনলাইন তথ্য খোলা যায়নি" : "তোমার ব্যক্তিগত তথ্য প্রস্তুত করা হচ্ছে"}</strong><span>{loadError || "Supabase থেকে তোমার ব্যক্তিগত রেকর্ড আনা হচ্ছে।"}</span>{loadError ? <button className="button-primary" type="button" onClick={() => window.location.reload()}>আবার চেষ্টা করো</button> : <i/>}</main>;
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
        <header className="workspace-topbar"><div className="mobile-brand"><BrandMark compact/><strong>Amar Nfser Hisab</strong></div><div className="topbar-context"><span className="breadcrumb-root">আমার পরিসর</span><ChevronRight size={14}/><strong>{selected.label}</strong></div><div className="topbar-right"><span className={`local-mode-label cloud-status-${getCloudSyncState()}`}><span/>{getCloudSyncState() === "synced" ? "অনলাইনে সংরক্ষিত" : getCloudSyncState() === "syncing" || getCloudSyncState() === "loading" ? "অনলাইনে সংরক্ষণ হচ্ছে" : getCloudSyncState() === "offline" ? "অফলাইন · সংরক্ষিত নয়" : getCloudSyncState() === "error" ? "অনলাইন সংরক্ষণে সমস্যা" : "অনলাইন সংরক্ষণ প্রস্তুত"}</span><button className="topbar-icon-button" type="button" onClick={() => navigateSection("notifications")} aria-label="নোটিফিকেশন"><Bell size={18}/>{unreadCount > 0 && <i/>}</button><button className="topbar-icon-button mobile-settings-shortcut" type="button" onClick={() => navigateSection("settings")} aria-label="নোটিফিকেশন ও অ্যাপ সেটিংস"><Settings size={18}/></button><button className="topbar-icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="থিম পরিবর্তন">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><span className="topbar-avatar" title={displayName}>{getInitials(displayName)}</span></div></header>
        <div className="workspace-content">
          <div className="view-date-strip"><span>{formatLongDate(day, data.preferences.timeZone)}</span><span className="date-strip-divider"/><span>{getHijriLabel(day)} হিজরি</span><span className="date-strip-divider"/><span>{getCloudSyncState() === "synced" ? <Cloud size={13}/> : <CloudOff size={13}/>} {getCloudSyncState() === "synced" ? "অনলাইনে সংরক্ষিত" : getCloudSyncState() === "syncing" || getCloudSyncState() === "loading" ? "অনলাইনে সংরক্ষণ হচ্ছে" : getCloudSyncState() === "offline" ? "সংযোগ নেই · সংরক্ষিত নয়" : "অনলাইন সংরক্ষণে সমস্যা"}</span></div>
          {section === "home" && <DashboardView data={data}/>} 
          {section === "goals" && <GoalsView data={data}/>} 
          {section === "journal" && <JournalView data={data}/>} 
          {section === "mirror" && <MirrorView data={data}/>} 
          {section === "notifications" && <NotificationsView data={data}/>} 
          {section === "settings" && <SettingsView data={data}/>} 
          <footer className="workspace-footer"><span>Amar Nfser Hisab</span><span>নিজেকে বোঝা · নিজেকে গড়া</span></footer>
        </div>
      </main>
      <nav className="mobile-navigation" aria-label="মোবাইল প্রধান বিভাগ">{NAV_ITEMS.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={section === item.id ? "active" : ""} onClick={() => navigateSection(item.id)}><Icon size={19}/><span>{item.shortLabel}</span></button>; })}<button type="button" className={section === "settings" ? "active" : ""} onClick={() => navigateSection("settings")}><MoreHorizontal size={19}/><span>আরও</span></button></nav>
    </div>
    </>
  );
}
