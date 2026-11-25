"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2,
  Clock3, Compass, HeartHandshake, LineChart, MoonStar, RefreshCw, Scale,
  ShieldCheck, Sparkles, Target, TrendingUp, Waves
} from "lucide-react";
import type { NafsReport, NafsMetricSummary, NafsTrendPoint } from "@/modules/nafs-mirror/report";

type RangeOption = "7d" | "30d" | "90d" | "365d";

const bn = (value: number) => value.toLocaleString("bn-BD");
const moodNames: Record<string, string> = {
  peaceful: "প্রশান্ত", grateful: "কৃতজ্ঞ", hopeful: "আশাবাদী", neutral: "স্বাভাবিক",
  stressed: "চাপগ্রস্ত", sad: "মন খারাপ", tired: "ক্লান্ত"
};

function MetricCard({ label, value, detail, icon: Icon, tone = "green" }: {
  label: string; value: string; detail: string; icon: typeof Activity; tone?: string;
}) {
  return <article className={`stat-card tone-${tone} analytics-stat`}>
    <div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div>
    <strong>{value}</strong><small>{detail}</small>
  </article>;
}

function TrendLine({ trend }: { trend: NafsTrendPoint[] }) {
  const points = useMemo(() => {
    if (!trend.length) return "";
    const left = 34, right = 664, top = 16, bottom = 142;
    return trend.map((item, index) => {
      const x = trend.length === 1 ? (left + right) / 2 : left + (index / (trend.length - 1)) * (right - left);
      const y = bottom - (Math.max(0, Math.min(100, item.prayerRate)) / 100) * (bottom - top);
      return `${x},${y}`;
    }).join(" ");
  }, [trend]);
  const labels = trend.length > 8 ? [trend[0], trend[Math.floor(trend.length / 2)], trend[trend.length - 1]] : trend;
  return <div className="analytics-chart-wrap">
    {trend.length ? <svg className="analytics-line-chart" viewBox="0 0 700 180" role="img" aria-label="সালাতের রেকর্ডভিত্তিক পূর্ণতার হার">
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}>
        <line x1="34" x2="664" y1={142 - tick * 1.26} y2={142 - tick * 1.26} className="chart-gridline" />
        <text x="25" y={146 - tick * 1.26} textAnchor="end" className="chart-axis-label">{tick}%</text>
      </g>)}
      <polyline points={points} className="chart-prayer-line" />
      {trend.map((item, index) => {
        const x = trend.length === 1 ? 349 : 34 + (index / (trend.length - 1)) * 630;
        const y = 142 - (Math.max(0, Math.min(100, item.prayerRate)) / 100) * 126;
        return <circle key={item.key} cx={x} cy={y} r="3.5" className="chart-prayer-dot"><title>{item.label}: {bn(item.prayerRate)}%</title></circle>;
      })}
    </svg> : <div className="analytics-empty-chart">এই সময়সীমায় এখনো কোনো সালাতের রেকর্ড নেই।</div>}
    <div className="chart-label-row">{labels.map((item) => <span key={item.key}>{item.label}</span>)}</div>
  </div>;
}

function DeedBars({ trend }: { trend: NafsTrendPoint[] }) {
  const visible = trend.length > 14 ? trend.filter((_, index) => index % Math.ceil(trend.length / 14) === 0 || index === trend.length - 1) : trend;
  const max = Math.max(1, ...visible.flatMap((item) => [item.goodDeeds, item.badDeeds]));
  return <div className="deed-bars">
    {visible.length ? visible.map((item) => <div className="deed-bar-group" key={item.key} title={`${item.label}: ভালো ${bn(item.goodDeeds)}, অনাকাঙ্ক্ষিত ${bn(item.badDeeds)}`}>
      <div className="deed-bar-pair">
        <span className="deed-bar good" style={{ height: `${Math.max(item.goodDeeds ? 5 : 0, item.goodDeeds / max * 100)}%` }} />
        <span className="deed-bar bad" style={{ height: `${Math.max(item.badDeeds ? 5 : 0, item.badDeeds / max * 100)}%` }} />
      </div>
      <small>{item.label}</small>
    </div>) : <div className="analytics-empty-chart">এই সময়সীমায় কোনো কাজের রেকর্ড নেই।</div>}
  </div>;
}

function ActivityBars({ trend, metric }: { trend: NafsTrendPoint[]; metric: "quranPages" | "dhikrCount" }) {
  const visible = trend.length > 14 ? trend.filter((_, index) => index % Math.ceil(trend.length / 14) === 0 || index === trend.length - 1) : trend;
  const maximum = Math.max(0, ...visible.map((item) => item[metric]));
  return <div className="deed-bars activity-bars">
    {maximum > 0 ? visible.map((item) => {
      const value = item[metric];
      return <div className="deed-bar-group" key={item.key} title={`${item.label}: ${bn(value)}`}>
        <div className="deed-bar-pair"><span className={`deed-bar ${metric === "quranPages" ? "quran" : "dhikr"}`} style={{ height: `${Math.max(value ? 5 : 0, value / maximum * 100)}%` }} /></div>
        <small>{item.label}</small>
      </div>;
    }) : <div className="analytics-empty-chart">এই সময়সীমায় কোনো রেকর্ড নেই।</div>}
  </div>;
}

function ComparisonPanel({ current, previous }: { current: NafsMetricSummary; previous: NafsMetricSummary }) {
  const rows = [
    { label: "সালাত পূর্ণতার হার", now: current.prayerCompletionRate, before: previous.prayerCompletionRate, suffix: "%", precision: 1 },
    { label: "ভালো কাজ", now: current.goodDeeds, before: previous.goodDeeds, suffix: "", precision: 0 },
    { label: "অনাকাঙ্ক্ষিত কাজের এন্ট্রি", now: current.badDeeds, before: previous.badDeeds, suffix: "", precision: 0 },
    { label: "কুরআন পৃষ্ঠা", now: current.quranPages, before: previous.quranPages, suffix: "", precision: 0 },
    { label: "জিকির সংখ্যা", now: current.dhikrCount, before: previous.dhikrCount, suffix: "", precision: 0 }
  ];
  const fmt = (n: number, precision: number) => n.toLocaleString("bn-BD", { minimumFractionDigits: precision, maximumFractionDigits: precision });
  return <section className="panel analytics-panel">
    <div className="panel-heading"><div><span className="eyebrow">সময়ের তুলনা</span><h2>আগের সময়ের সঙ্গে তুলনা</h2></div><span className="panel-icon"><TrendingUp size={18} /></span></div>
    <div className="comparison-grid">{rows.map((row) => {
      const diff = row.now - row.before;
      return <div className="comparison-item" key={row.label}>
        <span>{row.label}</span><strong>{fmt(row.now, row.precision)}{row.suffix}</strong>
        <small className={row.label === "সালাত পূর্ণতার হার" && diff > 0 ? "comparison-up" : ""}>
          {diff > 0 ? <ArrowUpRight size={13} /> : diff < 0 ? <ArrowDownRight size={13} /> : null}
          আগের সময়ের তুলনায় {diff > 0 ? "+" : ""}{fmt(diff, row.precision)}{row.suffix}
        </small>
      </div>;
    })}</div>
    <p className="analytics-footnote">এটি কেবল সংরক্ষিত রেকর্ডের পরিমাণ ও হার তুলনা করে; কোনো কাজের ধর্মীয় মূল্যায়ন নয়।</p>
  </section>;
}

export function AnalyticsWorkspace({ initialReport }: { initialReport: NafsReport }) {
  const [report, setReport] = useState(initialReport);
  const [from, setFrom] = useState(initialReport.range.from);
  const [to, setTo] = useState(initialReport.range.to);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(query: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/analytics?${query}${query ? "&" : ""}compare=${compare}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "রিপোর্ট লোড করা যায়নি।");
      setReport(result as NafsReport);
      setFrom(result.range.from); setTo(result.range.to);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "রিপোর্ট লোড করা যায়নি।");
    } finally { setBusy(false); }
  }

  function selectRange(value: RangeOption) {
    void load(`range=${value}`);
  }

  function applyCustomRange() {
    if (!from || !to) { setError("শুরু ও শেষ তারিখ নির্বাচন করো।"); return; }
    void load(`from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  function toggleCompare(value: boolean) {
    setCompare(value);
    setBusy(true); setError("");
    const query = `from=${encodeURIComponent(report.range.from)}&to=${encodeURIComponent(report.range.to)}&compare=${value}`;
    fetch(`/api/analytics?${query}`, { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.message || "তুলনামূলক রিপোর্ট তৈরি হয়নি।"); setReport(result as NafsReport); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "তুলনামূলক রিপোর্ট তৈরি হয়নি।"))
      .finally(() => setBusy(false));
  }

  const s = report.summary;
  const taskRate = s.tasksTotal ? Math.round((s.tasksCompleted / s.tasksTotal) * 100) : 0;

  return <div className="analytics-workspace">
    <section className="welcome-row analytics-welcome">
      <div><div className="eyebrow">ব্যক্তিগত উপলব্ধি ও পর্যালোচনা</div><h1>নফস আয়না</h1><div className="date-meta"><span><CalendarDays size={15} /> {report.range.from} — {report.range.to}</span><span className="date-separator">·</span><span>তোমার সংরক্ষিত তথ্যের বিশ্লেষণ</span></div></div>
      <span className="journey-pill"><span className="journey-dot" /> {s.journeyDays === null ? "যাত্রা শুরু নির্ধারিত নয়" : `${bn(s.journeyDays)} দিন চলমান`}</span>
    </section>

    <section className="panel analytics-filter-panel">
      <div className="analytics-range-row">
        <div className="range-segment" role="group" aria-label="রিপোর্টের সময়সীমা">
          {([ ["7d", "৭ দিন"], ["30d", "৩০ দিন"], ["90d", "৯০ দিন"], ["365d", "১ বছর"] ] as [RangeOption, string][]).map(([key, label]) => <button key={key} type="button" className={`range-button ${report.range.days === Number(key.slice(0, -1)) && !busy ? "active" : ""}`} onClick={() => selectRange(key)} disabled={busy}>{label}</button>)}
        </div>
        <label className="compare-toggle"><input type="checkbox" checked={compare} onChange={(event) => toggleCompare(event.target.checked)} /> আগের সময়ের সঙ্গে তুলনা</label>
      </div>
      <div className="analytics-custom-range">
        <label>শুরু <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>শেষ <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
        <button type="button" className="secondary-button" onClick={applyCustomRange} disabled={busy}><CalendarDays size={15} /> সময়সীমা প্রয়োগ</button>
        {busy && <span className="inline-status"><RefreshCw size={14} className="spin-icon" /> আপডেট হচ্ছে</span>}
      </div>
      {error && <p className="form-error analytics-error">{error}</p>}
    </section>

    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">AT A GLANCE</span><h2>সময়ের সারাংশ</h2></div><span className="soft-label">{bn(report.range.days)} দিনের তথ্য</span></div>
      <div className="stats-grid analytics-stats-grid">
        <MetricCard label="ফরজ সালাত আদায়" value={`${bn(s.prayerCompleted)} / ${bn(s.prayerExpected)}`} detail={`মিস ${bn(s.prayerMissed)} · রেকর্ড পূর্ণতার হার ${bn(s.prayerCompletionRate)}%`} icon={MoonStar} />
        <MetricCard label="তাকবিরে উলা" value={bn(s.takbirUla)} detail={`জামাতে মোট ${bn(s.jamaat)} ওয়াক্ত`} icon={CheckCircle2} tone="blue" />
        <MetricCard label="টানা তাকবিরে উলা" value={`${bn(s.currentTakbirUlaStreak)} / ৪০`} detail={`এই পরিসরে সম্পূর্ণ দিন ${bn(s.takbirUlaFullDays)}টি`} icon={Target} tone="violet" />
        <MetricCard label="কাজা বাকি" value={bn(s.pendingQada)} detail={`এই পর্যন্ত আদায় ${bn(s.settledQada)}টি`} icon={Clock3} tone="gold" />
        <MetricCard label="ভালো কাজ" value={bn(s.goodDeeds)} detail={`অনাকাঙ্ক্ষিত কাজের এন্ট্রি ${bn(s.badDeeds)}টি`} icon={HeartHandshake} tone="violet" />
        <MetricCard label="কুরআন তিলাওয়াত" value={bn(s.quranPages)} detail={`${bn(s.quranSessions)} সেশন · ${bn(s.quranMinutes)} মিনিট`} icon={BookOpen} tone="blue" />
        <MetricCard label="জিকির গণনা" value={bn(s.dhikrCount)} detail={`${bn(s.dhikrSessions)}টি সেশন`} icon={Activity} />
        <MetricCard label="সিয়াম সম্পন্ন" value={bn(s.fastingCompleted)} detail={`মিস ${bn(s.fastingMissed)} · ওজর ${bn(s.fastingExcused)}`} icon={Sparkles} tone="gold" />
        <MetricCard label="সুন্নত ও বিতর অংশ" value={bn(s.sunnahComponentsDone)} detail={`${bn(s.sunnahRakatsDone)} রাকাতের রেকর্ড`} icon={MoonStar} tone="blue" />
        <MetricCard label="মিস হওয়া রাকাত" value={bn(s.missedRakats)} detail={`দেরিতে জামাতে যোগদান ${bn(s.lateJamaat)} বার`} icon={Clock3} tone="gold" />
        <MetricCard label="জার্নাল এন্ট্রি" value={bn(s.journalEntries)} detail={`বাধা/সংগ্রাম রেকর্ড ${bn(s.obstacles)}টি`} icon={Compass} tone="violet" />
      </div>
    </section>

    <section className="analytics-chart-grid">
      <article className="panel analytics-panel">
        <div className="panel-heading"><div><span className="eyebrow">সালাতের রেকর্ড</span><h2>সালাতের রেকর্ডভিত্তিক হার</h2></div><span className="panel-icon"><LineChart size={18} /></span></div>
        <div className="chart-legend"><span><i className="legend-line" /> আদায় করা ফরজের অনুপাত</span><span className="chart-average">{bn(s.prayerCompletionRate)}%</span></div>
        <TrendLine trend={report.trend} />
        <p className="analytics-footnote">পাঁচ ওয়াক্তের রেকর্ড ধরে হিসাব করা হয়। এন্ট্রি না থাকলে আদায় হয়েছে ধরা হয় না। টানা তাকবিরে উলার জন্য পাঁচ ওয়াক্তেই পূর্ণ রেকর্ড থাকতে হবে।</p>
      </article>
      <article className="panel analytics-panel">
        <div className="panel-heading"><div><span className="eyebrow">ভালো ও অনাকাঙ্ক্ষিত কাজ</span><h2>কাজের রেকর্ড</h2></div><span className="panel-icon gold-icon"><Scale size={18} /></span></div>
        <div className="chart-legend"><span><i className="legend-dot good" /> ভালো কাজ</span><span><i className="legend-dot bad" /> অনাকাঙ্ক্ষিত কাজ</span></div>
        <DeedBars trend={report.trend} />
        <p className="analytics-footnote">শুধু এন্ট্রির সংখ্যা দেখানো হচ্ছে; ধর্মীয় মূল্যায়ন নয়।</p>
      </article>
    </section>

    <section className="analytics-chart-grid">
      <article className="panel analytics-panel">
        <div className="panel-heading"><div><span className="eyebrow">কুরআন তেলাওয়াতের ধারা</span><h2>কুরআন তিলাওয়াত</h2></div><span className="panel-icon"><BookOpen size={18} /></span></div>
        <div className="chart-legend"><span><i className="legend-dot quran" /> প্রতি সময়-বিভাগে পৃষ্ঠা</span><strong className="chart-average">{bn(s.quranPages)} পৃষ্ঠা</strong></div>
        <ActivityBars trend={report.trend} metric="quranPages" />
        <p className="analytics-footnote">শুধু পৃষ্ঠা-পরিসর দেওয়া সেশন গণনায় এসেছে।</p>
      </article>
      <article className="panel analytics-panel">
        <div className="panel-heading"><div><span className="eyebrow">জিকিরের ধারা</span><h2>জিকিরের হিসাব</h2></div><span className="panel-icon gold-icon"><Activity size={18} /></span></div>
        <div className="chart-legend"><span><i className="legend-dot dhikr" /> প্রতি সময়-বিভাগে গণনা</span><strong className="chart-average">{bn(s.dhikrCount)}</strong></div>
        <ActivityBars trend={report.trend} metric="dhikrCount" />
        <p className="analytics-footnote">টেমপ্লেট ও নিজস্ব—দুই ধরনের জিকির অন্তর্ভুক্ত।</p>
      </article>
    </section>

    <section className="analytics-chart-grid">
      <article className="panel analytics-panel">
        <div className="panel-heading"><div><span className="eyebrow">লক্ষ্য ও শেখা</span><h2>লক্ষ্য অর্জনের অবস্থা</h2></div><span className="panel-icon"><Target size={18} /></span></div>
        <div className="goal-analytics-stats"><div><strong>{bn(s.activeGoals)}</strong><span>চলমান লক্ষ্য</span></div><div><strong>{bn(s.completedGoals)}</strong><span>এই সময়ে সম্পন্ন</span></div><div><strong>{bn(s.tasksCompleted)} / {bn(s.tasksTotal)}</strong><span>সম্পন্ন উপধাপ</span></div></div>
        <div className="progress-track"><span style={{ width: `${taskRate}%` }} /></div>
        <p className="analytics-footnote">উপধাপ সম্পন্ন: {bn(taskRate)}% · সব সংরক্ষিত উপধাপের ভিত্তিতে।</p>
      </article>
      <article className="panel analytics-panel">
        <div className="panel-heading"><div><span className="eyebrow">মুহাসাবা ও উদ্যম</span><h2>দৈনিক প্রতিফলন</h2></div><span className="panel-icon gold-icon"><Waves size={18} /></span></div>
        <div className="energy-card"><strong>{s.averageEnergy === null ? "—" : `${bn(s.averageEnergy)} / ৫`}</strong><span>গড় উদ্যম</span></div>
        <div className="mood-list">{report.moodDistribution.length ? report.moodDistribution.map((item) => <div className="mood-row" key={item.mood}><span>{moodNames[item.mood] || item.mood}</span><div className="progress-track"><span style={{ width: `${Math.max(3, item.count / Math.max(1, report.moodDistribution[0].count) * 100)}%` }} /></div><b>{bn(item.count)}</b></div>) : <p className="analytics-empty-inline">এই সময়ে অনুভূতির রেকর্ড নেই।</p>}</div>
        <p className="analytics-footnote">মুড ও এনার্জি তোমার জার্নাল তথ্যের সারাংশ।</p>
      </article>
    </section>

    {report.comparison && <ComparisonPanel current={s} previous={report.comparison.summary} />}

    <section className="panel analytics-note-panel">
      <span className="panel-icon"><ShieldCheck size={18} /></span>
      <div><strong>তথ্যভিত্তিক আত্মপর্যালোচনা</strong><p>এই রিপোর্ট কেবল তোমার সংরক্ষিত এন্ট্রি থেকে গাণিতিক সারাংশ তৈরি করে। অনুপস্থিত তথ্যকে নিশ্চিতভাবে অনুপস্থিত কাজ হিসেবে ব্যাখ্যা করে না এবং ঈমান, ইখলাস বা চরিত্রের চূড়ান্ত মূল্যায়ন করে না।</p></div>
      <span className="report-timestamp">আপডেট: {new Date(report.generatedAt).toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit" })}</span>
    </section>
  </div>;
}
