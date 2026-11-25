"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, Clock3, Compass, MoonStar, Sparkles, Target, TrendingUp } from "lucide-react";
import { formatBengaliDate, getReligiousDateKey } from "@/lib/date/religious-date";
import { formatHijriDate } from "@/lib/date/hijri";

const sections = {
  goals: { eyebrow: "পরিকল্পনা ও অগ্রগতি", title: "লক্ষ্য ও সময়সীমা", description: "তওবা ও আত্মশুদ্ধির সফর এবং ইলম ও অর্জনের পরিকল্পনা।", icon: Target },
  journal: { eyebrow: "দৈনিক রেকর্ড", title: "আত্মশুদ্ধি লিপি", description: "সালাত, সিয়াম, কুরআন, জিকির, ভালো কাজ এবং ব্যক্তিগত জার্নাল।", icon: BookOpen },
  mirror: { eyebrow: "বিশ্লেষণ ও প্রতিফলন", title: "নফস আয়না", description: "দৈনিক, সাপ্তাহিক, মাসিক ও বাৎসরিক তথ্য থেকে নির্ভরযোগ্য রিপোর্ট।", icon: Compass }
} as const;
type SectionKey = keyof typeof sections;
export type DashboardSummary = {
  trackingReady: boolean;
  prayerEntries: { prayerName: string; method: string }[];
  prayerLogged: number;
  prayerDone: number;
  goodDeeds: number;
  badDeeds: number;
  activeGoals: number;
  nextGoal: { id: string; title: string; deadline: string } | null;
  journeyStartDate: string | null;
  journeyTitle: string | null;
  pendingQada: number;
};

function DateHeading({ dateKey: initialDateKey, timeZone, maghribTime, hijriAdjustmentDays }: { dateKey: string; timeZone: string; maghribTime: string | null; hijriAdjustmentDays: number }) {
  const [dateKey, setDateKey] = useState(initialDateKey);
  useEffect(() => {
    const update = () => setDateKey(getReligiousDateKey(new Date(), timeZone, maghribTime).dateKey);
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [timeZone, maghribTime]);
  const dateAtNoonUtc = new Date(`${dateKey}T12:00:00.000Z`);
  const gregorian = `${new Intl.DateTimeFormat("bn-BD", { timeZone: "UTC", weekday: "long" }).format(dateAtNoonUtc)}, ${formatBengaliDate(dateKey)}`;
  const hijri = formatHijriDate(dateKey, hijriAdjustmentDays);
  return <div className="date-meta"><span><CalendarDays size={15} /> {gregorian}</span><span className="date-separator">·</span><span>{hijri}</span></div>;
}

function StatCard({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string; detail: string; icon: typeof CheckCircle2; tone?: string }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div><strong>{value}</strong><small>{detail}</small></article>;
}

function DashboardHome({ journalDate, timeZone, maghribTime, summary, hijriAdjustmentDays }: { journalDate: string; timeZone: string; maghribTime: string | null; summary: DashboardSummary; hijriAdjustmentDays: number }) {
  const router = useRouter();
  const [liveJournalDate, setLiveJournalDate] = useState(journalDate);
  const daysInJourney = summary.journeyStartDate ? Math.max(0, Math.floor((new Date(`${liveJournalDate}T12:00:00`).getTime() - new Date(`${summary.journeyStartDate}T12:00:00`).getTime()) / 86_400_000)) : null;
  const dateRemaining = summary.nextGoal ? Math.ceil((new Date(`${summary.nextGoal.deadline}T12:00:00`).getTime() - new Date(`${liveJournalDate}T12:00:00`).getTime()) / 86_400_000) : null;
  const prayerNames = [{ id: "fajr", name: "ফজর" }, { id: "dhuhr", name: "যোহর" }, { id: "asr", name: "আসর" }, { id: "maghrib", name: "মাগরিব" }, { id: "isha", name: "ইশা" }];
  useEffect(() => {
    let lastDate = journalDate;
    const update = () => {
      const nextDate = getReligiousDateKey(new Date(), timeZone, maghribTime).dateKey;
      if (nextDate !== lastDate) { lastDate = nextDate; setLiveJournalDate(nextDate); router.refresh(); }
    };
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [journalDate, timeZone, maghribTime, router]);

  return <>
    <section className="welcome-row"><div><div className="eyebrow">ব্যক্তিগত মুহাসাবা</div><h1>আজকের মুহাসাবা</h1><DateHeading dateKey={liveJournalDate} timeZone={timeZone} maghribTime={maghribTime} hijriAdjustmentDays={hijriAdjustmentDays} /></div>
      <Link className="journey-pill journey-link" href="/goals"><span className="journey-dot" /> {daysInJourney === null ? "আত্মশুদ্ধির যাত্রা শুরু করো" : `${daysInJourney.toLocaleString("bn-BD")} দিন · ${summary.journeyTitle || "আত্মশুদ্ধির যাত্রা"}`}</Link>
    </section>
    <section className="daily-quote-card"><div className="quote-icon"><BookOpen size={19} /></div><div className="quote-content"><span className="section-kicker">আজকের স্মরণিকা</span><p>নিজের কাজের হিসাব রাখা, ভুল থেকে শিক্ষা নেওয়া এবং প্রতিদিন উত্তম হওয়ার চেষ্টা—এটাই মুহাসাবার পথ।</p><div className="quote-source">ব্যক্তিগত স্মরণিকা · নমুনা বার্তা</div></div><Sparkles className="quote-sparkle" size={22} /></section>

    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">আজকের এক নজর</span><h2>আজকের সারাংশ</h2></div><span className="soft-label">{summary.trackingReady ? "সংরক্ষিত রেকর্ড" : "প্রয়োজনীয় রেকর্ড এখনো তৈরি হয়নি"}</span></div>
      <div className="stats-grid">
        <StatCard label="ফরজ সালাত" value={`${summary.prayerDone.toLocaleString("bn-BD")} / ৫`} detail={`${summary.prayerLogged.toLocaleString("bn-BD")} ওয়াক্তের এন্ট্রি`} icon={CheckCircle2} />
        <StatCard label="আজকের ভালো কাজ" value={summary.goodDeeds.toLocaleString("bn-BD")} detail={`অনাকাঙ্ক্ষিত কাজ ${summary.badDeeds.toLocaleString("bn-BD")}`} icon={ArrowUpRight} tone="blue" />
        <StatCard label="কাজা সালাত বাকি" value={summary.pendingQada.toLocaleString("bn-BD")} detail="পৃথক কাজা হিসাব" icon={Clock3} tone="gold" />
        <StatCard label="চলমান লক্ষ্য" value={summary.activeGoals.toLocaleString("bn-BD")} detail="ইলম ও অর্জনের পরিকল্পনা" icon={Target} tone="violet" />
      </div>
    </section>

    <section className="dashboard-grid">
      <article className="panel prayer-panel"><div className="panel-heading"><div><span className="eyebrow">দৈনিক ইবাদত</span><h2>আজকের সালাত</h2></div><span className="panel-icon"><MoonStar size={18} /></span></div>
        <div className="dashboard-prayer-list">{prayerNames.map((prayer) => { const record = summary.prayerEntries.find((entry) => entry.prayerName === prayer.id); const label = !record ? "রেকর্ড হয়নি" : record.method === "missed" ? "আদায় হয়নি" : record.method === "jamaat" ? "জামাতে" : "একাকী"; return <div className="dashboard-prayer-row" key={prayer.id}><span>{prayer.name}</span><span className={record ? record.method === "missed" ? "record-dot missed" : "record-dot recorded" : "record-dot"}>{label}</span></div>; })}</div>
        <div className="panel-action-row"><span className="panel-footnote">সময়সূচি ও জামাতের সময় আলাদা।</span><Link className="text-button" href="/journal">সালাতের হিসাব <ArrowUpRight size={14} /></Link></div>
      </article>

      <article className="panel goals-panel"><div className="panel-heading"><div><span className="eyebrow">তোমার যাত্রা</span><h2>চলমান লক্ষ্য</h2></div><span className="panel-icon gold-icon"><Target size={18} /></span></div>
        {summary.nextGoal ? <div className="dashboard-next-goal"><strong>{summary.nextGoal.title}</strong><span>শেষ করার তারিখ: {new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${summary.nextGoal.deadline}T12:00:00`))}</span><b>{dateRemaining !== null && dateRemaining < 0 ? `${Math.abs(dateRemaining).toLocaleString("bn-BD")} দিন সময় পেরিয়েছে` : dateRemaining === 0 ? "আজ শেষ দিন" : `${dateRemaining?.toLocaleString("bn-BD")} দিন বাকি`}</b></div> : <div className="empty-goal-state"><div className="goal-orbit"><div><Compass size={24} /></div></div><strong>প্রথম লক্ষ্য এখনো তৈরি হয়নি</strong><p>লক্ষ্য ও সময়সীমার সারাংশ এখানে দেখা যাবে।</p></div>}
        <div className="panel-action-row"><span className="panel-footnote">{summary.activeGoals.toLocaleString("bn-BD")}টি সক্রিয় লক্ষ্য</span><Link className="text-button" href="/goals">লক্ষ্য দেখো <ArrowUpRight size={14} /></Link></div>
      </article>
    </section>
    <section className="bottom-grid">
      <Link className="panel mini-panel mini-panel-link" href="/journal"><div className="mini-panel-icon"><BookOpen size={18} /></div><div><strong>কুরআন ও জিকির</strong><p>দৈনিক তিলাওয়াত ও জিকিরের রেকর্ড তৈরি করো।</p></div><span className="coming-soon">এন্ট্রি যোগ <ArrowUpRight size={13} /></span></Link>
      <Link className="panel mini-panel mini-panel-link" href="/journal"><div className="mini-panel-icon amber-mini"><TrendingUp size={18} /></div><div><strong>সাম্প্রতিক প্রতিফলন</strong><p>নিজের জার্নাল ও পরিবর্তনের নোট সংরক্ষণ করো।</p></div><span className="coming-soon">জার্নাল <ArrowUpRight size={13} /></span></Link>
    </section>
    <div className="rollover-note"><MoonStar size={16} /><span>{maghribTime ? "মাগরিবের পর থেকে পরবর্তী মুহাসাবার দিন গণনা হচ্ছে।" : "মাগরিবের সময় নির্ধারণ না হওয়ায় আপাতত সাধারণ তারিখ ব্যবহার হচ্ছে। সেটিংসে স্থানীয় সময় নির্ধারণ করো।"}</span></div>
  </>;
}

function ModulePreview({ section }: { section: SectionKey }) {
  const item = sections[section]; const Icon = item.icon;
  return <section className="module-preview panel"><div className="module-preview-icon"><Icon size={27} /></div><span className="eyebrow">{item.eyebrow}</span><h1>{item.title}</h1><p>{item.description}</p><div className="phase-tag"><span /> ব্যক্তিগত বিভাগ</div><div className="preview-feature-row"><div><CheckCircle2 size={17} /><span>ডেটাবেজ কাঠামো সম্প্রসারণযোগ্য</span></div><div><CheckCircle2 size={17} /><span>একই তারিখ ও ব্যবহারকারী নিরাপত্তা নীতি</span></div><div><CheckCircle2 size={17} /><span>পরবর্তী মডিউল আরও যুক্ত হবে</span></div></div></section>;
}

export function DashboardContent({ journalDate, timeZone, maghribTime, summary, hijriAdjustmentDays }: { journalDate: string; timeZone: string; maghribTime: string | null; summary: DashboardSummary; hijriAdjustmentDays: number }) {
  const searchParams = useSearchParams();
  const rawSection = searchParams.get("section");
  const section = rawSection && rawSection in sections ? rawSection as SectionKey : null;
  return section ? <ModulePreview section={section} /> : <DashboardHome journalDate={journalDate} timeZone={timeZone} maghribTime={maghribTime} summary={summary} hijriAdjustmentDays={hijriAdjustmentDays} />;
}
