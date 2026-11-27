"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import {
  ArrowLeft, ArrowRight, BookMarked, BookOpen, Check, CheckCircle2,
  ChevronRight, Clock3, Compass, Heart, MoonStar, Plus, Save,
  Search, ShieldCheck, Sparkles, Trash2, TrendingUp, X, Pencil
} from "lucide-react";
import { SURAHS } from "@/modules/journal/surahs";
import {
  createWorkspaceRecordId, getWorkspaceData, getJournalDate, PRAYER_NAMES, updateWorkspaceData,
  flushWorkspaceChanges, getCloudSyncState, getCloudSyncMessage,
  type AvoidEntry, type DeedEntry, type DhikrSession, type FastingEntry,
  type HabitDefinition, type HabitLog, type WorkspaceData, type PrayerComponentResult,
  type PrayerEntry, type PrayerId,
  type QuranEntry, type ReflectionEntry, type TrackerKind, type ExtraPrayerEntry
} from "@/lib/workspace/store";
import { getDhakaDateTimeInput, getPrayerCivilDate, toDhakaIso } from "@/lib/prayer-time";

type IconType = typeof MoonStar;
type TrackerMeta = { id: TrackerKind; title: string; short: string; description: string; icon: IconType; hint: string };
const TRACKERS: TrackerMeta[] = [
  { id: "prayer", title: "সালাত ট্র্যাকার", short: "সালাত", description: "ওয়াক্ত, রাকাত, জামাত ও কাজার হিসাব।", icon: MoonStar, hint: "ধাপে ধাপে তথ্য দাও।" },
  { id: "quran", title: "কুরআন তেলাওয়াত", short: "কুরআন", description: "সূরা, আয়াত, পৃষ্ঠা ও পারার হিসাব।", icon: BookOpen, hint: "এক দিনে একাধিক এন্ট্রি করা যাবে।" },
  { id: "dhikr", title: "জিকির ও তাসবিহ", short: "জিকির", description: "সকাল-সন্ধ্যা ও নিজের পছন্দের জিকির।", icon: Sparkles, hint: "এক ট্যাপে গণনা; শেষে সংরক্ষণ।" },
  { id: "fasting", title: "সিয়াম ট্র্যাকার", short: "সিয়াম", description: "ফরজ, নফল ও কাজা রোজার হিসাব।", icon: MoonStar, hint: "তারিখ অনুযায়ী হিসাব রাখো।" },
  { id: "good", title: "ভালো কাজ", short: "ভালো কাজ", description: "ক্যাটাগরি বা নিজের তৈরি ভালো কাজ।", icon: Heart, hint: "নিজের ভালো কাজের রেকর্ড রাখো।" },
  { id: "avoid", title: "অনাকাঙ্ক্ষিত অভ্যাস", short: "আত্মসংযম", description: "ব্যক্তিগত আত্মসংযমের লগ; কোনো বিচার নয়।", icon: ShieldCheck, hint: "ঘটনা, উপলব্ধি ও পরের পদক্ষেপ লেখো।" },
  { id: "ilm", title: "ইলম ও অধ্যয়ন", short: "ইলম", description: "বই, পাঠ, সময় ও শেখার নোট।", icon: BookMarked, hint: "পড়া ও শোনা—দুই ধরনের নোট।" },
  { id: "habit", title: "ব্যক্তিগত অভ্যাস", short: "অভ্যাস", description: "নিজের অভ্যাস ও দৈনিক অগ্রগতি।", icon: TrendingUp, hint: "নিজের অভ্যাস নিজেই যোগ করো।" },
  { id: "reflection", title: "আত্মসমালোচনা ও মুহাসাবা", short: "মুহাসাবা", description: "দিনের পর্যালোচনা ও আগামী দিনের সংকল্প।", icon: Compass, hint: "দিনের অভিজ্ঞতা লিখে রাখো।" }
];
const PRAYERS: PrayerId[] = ["maghrib", "isha", "fajr", "dhuhr", "asr"];
const CATEGORY_LABELS = { sunnah: "সুন্নত", fard: "ফরজ", wajib: "ওয়াজিব", nafl: "নফল" } as const;
const GOOD_CATEGORIES = ["সদকা ও দান", "কাউকে সাহায্য", "আত্মীয়তার সম্পর্ক", "উপকারী জ্ঞান", "সুন্দর আচরণ", "অন্য ভালো কাজ"];
const AVOIDANCE_STATUSES = [{ value: "avoided", label: "এড়িয়ে থাকতে পেরেছি" }, { value: "challenging", label: "কঠিন পরিস্থিতি এসেছে" }, { value: "slipped", label: "পরিকল্পনা অনুযায়ী হয়নি" }] as const;
const today = () => { const data = getWorkspaceData(); return getJournalDate(new Date(), data.preferences.timeZone || "Asia/Dhaka", data.preferences.maghribTime || null); };
const bn = (value: number) => value.toLocaleString("bn-BD");
function formatTrackerDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`));
}
const makeId = () => createWorkspaceRecordId();
function isFutureInstant(value: Date): boolean { return value.getTime() > Date.now(); }

function Panel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="tracker-panel"><header className="tracker-panel-heading"><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action}</header>{children}</section>;
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="tracker-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function TextInput(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="tracker-input" {...props}/>; }
function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className="tracker-input tracker-textarea" {...props}/>; }
function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className="tracker-input" {...props}/>; }
function SaveButton({ children = "সংরক্ষণ", disabled = false }: { children?: ReactNode; disabled?: boolean }) { return <button className="tracker-primary-button" type="submit" disabled={disabled}><Save size={16}/>{children}</button>; }
function Notice({ children, type = "success" }: { children: ReactNode; type?: "success" | "error" | "info" }) { return <div className={`tracker-notice ${type}`} role="status">{children}</div>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="tracker-empty"><span><BookOpen size={21}/></span><strong>{title}</strong><p>{detail}</p></div>; }
function deleteLocal(kind: TrackerKind, id: string) {
  if (!window.confirm("এই রেকর্ডটি মুছে ফেলবে?")) return;
  updateWorkspaceData((data) => {
    const copy = { ...data };
    if (kind === "prayer") copy.prayerEntries = data.prayerEntries.filter((x) => x.id !== id);
    else if (kind === "quran") copy.quranEntries = data.quranEntries.filter((x) => x.id !== id);
    else if (kind === "dhikr") copy.dhikrSessions = data.dhikrSessions.filter((x) => x.id !== id);
    else if (kind === "fasting") copy.fastingEntries = data.fastingEntries.filter((x) => x.id !== id);
    else if (kind === "good") copy.deedEntries = data.deedEntries.filter((x) => x.id !== id);
    else if (kind === "avoid") copy.avoidEntries = data.avoidEntries.filter((x) => x.id !== id);
    else if (kind === "ilm") copy.studyEntries = data.studyEntries.filter((x) => x.id !== id);
    else if (kind === "habit") copy.habitLogs = data.habitLogs.filter((x) => x.id !== id);
    else if (kind === "reflection") copy.reflections = data.reflections.filter((x) => x.id !== id);
    return copy;
  });
}

function QadaSettlementForm({ data, onCancel }: { data: WorkspaceData; onCancel: () => void }) {
  const pending = data.qadaEntries.filter((item) => item.status === "pending");
  const [selectedId, setSelectedId] = useState(pending[0]?.id || "");
  const now = getDhakaDateTimeInput();
  const [performedDate, setPerformedDate] = useState(now.date);
  const [performedTime, setPerformedTime] = useState(now.time);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const qada = pending.find((item) => item.id === selectedId);
    if (!qada) { setError("একটি বাকি কাজা নির্বাচন করো।"); return; }
    const fard = data.prayerConfig[qada.prayer].find((part) => part.category === "fard");
    if (!fard) { setError("এই ওয়াক্তের ফরজ রাকাত Configuration পাওয়া যায়নি।"); return; }
    const performedAtIso = toDhakaIso(performedDate, performedTime);
    if (!performedAtIso) { setError("কাজা আদায়ের তারিখ ও সময় সঠিকভাবে দাও।"); return; }
    const performedInstant = new Date(performedAtIso);
    if (!Number.isFinite(performedInstant.getTime()) || isFutureInstant(performedInstant)) { setError("ভবিষ্যতের তারিখ বা সময়ে কাজা আদায়ের রেকর্ড করা যাবে না।"); return; }
    const performedJournalDate = getJournalDate(performedInstant, data.preferences.timeZone, data.preferences.maghribTime || null);
    if (performedJournalDate < qada.missedDate) { setError("কাজা আদায়ের তারিখটি মিস হওয়া সালাতের দিনের আগে হতে পারে না।"); return; }
    const entry: PrayerEntry = {
      id: makeId(), date: performedJournalDate, prayer: qada.prayer, method: "qada", qadaId: qada.id,
      components: [{ partId: fard.id, label: `${PRAYER_NAMES[qada.prayer]} ফরজ কাজা`, category: "fard", plannedRakats: qada.rakats || fard.rakats, performed: true, performedRakats: qada.rakats || fard.rakats, reason: "" }],
      takbirStatus: "not-applicable", caughtRakats: qada.rakats || fard.rakats, missedRakats: 0, lateReason: "", missedReason: qada.reason,
      performedAt: performedAtIso, note: note.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    updateWorkspaceData((current) => ({
      ...current, prayerEntries: [entry, ...current.prayerEntries],
      qadaEntries: current.qadaEntries.map((item) => item.id === selectedId ? { ...item, status: "settled", settledAt: performedAtIso, settlementNote: note.trim() } : item)
    }));
    setSaved(true);
  }
  if (saved) return <div className="tracker-success"><span><CheckCircle2 size={28}/></span><h3>কাজা আদায়ের রেকর্ড সংরক্ষিত</h3><p>বাকি কাজার তালিকা থেকে এই রেকর্ডটি সম্পন্ন হিসেবে চিহ্নিত হয়েছে।</p><button className="tracker-primary-button" onClick={onCancel}>সালাত ট্র্যাকারে ফিরো</button></div>;
  return <form className="tracker-form qada-settlement-form" onSubmit={submit}>
    <div className="wizard-step-kicker">কাজা আদায়</div><h3>কোন বাকি সালাতটি আদায় করেছ?</h3>
    {pending.length ? <>
      <Field label="বাকি সালাত নির্বাচন"><Select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">নির্বাচন করো</option>{pending.map((item) => <option key={item.id} value={item.id}>{PRAYER_NAMES[item.prayer]} · {item.missedDate} · {item.reason}</option>)}</Select></Field>
      <div className="tracker-form-grid"><Field label="কাজা আদায়ের তারিখ"><TextInput type="date" value={performedDate} onChange={(event) => setPerformedDate(event.target.value)}/></Field><Field label="কাজা আদায়ের সময় (বাংলাদেশ)"><TextInput type="time" value={performedTime} onChange={(event) => setPerformedTime(event.target.value)}/></Field></div>
      <Field label="নোট (ঐচ্ছিক)"><TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)}/></Field>
      {error && <Notice type="error">{error}</Notice>}
      <div className="wizard-actions"><button type="button" className="tracker-quiet-button" onClick={onCancel}>পেছনে</button><SaveButton>কাজা আদায় সংরক্ষণ</SaveButton></div>
    </> : <><Empty title="এখন কোনো বাকি কাজা নেই" detail="ওয়াক্ত শেষের নিশ্চিতকরণে ‘আদায় করিনি’ বললে এখানে কাজা যোগ হবে।"/><button type="button" className="tracker-secondary-button" onClick={onCancel}>ফিরে যাও</button></>}
  </form>;
}

function PrayerEntryEditForm({ entry, onCancel, onSaved }: { entry: PrayerEntry; onCancel: () => void; onSaved: () => void }) {
  const initialDateTime = entry.performedAt ? getDhakaDateTimeInput(new Date(entry.performedAt)) : getDhakaDateTimeInput();
  const [method, setMethod] = useState<"jamaat" | "home" | "not-performed">(entry.method === "not-performed" ? "not-performed" : entry.method === "jamaat" ? "jamaat" : "home");
  const [performedDate, setPerformedDate] = useState(initialDateTime.date);
  const [performedTime, setPerformedTime] = useState(initialDateTime.time);
  const [takbir, setTakbir] = useState<PrayerEntry["takbirStatus"]>(entry.takbirStatus === "late-join" || entry.takbirStatus === "without-takbir" ? entry.takbirStatus : "with-takbir");
  const [caught, setCaught] = useState(String(entry.caughtRakats || 0));
  const [completedAfter, setCompletedAfter] = useState(String(entry.completedAfterRakats || 0));
  const [parts, setParts] = useState<PrayerComponentResult[]>(entry.components.map((part) => ({ ...part })));
  const [lateReason, setLateReason] = useState(entry.lateReason);
  const [missedReason, setMissedReason] = useState(entry.missedReason);
  const [note, setNote] = useState(entry.note);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function changePart(partId: string, value: string) {
    const nextValue = Math.max(0, Number(value) || 0);
    setParts((current) => current.map((part) => part.partId === partId
      ? { ...part, performedRakats: Math.min(part.plannedRakats, nextValue), performed: nextValue > 0 }
      : part));
  }

  function save(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    setError("");
    if (method !== "not-performed" && !toDhakaIso(performedDate, performedTime)) {
      setError("আদায়ের তারিখ ও সময় সঠিকভাবে দাও।");
      return;
    }
    const fardPart = parts.find((part) => part.category === "fard");
    if (!fardPart) { setError("এই রেকর্ডে ফরজ অংশ পাওয়া যায়নি।"); return; }
    const fardTotal = fardPart.plannedRakats;
    let performedFard = fardPart.performedRakats;
    let nextCaught = Number(caught) || 0;
    let nextCompletedAfter = Number(completedAfter) || 0;
    let nextTakbir = method === "jamaat" ? takbir : "not-applicable" as const;
    let nextLateReason = method === "jamaat" && takbir === "late-join" ? lateReason.trim() : "";
    let nextMissedReason = missedReason.trim();

    if (method === "not-performed") {
      performedFard = 0;
      nextCaught = 0;
      nextCompletedAfter = 0;
      nextTakbir = "not-applicable";
      nextLateReason = "";
      if (nextMissedReason.length < 2) { setError("কেন আদায় হয়নি, সংক্ষেপে লিখো।"); return; }
    } else if (method === "home") {
      performedFard = fardTotal;
      nextCaught = fardTotal;
      nextCompletedAfter = 0;
      nextTakbir = "not-applicable";
      nextLateReason = "";
      nextMissedReason = "";
    } else if (takbir === "late-join") {
      if (!Number.isInteger(nextCaught) || nextCaught < 1 || nextCaught > fardTotal) { setError("ইমামের সঙ্গে পাওয়া রাকাত সঠিকভাবে দাও।"); return; }
      if (!nextLateReason || (nextCaught + nextCompletedAfter < fardTotal && !nextMissedReason)) { setError("জামাতে যোগ দেওয়ার তথ্য ও প্রয়োজনীয় কারণ পূরণ করো।"); return; }
      nextCompletedAfter = Math.min(Math.max(0, nextCompletedAfter), fardTotal - nextCaught);
      performedFard = Math.min(fardTotal, nextCaught + nextCompletedAfter);
    } else {
      performedFard = fardTotal;
      nextCaught = fardTotal;
      nextCompletedAfter = 0;
      nextMissedReason = "";
    }

    const nextParts = parts.map((part) => part.category === "fard"
      ? { ...part, performed: performedFard > 0, performedRakats: performedFard, reason: method === "not-performed" ? nextMissedReason : method === "jamaat" && takbir === "late-join" ? [nextLateReason, nextMissedReason].filter(Boolean).join(" · ") : "" }
      : { ...part, performed: part.performedRakats > 0 });
    const missedRakats = Math.max(0, fardTotal - performedFard);
    const now = new Date().toISOString();
    const updatedEntry: PrayerEntry = {
      ...entry,
      method: method === "not-performed" ? "not-performed" : method,
      components: nextParts,
      takbirStatus: nextTakbir,
      caughtRakats: nextCaught,
      completedAfterRakats: nextCompletedAfter,
      missedRakats,
      lateReason: nextLateReason,
      missedReason: nextMissedReason,
      performedAt: method === "not-performed" ? "" : toDhakaIso(performedDate, performedTime) || "",
      note: note.trim(),
      updatedAt: now
    };
    setBusy(true);
    updateWorkspaceData((current) => {
      let qadaEntries = current.qadaEntries.filter((item) => !(item.status === "pending" && item.sourceEntryId === entry.id));
      const settledAlready = current.qadaEntries.some((item) => item.status === "settled" && item.prayer === entry.prayer && item.missedDate === entry.date);
      if (missedRakats > 0 && !settledAlready) {
        qadaEntries = [{ id: current.qadaEntries.find((item) => item.status === "pending" && item.sourceEntryId === entry.id)?.id || makeId(), prayer: entry.prayer, missedDate: entry.date, sourceEntryId: entry.id, rakats: missedRakats, reason: nextMissedReason || nextLateReason || "ফরজের কিছু রাকাত বাকি", status: "pending", settledAt: null, settlementNote: "", createdAt: current.qadaEntries.find((item) => item.status === "pending" && item.sourceEntryId === entry.id)?.createdAt || now }, ...qadaEntries];
      }
      return { ...current, prayerEntries: current.prayerEntries.map((item) => item.id === entry.id ? updatedEntry : item), qadaEntries };
    });
    setBusy(false);
    onSaved();
  }

  return <form className="tracker-form prayer-entry-editor" onSubmit={save}>
    <div className="prayer-editor-heading"><div><span className="wizard-step-kicker">{PRAYER_NAMES[entry.prayer]} · {entry.date}</span><h3>সালাতের রেকর্ড সম্পাদনা</h3></div><span className="edit-record-badge">সম্পাদনা</span></div>
    <Field label="ফরজ সালাতের অবস্থা"><Select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}><option value="jamaat">জামাতে আদায়</option><option value="home">বাসায় / একাকী আদায়</option><option value="not-performed">আদায় হয়নি</option></Select></Field>
    {method === "jamaat" && <Field label="জামাতে যোগ দেওয়ার অবস্থা"><Select value={takbir === "not-applicable" ? "with-takbir" : takbir} onChange={(event) => setTakbir(event.target.value as PrayerEntry["takbirStatus"])}><option value="with-takbir">তাকবিরে উলা পেয়েছি</option><option value="without-takbir">তাকবিরে উলা পাইনি, সব রাকাত পেয়েছি</option><option value="late-join">দেরিতে যোগ দিয়েছি</option></Select></Field>}
    {method === "jamaat" && takbir === "late-join" && <div className="tracker-form-grid"><Field label="ইমামের সঙ্গে পাওয়া রাকাত"><TextInput type="number" min="1" max={fardTotalFallback(parts)} value={caught} onChange={(event) => setCaught(event.target.value)}/></Field><Field label="পরে পূরণ করা রাকাত"><TextInput type="number" min="0" max={fardTotalFallback(parts)} value={completedAfter} onChange={(event) => setCompletedAfter(event.target.value)}/></Field></div>}
    {method !== "not-performed" && <div className="tracker-form-grid"><Field label="আদায়ের তারিখ"><TextInput type="date" value={performedDate} onChange={(event) => setPerformedDate(event.target.value)} required/></Field><Field label="আদায়ের সময়"><TextInput type="time" value={performedTime} onChange={(event) => setPerformedTime(event.target.value)} required/></Field></div>}
    <div className="prayer-editor-parts"><strong>রাকাতের বিবরণ</strong>{parts.map((part) => <Field key={part.partId} label={`${part.label} · ${CATEGORY_LABELS[part.category]}`}><TextInput type="number" min="0" max={part.plannedRakats} value={method === "not-performed" && part.category === "fard" ? "0" : method === "home" && part.category === "fard" ? String(part.plannedRakats) : String(part.performedRakats)} disabled={method === "not-performed" && part.category === "fard" || method === "home" && part.category === "fard" || method === "jamaat" && part.category === "fard" && takbir !== "late-join"} onChange={(event) => changePart(part.partId, event.target.value)}/></Field>)}</div>
    {method === "jamaat" && takbir === "late-join" && <Field label="জামাতে দেরি হওয়ার কারণ"><TextArea rows={2} value={lateReason} onChange={(event) => setLateReason(event.target.value)} /></Field>}
    {method === "not-performed" || method === "jamaat" && takbir === "late-join" ? <Field label="বাকি রাকাতের কারণ"><TextArea rows={2} value={missedReason} onChange={(event) => setMissedReason(event.target.value)} /></Field> : null}
    <Field label="ব্যক্তিগত নোট"><TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    {error && <Notice type="error">{error}</Notice>}
    <div className="wizard-actions"><button type="button" className="tracker-quiet-button" onClick={onCancel}>বাতিল</button><button type="submit" className="tracker-primary-button" disabled={busy}>{busy ? "সংরক্ষণ হচ্ছে…" : <><Save size={15}/> পরিবর্তন সংরক্ষণ</>}</button></div>
  </form>;
}

function fardTotalFallback(parts: PrayerComponentResult[]) {
  return parts.find((part) => part.category === "fard")?.plannedRakats || 4;
}

function PrayerWizard({ data, onCancel, initialPrayer = null, initialQada = false, initialDate, initialEditingEntry = null }: { data: WorkspaceData; onCancel: () => void; initialPrayer?: PrayerId | null; initialQada?: boolean; initialDate?: string | null; initialEditingEntry?: PrayerEntry | null }) {
  const [prayer, setPrayer] = useState<PrayerId | "">(initialPrayer || "");
  const [partIndex, setPartIndex] = useState(0);
  const [componentResults, setComponentResults] = useState<PrayerComponentResult[]>([]);
  const [partDone, setPartDone] = useState<boolean | null>(null);
  const [partReason, setPartReason] = useState("");
  const [method, setMethod] = useState<"jamaat" | "home" | "not-prayed" | "">("");
  const [extraMode, setExtraMode] = useState(false);
  const [qadaMode, setQadaMode] = useState(initialQada);
  const [takbir, setTakbir] = useState<PrayerEntry["takbirStatus"]>("not-applicable");
  const [caught, setCaught] = useState("4");
  const [completedAfter, setCompletedAfter] = useState("0");
  const [lateReason, setLateReason] = useState("");
  const [missedReason, setMissedReason] = useState("");
  const [prayerDate, setPrayerDate] = useState(initialDate || today());
  const [editingEntry, setEditingEntry] = useState<PrayerEntry | null>(initialEditingEntry);
  const prayerNow = getDhakaDateTimeInput();
  const [performedTime, setPerformedTime] = useState(prayerNow.time);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const parts = useMemo(() => prayer ? data.prayerConfig[prayer].filter((part) => part.enabled || part.category === "fard") : [], [data.prayerConfig, prayer]);
  const currentPart = parts[partIndex];
  const prayerLabel = prayer ? PRAYER_NAMES[prayer] : "সালাত";
  const pendingQada = data.qadaEntries.filter((item) => item.status === "pending");
  const allResults = [...componentResults];
  const existingPrayerEntry = prayer ? data.prayerEntries.find((item) => item.date === prayerDate && item.prayer === prayer && item.method !== "qada") || null : null;

  function moveNextPart(result?: PrayerComponentResult) {
    setError("");
    if (result) setComponentResults((current) => [...current, result]);
    setPartDone(null); setPartReason(""); setPartIndex((index) => index + 1);
  }
  function savePrayer() {
    const selectedPrayer = prayer;
    const selectedMethod = method;
    if (!selectedPrayer || !selectedMethod) { setError("সালাতের পদ্ধতি নির্বাচন করো।"); return; }
    if (selectedMethod === "not-prayed" && missedReason.trim().length < 2) { setError("কেন আদায় হয়নি, সংক্ষেপে লিখো।"); return; }
    if (selectedMethod === "jamaat" && takbir === "late-join" && lateReason.trim().length < 2) { setError("দেরি হওয়ার কারণ লিখো।"); return; }
    const fardPart = parts.find((part) => part.category === "fard");
    if (!fardPart) { setError("এই ওয়াক্তের ফরজ রাকাত Configuration পাওয়া যায়নি। Settings পরীক্ষা করো।"); return; }
    const initialCaught = selectedMethod === "jamaat" && takbir === "late-join" ? Number(caught) : fardPart.rakats;
    const initiallyMissed = selectedMethod === "jamaat" && takbir === "late-join" ? Math.max(0, fardPart.rakats - initialCaught) : 0;
    const completedLater = selectedMethod === "jamaat" && takbir === "late-join" ? Math.max(0, Math.min(initiallyMissed, Number(completedAfter) || 0)) : 0;
    const outstandingRakats = Math.max(0, initiallyMissed - completedLater);
    if (outstandingRakats > 0 && missedReason.trim().length < 2) { setError("যে রাকাতগুলো এখনো পূরণ করোনি, তার কারণ লিখো।"); return; }
    const omittedSunnah = data.prayerConfig[selectedPrayer].filter((part) => part.category === "sunnah" && !part.enabled).map((part) => ({ partId: part.id, label: part.label, category: part.category, plannedRakats: part.rakats, performed: false, performedRakats: 0, reason: part.omissionReason || "সেটিংসে নিষ্ক্রিয় করা হয়েছে" }));
    const results = [...allResults, ...omittedSunnah];
    const performedAt = selectedMethod === "not-prayed" ? "" : toDhakaIso(getPrayerCivilDate(prayerDate, selectedPrayer), performedTime);
    if (selectedMethod !== "not-prayed" && !performedAt) { setError("আদায়ের তারিখ ও সময় সঠিকভাবে দাও।"); return; }
    const entry: PrayerEntry = {
      id: makeId(), date: prayerDate, prayer: selectedPrayer, method: selectedMethod === "not-prayed" ? "not-performed" : selectedMethod,
      components: results, takbirStatus: selectedMethod === "jamaat" ? takbir : "not-applicable",
      caughtRakats: selectedMethod === "not-prayed" ? 0 : initialCaught,
      completedAfterRakats: completedLater,
      missedRakats: outstandingRakats,
      lateReason: lateReason.trim(), missedReason: missedReason.trim(), performedAt: selectedMethod === "not-prayed" ? "" : performedAt || "",
      note: note.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    updateWorkspaceData((current) => {
      const replacedEntries = current.prayerEntries.filter((item) => item.date === prayerDate && item.prayer === selectedPrayer && item.method !== "qada");
      const qadaNeeded = selectedMethod === "not-prayed" || results.some((part) => part.category === "fard" && part.performedRakats < part.plannedRakats);
      let qadaEntries = qadaNeeded
        ? current.qadaEntries.filter((item) => !(item.status === "pending" && item.prayer === selectedPrayer && item.missedDate === prayerDate && item.sourceEntryId && replacedEntries.some((entry) => entry.id === item.sourceEntryId)))
        : current.qadaEntries.filter((item) => !(item.status === "pending" && item.prayer === selectedPrayer && item.missedDate === prayerDate));
      if (qadaNeeded && !qadaEntries.some((item) => item.prayer === selectedPrayer && item.missedDate === prayerDate && item.status === "pending")) {
        const missingRakats = Math.max(1, (fardPart?.rakats || 0) - (results.find((part) => part.category === "fard")?.performedRakats || 0));
        qadaEntries = [{ id: makeId(), prayer: selectedPrayer, missedDate: prayerDate, sourceEntryId: entry.id, rakats: missingRakats, reason: missedReason.trim() || results.find((part) => part.category === "fard" && part.performedRakats < part.plannedRakats)?.reason || "ফরজের কিছু রাকাত বাকি", status: "pending", settledAt: null, settlementNote: "", createdAt: new Date().toISOString() }, ...qadaEntries];
      }
      return {
        ...current,
        prayerEntries: [entry, ...current.prayerEntries.filter((item) => !(item.date === prayerDate && item.prayer === selectedPrayer && item.method !== "qada"))],
        qadaEntries,
        reminderEvents: current.reminderEvents.map((item) => item.key === `waqt-ended:${prayerDate}:${selectedPrayer}` ? { ...item, resolved: true, response: qadaNeeded ? "not-prayed" as const : "prayed" as const } : item)
      };
    });
    setSaved(true);
  }
  if (editingEntry) return <PrayerEntryEditForm entry={editingEntry} onCancel={() => setEditingEntry(null)} onSaved={() => { setEditingEntry(null); setSaved(true); }}/>;
  if (qadaMode) return <QadaSettlementForm data={data} onCancel={() => setQadaMode(false)}/>;
  if (saved) return <div className="tracker-success"><span><CheckCircle2 size={28}/></span><h3>সালাতের রেকর্ড সংরক্ষিত হয়েছে</h3><p>রেকর্ডটি অনলাইনে সংরক্ষিত হয়েছে।</p><button className="tracker-primary-button" onClick={onCancel}>ট্র্যাকার তালিকায় ফিরো</button></div>;

  if (existingPrayerEntry && prayer) return <div className="prayer-wizard prayer-existing-state">
    <div className="prayer-existing-icon"><CheckCircle2 size={26}/></div>
    <span className="wizard-step-kicker">{PRAYER_NAMES[prayer]} · {prayerDate}</span>
    <h3>এই ওয়াক্তের এন্ট্রি হয়েছে</h3>
    <p>একই দিনে নতুন এন্ট্রি তৈরি করা যাবে না। প্রয়োজন হলে আগের রেকর্ড সম্পাদনা করো।</p>
    <div className="prayer-existing-actions"><button type="button" className="tracker-secondary-button" onClick={() => setEditingEntry(existingPrayerEntry)}><Pencil size={15}/> সম্পাদনা</button><button type="button" className="tracker-quiet-button" onClick={onCancel}>ফিরে যাও</button></div>
  </div>;

  return <div className="prayer-wizard">
    <div className="wizard-topline"><span>ধাপে ধাপে সালাতের হিসাব</span><span>{prayer ? `${bn(Math.min(partIndex + 1, Math.max(parts.length, 1)))} / ${bn(parts.length + 1)} ধাপ` : "প্রথম ধাপ"}</span></div>
    <div className="wizard-progress"><span style={{ width: `${prayer ? Math.min(92, ((partIndex + 1) / (parts.length + 2)) * 100) : 8}%` }}/></div>
    <div className="wizard-date-strip"><Field label="মুহাসাবার তারিখ · মাগরিব থেকে পরের আসর"><TextInput type="date" value={prayerDate} onChange={(event) => { setPrayerDate(event.target.value); setPrayer(""); setPartIndex(0); setComponentResults([]); setMethod(""); }}/></Field></div>
    {!prayer && !extraMode ? <div className="wizard-step"><h3>কোন ওয়াক্তের হিসাব রাখবে?</h3><p>এই মুহাসাবার দিনে প্রতিটি ওয়াক্তের জন্য একবার এন্ট্রি করা যাবে।</p><div className="prayer-select-grid">{PRAYERS.map((id) => { const existing = data.prayerEntries.find((item) => item.date === prayerDate && item.prayer === id && item.method !== "qada"); return <div className={`prayer-select-row ${existing ? "is-recorded" : ""}`} key={id}><button type="button" className="prayer-select-card" disabled={Boolean(existing)} onClick={() => { setPrayer(id); setCompletedAfter("0"); setCaught(String(data.prayerConfig[id].find((part) => part.category === "fard")?.rakats || 4)); }}><span><strong>{PRAYER_NAMES[id]}</strong><small>{existing ? "এন্ট্রি হয়েছে" : "নতুন এন্ট্রি"}</small></span>{existing ? <CheckCircle2 size={18}/> : <ChevronRight size={17}/>}</button>{existing && <button type="button" className="prayer-edit-inline" onClick={() => setEditingEntry(existing)}><Pencil size={13}/> সম্পাদনা</button>}</div>; })}</div><div className="prayer-extra-actions"><button type="button" className="tracker-secondary-button" onClick={() => setExtraMode(true)}><Plus size={15}/> অতিরিক্ত সালাতের রেকর্ড</button><button type="button" className="tracker-secondary-button" onClick={() => setQadaMode(true)}><Clock3 size={15}/> বাকি কাজা আদায় ({bn(pendingQada.length)})</button></div></div>
    : extraMode ? <ExtraPrayerForm onCancel={onCancel}/> 
    : currentPart && currentPart.category !== "fard" ? <div className="wizard-step"><div className="wizard-step-kicker">{prayerLabel} · {CATEGORY_LABELS[currentPart.category]}</div><h3>{currentPart.label} আদায় করেছ?</h3><p>{bn(currentPart.rakats)} রাকাত · গ্লোবাল রাকাত সেটিংস থেকে নেওয়া</p><div className="choice-row"><button type="button" className={`choice-tile ${partDone === true ? "selected" : ""}`} onClick={() => { setPartDone(true); setPartReason(""); }}><CheckCircle2 size={18}/>হ্যাঁ</button><button type="button" className={`choice-tile ${partDone === false ? "selected" : ""}`} onClick={() => setPartDone(false)}><X size={18}/>না</button></div>{partDone === false && <Field label="কেন আদায় হয়নি?"><TextArea rows={2} value={partReason} onChange={(event) => setPartReason(event.target.value)} placeholder="সংক্ষেপে কারণ লিখো"/></Field>}<div className="wizard-actions"><button className="tracker-quiet-button" onClick={() => setPartIndex(Math.max(0, partIndex - 1))}>পেছনে</button><button className="tracker-primary-button" disabled={partDone === null || (partDone === false && !partReason.trim())} onClick={() => moveNextPart({ partId: currentPart.id, label: currentPart.label, category: currentPart.category, plannedRakats: currentPart.rakats, performed: partDone === true, performedRakats: partDone ? currentPart.rakats : 0, reason: partReason.trim() })}>পরবর্তী <ArrowRight size={15}/></button></div></div>
    : currentPart?.category === "fard" && !method ? <div className="wizard-step"><div className="wizard-step-kicker">{prayerLabel} · ফরজ {bn(currentPart.rakats)} রাকাত</div><h3>ফরজ সালাত কীভাবে আদায় করেছ?</h3><p>একটি পদ্ধতি নির্বাচন করো। পরের প্রশ্ন সেই অনুযায়ী আসবে।</p><div className="choice-stack"><button className="choice-tile" onClick={() => { setMethod("jamaat"); setTakbir("with-takbir"); setCaught(String(currentPart.rakats)); setCompletedAfter("0"); setMissedReason(""); }}><span><strong>জামাতে</strong><small>মসজিদে বা জামাতে আদায়</small></span><ChevronRight/></button><button className="choice-tile" onClick={() => { setMethod("home"); moveNextPart({ partId: currentPart.id, label: currentPart.label, category: currentPart.category, plannedRakats: currentPart.rakats, performed: true, performedRakats: currentPart.rakats, reason: "" }); }}><span><strong>বাসায় / একাকী</strong><small>নির্ধারিত ফরজ রাকাত পূর্ণ হিসেবে গণ্য হবে</small></span><ChevronRight/></button><button className="choice-tile choice-tile-muted" onClick={() => setMethod("not-prayed")}><span><strong>এখনো আদায় করিনি</strong><small>এটি নিশ্চিত করলে কাজার রেকর্ড তৈরি হবে</small></span><ChevronRight/></button></div><div className="wizard-actions"><button className="tracker-quiet-button" onClick={() => setPartIndex(Math.max(0, partIndex - 1))}>পেছনে</button></div></div>
    : currentPart?.category === "fard" && method === "jamaat" ? <div className="wizard-step"><div className="wizard-step-kicker">{prayerLabel} · জামাতে</div><h3>জামাতে কতটুকু পেয়েছ?</h3><div className="choice-stack"><button className={`choice-tile ${takbir === "with-takbir" ? "selected" : ""}`} onClick={() => { setTakbir("with-takbir"); setCaught(String(currentPart.rakats)); setLateReason(""); }}><span><strong>তাকবিরে উলা পেয়েছি</strong><small>সম্পূর্ণ সালাতের অংশ পেয়েছি</small></span><Check/></button><button className={`choice-tile ${takbir === "without-takbir" ? "selected" : ""}`} onClick={() => { setTakbir("without-takbir"); setCaught(String(currentPart.rakats)); setLateReason(""); }}><span><strong>তাকবিরে উলা পাইনি, তবে সব রাকাত পেয়েছি</strong><small>সালাত সম্পূর্ণ পেয়েছি</small></span><Check/></button><button className={`choice-tile ${takbir === "late-join" ? "selected" : ""}`} onClick={() => { setTakbir("late-join"); setCaught(String(Math.max(1, currentPart.rakats - 1))); setCompletedAfter("0"); setMissedReason(""); }}><span><strong>দেরিতে যোগ দিয়েছি</strong><small>কিছু রাকাত মিস হয়েছে</small></span><ChevronRight/></button></div>{takbir === "late-join" && <div className="wizard-followup"><Field label="ইমামের সঙ্গে কত রাকাত পেয়েছ?"><Select value={caught} onChange={(event) => { setCaught(event.target.value); setCompletedAfter("0"); }}>{Array.from({ length: currentPart.rakats }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{bn(n)} রাকাত</option>)}</Select></Field><Field label="ইমাম সালাম ফেরানোর পর কত রাকাত পূরণ করেছ?"><Select value={completedAfter} onChange={(event) => setCompletedAfter(event.target.value)}>{Array.from({ length: Math.max(0, currentPart.rakats - Number(caught)) + 1 }, (_, i) => i).map((n) => <option key={n} value={n}>{bn(n)} রাকাত</option>)}</Select></Field><Field label="কেন দেরিতে জামাতে যোগ দিয়েছ?"><TextArea rows={2} value={lateReason} onChange={(event) => setLateReason(event.target.value)} placeholder="যেমন: সময়মতো পৌঁছাতে পারিনি…"/></Field>{Number(caught) + Number(completedAfter) < currentPart.rakats && <Field label="যে রাকাত এখনো পূরণ করোনি, তার কারণ"><TextArea rows={2} value={missedReason} onChange={(event) => setMissedReason(event.target.value)} placeholder="কারণটি লিখে রাখো"/></Field>}</div>}<div className="wizard-actions"><button className="tracker-quiet-button" onClick={() => setMethod("")}>পেছনে</button><button className="tracker-primary-button" disabled={takbir === "late-join" && (!lateReason.trim() || (Number(caught) + Number(completedAfter) < currentPart.rakats && !missedReason.trim()))} onClick={() => moveNextPart({ partId: currentPart.id, label: currentPart.label, category: currentPart.category, plannedRakats: currentPart.rakats, performed: true, performedRakats: Math.min(currentPart.rakats, Number(caught) + Number(completedAfter)), reason: [lateReason.trim(), missedReason.trim()].filter(Boolean).join(" · ") })}>পরবর্তী <ArrowRight size={15}/></button></div></div>
    : currentPart?.category === "fard" && method === "not-prayed" ? <div className="wizard-step"><h3>কেন এই সালাত আদায় হয়নি?</h3><Field label="কারণ"><TextArea rows={3} value={missedReason} onChange={(event) => setMissedReason(event.target.value)} placeholder="নিজের জন্য সংক্ষেপে লিখে রাখো"/></Field><div className="wizard-actions"><button className="tracker-quiet-button" onClick={() => setMethod("")}>পেছনে</button><button className="tracker-primary-button" disabled={!missedReason.trim()} onClick={() => moveNextPart({ partId: currentPart.id, label: currentPart.label, category: currentPart.category, plannedRakats: currentPart.rakats, performed: false, performedRakats: 0, reason: missedReason.trim() })}>পরবর্তী</button></div></div>
    : partIndex >= parts.length ? <div className="wizard-step"><div className="wizard-step-kicker">শেষ ধাপ</div><h3>রেকর্ডটি সংরক্ষণ করবে?</h3><div className="prayer-summary-list"><div><span>ওয়াক্ত</span><strong>{prayer ? PRAYER_NAMES[prayer] : "—"}</strong></div><div><span>পদ্ধতি</span><strong>{method === "jamaat" ? "জামাতে" : method === "home" ? "বাসায় / একাকী" : "এখনো আদায় হয়নি"}</strong></div><div><span>রেকর্ডকৃত অংশ</span><strong>{bn(allResults.length)}টি</strong></div></div>{method !== "not-prayed" && <Field label="আদায়ের সময় (বাংলাদেশ)"><TextInput type="time" value={performedTime} onChange={(event) => setPerformedTime(event.target.value)}/></Field>}<Field label="ব্যক্তিগত নোট (ঐচ্ছিক)"><TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="আর কিছু মনে রাখতে চাইলে লিখো"/></Field><div className="wizard-actions"><button className="tracker-quiet-button" onClick={() => { setPartIndex(Math.max(0, parts.length - 1)); setMethod(""); }}>পেছনে</button><button className="tracker-primary-button" onClick={savePrayer}><Save size={16}/> রেকর্ড সংরক্ষণ</button></div></div>
    : <div className="wizard-step"><h3>এই ওয়াক্তের Configuration-এ কোনো সক্রিয় অংশ নেই</h3><p>Settings থেকে সালাতের রাকাত ও অংশগুলো সক্রিয় করো।</p></div>}
    {error && <Notice type="error">{error}</Notice>}
  </div>;
}

function ExtraPrayerForm({ onCancel }: { onCancel: () => void }) {
  const [type, setType] = useState("চাশত / দুহা");
  const [category, setCategory] = useState<"sunnah" | "wajib" | "nafl">("nafl");
  const [rakats, setRakats] = useState("2");
  const extraNow = getDhakaDateTimeInput();
  const [date, setDate] = useState(today());
  const [performedCivilDate, setPerformedCivilDate] = useState(extraNow.date);
  const [performedTime, setPerformedTime] = useState(extraNow.time);
  const [note, setNote] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const count = Number(rakats);
    if (!Number.isInteger(count) || count < 1 || count > 40) return;
    const performedAt = toDhakaIso(performedCivilDate, performedTime);
    if (!performedAt) return;
    const entry: ExtraPrayerEntry = { id: makeId(), date, type: type.trim(), category, rakats: count, performedAt, note: note.trim(), createdAt: new Date().toISOString() };
    updateWorkspaceData((current) => ({ ...current, extraPrayerEntries: [entry, ...current.extraPrayerEntries] }));
    onCancel();
  }
  return <form className="tracker-form extra-prayer-form" onSubmit={submit}><div className="wizard-step-kicker">অতিরিক্ত সালাত</div><h3>কোন সালাত আদায় করেছ?</h3><div className="tracker-form-grid"><Field label="সালাতের ধরন"><Select value={type} onChange={(e) => { setType(e.target.value); setCategory(e.target.value === "বিতর" ? "wajib" : e.target.value === "ইশরাক" || e.target.value === "চাশত / দুহা" || e.target.value === "আওয়াবিন" ? "sunnah" : "nafl"); }}><option>ইশরাক</option><option>চাশত / দুহা</option><option>তাহাজ্জুদ</option><option>আওয়াবিন</option><option>সালাতুত তাসবিহ</option><option>অন্যান্য নফল</option><option>বিতর</option></Select></Field><Field label="শ্রেণি"><Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}><option value="sunnah">সুন্নত</option><option value="wajib">ওয়াজিব</option><option value="nafl">নফল</option></Select></Field><Field label="রাকাত সংখ্যা"><TextInput type="number" min="1" max="40" value={rakats} onChange={(e) => setRakats(e.target.value)}/></Field><Field label="হিসাবের তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="আসল ক্যালেন্ডার তারিখ"><TextInput type="date" value={performedCivilDate} onChange={(e) => setPerformedCivilDate(e.target.value)}/></Field><Field label="আদায়ের সময় (স্থানীয়)"><TextInput type="time" value={performedTime} onChange={(e) => setPerformedTime(e.target.value)}/></Field></div><Field label="নোট (ঐচ্ছিক)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)}/></Field><div className="tracker-actions"><button type="button" className="tracker-quiet-button" onClick={onCancel}>বাতিল</button><SaveButton>অতিরিক্ত সালাত সংরক্ষণ</SaveButton></div></form>;
}

function QuranForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(today()); const [surah, setSurah] = useState("1"); const [from, setFrom] = useState("1"); const [to, setTo] = useState("7"); const [pageFrom, setPageFrom] = useState(""); const [pageTo, setPageTo] = useState(""); const [juz, setJuz] = useState(""); const [note, setNote] = useState(""); const [error, setError] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const start = Number(from), end = Number(to); if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) { setError("আয়াতের পরিসর সঠিকভাবে দাও।"); return; } const entry: QuranEntry = { id: makeId(), date, surahFrom: Number(surah), ayahFrom: start, surahTo: Number(surah), ayahTo: end, pageFrom: pageFrom ? Number(pageFrom) : null, pageTo: pageTo ? Number(pageTo) : null, juz: juz ? Number(juz) : null, note: note.trim(), createdAt: new Date().toISOString() }; updateWorkspaceData((data) => ({ ...data, quranEntries: [entry, ...data.quranEntries] })); onSaved(); }
  return <form className="tracker-form" onSubmit={submit}><div className="tracker-form-grid"><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required/></Field><Field label="সূরা"><Select value={surah} onChange={(e) => setSurah(e.target.value)}>{SURAHS.map((item) => <option key={item.number} value={item.number}>{bn(item.number)}. {item.name}</option>)}</Select></Field><Field label="শুরু আয়াত"><TextInput type="number" min="1" value={from} onChange={(e) => setFrom(e.target.value)} required/></Field><Field label="শেষ আয়াত"><TextInput type="number" min="1" value={to} onChange={(e) => setTo(e.target.value)} required/></Field><Field label="শুরু পৃষ্ঠা (ঐচ্ছিক)"><TextInput type="number" min="1" max="604" value={pageFrom} onChange={(e) => setPageFrom(e.target.value)}/></Field><Field label="শেষ পৃষ্ঠা (ঐচ্ছিক)"><TextInput type="number" min="1" max="604" value={pageTo} onChange={(e) => setPageTo(e.target.value)}/></Field><Field label="পারা (ঐচ্ছিক)"><Select value={juz} onChange={(e) => setJuz(e.target.value)}><option value="">নির্বাচন করিনি</option>{Array.from({ length: 30 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{bn(n)} নম্বর পারা</option>)}</Select></Field></div><Field label="নোট (ঐচ্ছিক)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="পাঠ সম্পর্কে ব্যক্তিগত নোট"/></Field>{error && <Notice type="error">{error}</Notice>}<SaveButton>তেলাওয়াত সংরক্ষণ</SaveButton></form>;
}

function DhikrForm({ data, onSaved }: { data: WorkspaceData; onSaved: () => void }) {
  const [templateId, setTemplateId] = useState(""); const [title, setTitle] = useState(""); const [target, setTarget] = useState("33"); const [count, setCount] = useState(0); const [date, setDate] = useState(today()); const [group, setGroup] = useState("general"); const [meaning, setMeaning] = useState(""); const [showCustom, setShowCustom] = useState(false);
  const selected = data.dhikrTemplates.find((item) => item.id === templateId);
  function begin(id: string) { const item = data.dhikrTemplates.find((t) => t.id === id); setTemplateId(id); setTitle(item?.title || ""); setTarget(String(item?.target || 33)); setCount(0); setShowCustom(false); }
  function addTemplate(event: FormEvent) { event.preventDefault(); if (!title.trim()) return; const id = makeId(); updateWorkspaceData((current) => ({ ...current, dhikrTemplates: [{ id, title: title.trim(), group: group as "morning" | "evening" | "general" | "custom", target: Math.max(1, Number(target) || 1), meaning: meaning.trim(), active: true }, ...current.dhikrTemplates] })); setTemplateId(id); setCount(0); setShowCustom(false); }
  function saveSession() { if (!title.trim() || count < 1) return; const session: DhikrSession = { id: makeId(), date, templateId: selected?.id || templateId || null, title: title.trim(), target: Math.max(1, Number(target) || 1), count, completed: count >= Math.max(1, Number(target) || 1), note: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; updateWorkspaceData((current) => ({ ...current, dhikrSessions: [session, ...current.dhikrSessions] })); onSaved(); }
  if (showCustom) return <form className="tracker-form" onSubmit={addTemplate}><Field label="জিকিরের নাম"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="নিজের জিকিরের নাম" required/></Field><div className="tracker-form-grid"><Field label="ধরন"><Select value={group} onChange={(e) => setGroup(e.target.value)}><option value="morning">সকাল</option><option value="evening">সন্ধ্যা</option><option value="general">সাধারণ</option><option value="custom">নিজস্ব</option></Select></Field><Field label="লক্ষ্য সংখ্যা"><TextInput type="number" min="1" max="100000" value={target} onChange={(e) => setTarget(e.target.value)}/></Field></div><Field label="অর্থ / ব্যাখ্যা (ঐচ্ছিক)"><TextInput value={meaning} onChange={(e) => setMeaning(e.target.value)}/></Field><div className="tracker-actions"><button type="button" className="tracker-quiet-button" onClick={() => setShowCustom(false)}>বাতিল</button><SaveButton>জিকির যোগ করো</SaveButton></div></form>;
  return <div className="tracker-form"><div className="tracker-template-list">{data.dhikrTemplates.filter((t) => t.active).map((item) => <button type="button" className={`tracker-template ${templateId === item.id ? "selected" : ""}`} key={item.id} onClick={() => begin(item.id)}><span><strong>{item.title}</strong><small>{item.group === "morning" ? "সকাল" : item.group === "evening" ? "সন্ধ্যা" : "সাধারণ"} · লক্ষ্য {bn(item.target)}</small></span><ChevronRight size={16}/></button>)}</div><button type="button" className="tracker-secondary-button" onClick={() => { setShowCustom(true); setTitle(""); setTarget("33"); }}> <Plus size={15}/> নিজের জিকির যোগ করো</button>{selected && <div className="dhikr-counter"><div><small>{selected.group === "morning" ? "সকালের জিকির" : selected.group === "evening" ? "সন্ধ্যার জিকির" : "নির্বাচিত জিকির"}</small><h3>{selected.title}</h3></div><div className="dhikr-count">{bn(count)} <small>/ {bn(Number(target) || selected.target)}</small></div><div className="dhikr-controls"><button type="button" onClick={() => setCount((n) => Math.max(0, n - 1))} aria-label="এক কমাও">−</button><button type="button" onClick={() => setCount((n) => n + 1)} aria-label="এক বাড়াও">+১</button><button type="button" onClick={() => setCount(0)} aria-label="শূন্য থেকে শুরু">পুনরায়</button></div><Field label="আজকের তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><button type="button" className="tracker-primary-button" disabled={count < 1} onClick={saveSession}><Save size={16}/> সেশন সংরক্ষণ</button></div>}</div>;
}

function FastingForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(today()); const [category, setCategory] = useState<"fard" | "nafl" | "qada">("nafl"); const [status, setStatus] = useState<"completed" | "not-kept" | "planned">("planned"); const [missedDate, setMissedDate] = useState(""); const [reason, setReason] = useState(""); const [note, setNote] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const entry: FastingEntry = { id: makeId(), date, category, status, linkedMissedDate: category === "qada" ? missedDate : "", reason: reason.trim(), note: note.trim(), createdAt: new Date().toISOString() }; updateWorkspaceData((data) => ({ ...data, fastingEntries: [entry, ...data.fastingEntries] })); onSaved(); }
  return <form className="tracker-form" onSubmit={submit}><div className="tracker-form-grid"><Field label="রোজার ধরন"><Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}><option value="fard">ফরজ</option><option value="nafl">নফল</option><option value="qada">কাজা</option></Select></Field><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="অবস্থা"><Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="planned">পরিকল্পিত</option><option value="completed">সম্পন্ন</option><option value="not-kept">রাখা হয়নি</option></Select></Field>{category === "qada" && <Field label="যে রোজার কাজা"><TextInput type="date" value={missedDate} onChange={(e) => setMissedDate(e.target.value)}/></Field>}</div>{status === "not-kept" && <Field label="কারণ"><TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}/></Field>}<Field label="নোট (ঐচ্ছিক)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)}/></Field><SaveButton>সিয়ামের রেকর্ড রাখো</SaveButton></form>;
}

function GoodDeedForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(today()); const [category, setCategory] = useState(GOOD_CATEGORIES[0]); const [title, setTitle] = useState(""); const [details, setDetails] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const entry: DeedEntry = { id: makeId(), date, category, title: title.trim() || category, details: details.trim(), note: "", createdAt: new Date().toISOString() }; updateWorkspaceData((data) => ({ ...data, deedEntries: [entry, ...data.deedEntries] })); onSaved(); }
  return <form className="tracker-form" onSubmit={submit}><div className="tracker-form-grid"><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="ক্যাটাগরি"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{GOOD_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</Select></Field></div><Field label="নিজস্ব নাম (ঐচ্ছিক)"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="নিজের মতো নাম দিতে পারো"/></Field><Field label="বিবরণ"><TextArea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="কাজটি সম্পর্কে সংক্ষেপে লিখো"/></Field><SaveButton>ভালো কাজ সংরক্ষণ</SaveButton></form>;
}

function AvoidForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(today()); const [habitName, setHabitName] = useState(""); const [status, setStatus] = useState<AvoidEntry["status"]>("avoided"); const [trigger, setTrigger] = useState(""); const [response, setResponse] = useState(""); const [note, setNote] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const entry: AvoidEntry = { id: makeId(), date, habitName: habitName.trim(), status, trigger: trigger.trim(), response: response.trim(), note: note.trim(), createdAt: new Date().toISOString() }; updateWorkspaceData((data) => ({ ...data, avoidEntries: [entry, ...data.avoidEntries] })); onSaved(); }
  return <form className="tracker-form" onSubmit={submit}><Field label="কোন অভ্যাসের হিসাব রাখছ?"><TextInput value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="নিজের জন্য ব্যক্তিগত নাম" required/></Field><div className="tracker-form-grid"><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="আজকের অবস্থা"><Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>{AVOIDANCE_STATUSES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</Select></Field></div><Field label="কোন পরিস্থিতি প্রভাব ফেলেছে? (ঐচ্ছিক)"><TextArea rows={2} value={trigger} onChange={(e) => setTrigger(e.target.value)}/></Field><Field label="কীভাবে সামলেছ বা পরেরবার কী করবে?"><TextArea rows={2} value={response} onChange={(e) => setResponse(e.target.value)}/></Field><Field label="ব্যক্তিগত নোট (ঐচ্ছিক)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)}/></Field><SaveButton>ব্যক্তিগত লগ সংরক্ষণ</SaveButton></form>;
}

function IlmForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(today()); const [resource, setResource] = useState(""); const [subject, setSubject] = useState(""); const [chapter, setChapter] = useState(""); const [pages, setPages] = useState("0"); const [minutes, setMinutes] = useState("0"); const [takeaway, setTakeaway] = useState(""); const [note, setNote] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); updateWorkspaceData((data) => ({ ...data, studyEntries: [{ id: makeId(), date, resource: resource.trim(), subject: subject.trim(), chapter: chapter.trim(), pages: Math.max(0, Number(pages) || 0), minutes: Math.max(0, Number(minutes) || 0), takeaway: takeaway.trim(), note: note.trim(), createdAt: new Date().toISOString() }, ...data.studyEntries] })); onSaved(); }
  return <form className="tracker-form" onSubmit={submit}><div className="tracker-form-grid"><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="বই / কোর্স / লেকচার"><TextInput value={resource} onChange={(e) => setResource(e.target.value)} required/></Field><Field label="বিষয়"><TextInput value={subject} onChange={(e) => setSubject(e.target.value)}/></Field><Field label="অধ্যায় / অংশ"><TextInput value={chapter} onChange={(e) => setChapter(e.target.value)}/></Field><Field label="পৃষ্ঠা"><TextInput type="number" min="0" value={pages} onChange={(e) => setPages(e.target.value)}/></Field><Field label="সময় (মিনিট)"><TextInput type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)}/></Field></div><Field label="আজ কী শিখেছ?"><TextArea rows={3} value={takeaway} onChange={(e) => setTakeaway(e.target.value)}/></Field><Field label="নোট"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)}/></Field><SaveButton>অধ্যয়ন সংরক্ষণ</SaveButton></form>;
}

function HabitForm({ data, onSaved }: { data: WorkspaceData; onSaved: () => void }) {
  const [title, setTitle] = useState(""); const [frequency, setFrequency] = useState<HabitDefinition["frequency"]>("daily"); const [target, setTarget] = useState("7"); const [habitId, setHabitId] = useState(""); const [date, setDate] = useState(today()); const [note, setNote] = useState(""); const [showCreate, setShowCreate] = useState(false);
  function create(event: FormEvent) { event.preventDefault(); const id = makeId(); updateWorkspaceData((current) => ({ ...current, habitDefinitions: [{ id, title: title.trim(), frequency, targetPerWeek: Math.max(1, Math.min(7, Number(target) || 1)), active: true, createdAt: new Date().toISOString() }, ...current.habitDefinitions] })); setHabitId(id); setShowCreate(false); setTitle(""); }
  function log(event: FormEvent) { event.preventDefault(); if (!habitId) return; const item: HabitLog = { id: makeId(), habitId, date, completed: true, note: note.trim(), createdAt: new Date().toISOString() }; updateWorkspaceData((current) => ({ ...current, habitLogs: [item, ...current.habitLogs.filter((x) => !(x.habitId === habitId && x.date === date))] })); onSaved(); }
  return <div className="tracker-form">{showCreate ? <form className="tracker-form" onSubmit={create}><Field label="অভ্যাসের নাম"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required/></Field><div className="tracker-form-grid"><Field label="কত ঘন ঘন"><Select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}><option value="daily">প্রতিদিন</option><option value="weekly">সাপ্তাহিক</option><option value="custom">নিজস্ব</option></Select></Field><Field label="সপ্তাহে লক্ষ্য"><TextInput type="number" min="1" max="7" value={target} onChange={(e) => setTarget(e.target.value)}/></Field></div><div className="tracker-actions"><button type="button" className="tracker-quiet-button" onClick={() => setShowCreate(false)}>বাতিল</button><SaveButton>অভ্যাস তৈরি</SaveButton></div></form> : <><Field label="অভ্যাস নির্বাচন"><Select value={habitId} onChange={(e) => setHabitId(e.target.value)}><option value="">অভ্যাস নির্বাচন করো</option>{data.habitDefinitions.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></Field><button type="button" className="tracker-secondary-button" onClick={() => setShowCreate(true)}><Plus size={15}/> নতুন অভ্যাস তৈরি</button><form className="tracker-form" onSubmit={log}><div className="tracker-form-grid"><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field><Field label="নোট (ঐচ্ছিক)"><TextInput value={note} onChange={(e) => setNote(e.target.value)}/></Field></div><SaveButton disabled={!habitId}>আজকের অভ্যাস সম্পন্ন</SaveButton></form></>}<div className="tracker-saved-list">{data.habitDefinitions.map((item) => <article className="tracker-saved-row" key={item.id}><div><strong>{item.title}</strong><small>{item.frequency === "daily" ? "প্রতিদিন" : `সপ্তাহে ${bn(item.targetPerWeek)} দিন`}</small></div><span>{bn(data.habitLogs.filter((x) => x.habitId === item.id && x.completed).length)} বার</span></article>)}</div></div>;
}

function ReflectionForm({ data, onSaved }: { data: WorkspaceData; onSaved: () => void }) {
  const [date, setDate] = useState(today()); const old = data.reflections.find((x) => x.date === date);
  const [goodToday, setGood] = useState(old?.goodToday || ""); const [mistakeToday, setMistake] = useState(old?.mistakeToday || ""); const [lesson, setLesson] = useState(old?.lesson || ""); const [gratitude, setGratitude] = useState(old?.gratitude || ""); const [tomorrowFocus, setTomorrow] = useState(old?.tomorrowFocus || ""); const [mood, setMood] = useState(old?.mood || "");
  function submit(event: FormEvent) { event.preventDefault(); const entry: ReflectionEntry = { id: old?.id || makeId(), date, goodToday: goodToday.trim(), mistakeToday: mistakeToday.trim(), lesson: lesson.trim(), gratitude: gratitude.trim(), tomorrowFocus: tomorrowFocus.trim(), mood, createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }; updateWorkspaceData((current) => ({ ...current, reflections: [entry, ...current.reflections.filter((x) => x.date !== date)] })); onSaved(); }
  return <form className="tracker-form" onSubmit={submit}><Field label="তারিখ"><TextInput type="date" value={date} onChange={(e) => { setDate(e.target.value); const value = data.reflections.find((x) => x.date === e.target.value); setGood(value?.goodToday || ""); setMistake(value?.mistakeToday || ""); setLesson(value?.lesson || ""); setGratitude(value?.gratitude || ""); setTomorrow(value?.tomorrowFocus || ""); setMood(value?.mood || ""); }}/></Field><Field label="আজকের ভালো কাজ কী ছিল?"><TextArea rows={2} value={goodToday} onChange={(e) => setGood(e.target.value)}/></Field><Field label="কোন বিষয়টি আরও ভালো করতে পারতাম?"><TextArea rows={2} value={mistakeToday} onChange={(e) => setMistake(e.target.value)}/></Field><Field label="আজ কী শিখেছি?"><TextArea rows={2} value={lesson} onChange={(e) => setLesson(e.target.value)}/></Field><Field label="কোন বিষয়ে কৃতজ্ঞ? (ঐচ্ছিক)"><TextArea rows={2} value={gratitude} onChange={(e) => setGratitude(e.target.value)}/></Field><Field label="আগামীকালের একটি অগ্রাধিকার"><TextInput value={tomorrowFocus} onChange={(e) => setTomorrow(e.target.value)}/></Field><Field label="আজকের অনুভূতি (ঐচ্ছিক)"><Select value={mood} onChange={(e) => setMood(e.target.value)}><option value="">নির্বাচন করিনি</option><option value="calm">শান্ত</option><option value="hopeful">আশাবাদী</option><option value="tired">ক্লান্ত</option><option value="focused">মনোযোগী</option><option value="mixed">মিশ্র অনুভূতি</option></Select></Field><SaveButton>মুহাসাবা সংরক্ষণ</SaveButton></form>;
}

type EditableTrackerKind = Exclude<TrackerKind, "prayer">;
type EditableTrackerRecord = Record<string, unknown> & { id: string };
type EditField = { key: string; label: string; type: "text" | "textarea" | "date" | "number" | "select" | "checkbox"; options?: { value: string; label: string }[]; max?: number };
const EDIT_COLLECTIONS = {
  quran: "quranEntries", dhikr: "dhikrSessions", fasting: "fastingEntries", good: "deedEntries",
  avoid: "avoidEntries", ilm: "studyEntries", habit: "habitLogs", reflection: "reflections"
} as const;
const EDIT_FIELDS: Record<EditableTrackerKind, EditField[]> = {
  quran: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "surahFrom", label: "শুরুর সূরা নম্বর", type: "number" },
    { key: "ayahFrom", label: "শুরুর আয়াত", type: "number" }, { key: "surahTo", label: "শেষ সূরা নম্বর", type: "number" },
    { key: "ayahTo", label: "শেষ আয়াত", type: "number" }, { key: "pageFrom", label: "শুরুর পৃষ্ঠা", type: "number" },
    { key: "pageTo", label: "শেষ পৃষ্ঠা", type: "number" }, { key: "juz", label: "পারা", type: "number" },
    { key: "note", label: "নোট", type: "textarea", max: 1200 }
  ],
  dhikr: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "title", label: "জিকিরের নাম", type: "text", max: 120 },
    { key: "target", label: "লক্ষ্যমাত্রা", type: "number" }, { key: "count", label: "গণনা", type: "number" },
    { key: "note", label: "নোট", type: "textarea", max: 1200 }
  ],
  fasting: [
    { key: "date", label: "তারিখ", type: "date" },
    { key: "category", label: "রোজার ধরন", type: "select", options: [{ value: "fard", label: "ফরজ" }, { value: "nafl", label: "নফল" }, { value: "qada", label: "কাজা" }] },
    { key: "status", label: "অবস্থা", type: "select", options: [{ value: "planned", label: "পরিকল্পিত" }, { value: "completed", label: "সম্পন্ন" }, { value: "not-kept", label: "রাখা হয়নি" }] },
    { key: "linkedMissedDate", label: "যে রোজার কাজা (ঐচ্ছিক)", type: "date" }, { key: "reason", label: "কারণ", type: "textarea", max: 1200 }, { key: "note", label: "নোট", type: "textarea", max: 1200 }
  ],
  good: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "category", label: "ক্যাটাগরি", type: "text", max: 100 },
    { key: "title", label: "কাজের নাম", type: "text", max: 140 }, { key: "details", label: "বিবরণ", type: "textarea", max: 1600 }
  ],
  avoid: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "habitName", label: "ব্যক্তিগত অভ্যাসের নাম", type: "text", max: 140 },
    { key: "status", label: "অবস্থা", type: "select", options: [{ value: "avoided", label: "এড়িয়ে থাকতে পেরেছি" }, { value: "challenging", label: "কঠিন পরিস্থিতি এসেছে" }, { value: "slipped", label: "পরিকল্পনা অনুযায়ী হয়নি" }] },
    { key: "trigger", label: "প্রভাবক পরিস্থিতি", type: "textarea", max: 1200 }, { key: "response", label: "কীভাবে সামলেছ", type: "textarea", max: 1200 }, { key: "note", label: "নোট", type: "textarea", max: 1200 }
  ],
  ilm: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "resource", label: "বই / কোর্স / লেকচার", type: "text", max: 160 },
    { key: "subject", label: "বিষয়", type: "text", max: 120 }, { key: "chapter", label: "অধ্যায় / অংশ", type: "text", max: 160 },
    { key: "pages", label: "পৃষ্ঠা", type: "number" }, { key: "minutes", label: "সময় (মিনিট)", type: "number" },
    { key: "takeaway", label: "আজ কী শিখেছ", type: "textarea", max: 1600 }, { key: "note", label: "নোট", type: "textarea", max: 1200 }
  ],
  habit: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "completed", label: "অভ্যাস সম্পন্ন", type: "checkbox" },
    { key: "note", label: "নোট", type: "textarea", max: 1200 }
  ],
  reflection: [
    { key: "date", label: "তারিখ", type: "date" }, { key: "goodToday", label: "আজকের ভালো কাজ", type: "textarea", max: 1600 },
    { key: "mistakeToday", label: "যে বিষয়টি ভালো করা যেত", type: "textarea", max: 1600 }, { key: "lesson", label: "আজকের শিক্ষা", type: "textarea", max: 1600 },
    { key: "gratitude", label: "কৃতজ্ঞতার বিষয়", type: "textarea", max: 1200 }, { key: "tomorrowFocus", label: "আগামীকালের অগ্রাধিকার", type: "textarea", max: 1200 },
    { key: "mood", label: "অনুভূতি", type: "select", options: [{ value: "", label: "নির্বাচন করিনি" }, { value: "calm", label: "শান্ত" }, { value: "hopeful", label: "আশাবাদী" }, { value: "tired", label: "ক্লান্ত" }, { value: "focused", label: "মনোযোগী" }, { value: "mixed", label: "মিশ্র অনুভূতি" }] }
  ]
};
function TrackerRecordEditor({ kind, record, onClose }: { kind: EditableTrackerKind; record: EditableTrackerRecord; onClose: () => void }) {
  const fields = EDIT_FIELDS[kind];
  const [values, setValues] = useState<Record<string, string | boolean>>(() => Object.fromEntries(fields.map((field) => {
    const value = record[field.key];
    return [field.key, field.type === "checkbox" ? value === true : value == null ? "" : String(value)];
  })));
  const [error, setError] = useState("");
  const title = ({ quran: "কুরআন পাঠ", dhikr: "জিকির", fasting: "সিয়াম", good: "ভালো কাজ", avoid: "ব্যক্তিগত লগ", ilm: "অধ্যয়ন", habit: "অভ্যাস", reflection: "মুহাসাবা" } as const)[kind];
  function updateField(key: string, value: string | boolean) { setValues((current) => ({ ...current, [key]: value })); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patch: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.key];
      if (field.type === "checkbox") patch[field.key] = value === true;
      else if (field.type === "number") {
        const optionalQuranPage = kind === "quran" && ["pageFrom", "pageTo", "juz"].includes(field.key);
        patch[field.key] = value === "" ? (optionalQuranPage ? null : 0) : Math.max(0, Number(value) || 0);
      }
      else patch[field.key] = String(value ?? "").trim();
    }
    if (kind === "quran") {
      const surahFrom = Number(patch.surahFrom); const surahTo = Number(patch.surahTo);
      const ayahFrom = Number(patch.ayahFrom); const ayahTo = Number(patch.ayahTo);
      if (surahFrom < 1 || surahFrom > 114 || surahTo < 1 || surahTo > 114 || ayahFrom < 1 || ayahTo < ayahFrom || (surahFrom === surahTo && ayahTo > 300)) { setError("সূরা ও আয়াতের পরিসর সঠিকভাবে দাও।"); return; }
      for (const key of ["pageFrom", "pageTo", "juz"] as const) if (patch[key] === null || patch[key] === 0) patch[key] = null;
    }
    if (kind === "dhikr") {
      const target = Math.max(1, Number(patch.target) || 1); const count = Math.max(0, Number(patch.count) || 0);
      patch.target = target; patch.count = count; patch.completed = count >= target;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(patch.date || ""))) { setError("সঠিক তারিখ নির্বাচন করো।"); return; }
    const collection = EDIT_COLLECTIONS[kind];
    updateWorkspaceData((current) => {
      const source = current[collection] as unknown as EditableTrackerRecord[];
      const updated = source.map((item) => item.id === record.id ? { ...item, ...patch, ...( "updatedAt" in item ? { updatedAt: new Date().toISOString() } : {}) } : item);
      return { ...current, [collection]: updated } as WorkspaceData;
    });
    onClose();
  }
  return <div className="tracker-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="tracker-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="tracker-edit-title">
      <header><div><small>রেকর্ড সংশোধন</small><h2 id="tracker-edit-title">{title}</h2></div><button type="button" className="tracker-icon-button" aria-label="বন্ধ করো" onClick={onClose}><X size={17}/></button></header>
      <form onSubmit={save}>
        <div className="tracker-edit-fields">{fields.map((field) => <label className={`tracker-field tracker-edit-field-${field.type}`} key={field.key}><span>{field.label}</span>{field.type === "textarea" ? <textarea className="tracker-input tracker-textarea" rows={3} maxLength={field.max || 1600} value={String(values[field.key] ?? "")} onChange={(event) => updateField(field.key, event.target.value)}/> : field.type === "select" ? <select className="tracker-input" value={String(values[field.key] ?? "")} onChange={(event) => updateField(field.key, event.target.value)}>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "checkbox" ? <span className="tracker-edit-checkbox"><input type="checkbox" checked={values[field.key] === true} onChange={(event) => updateField(field.key, event.target.checked)}/><span>হ্যাঁ</span></span> : <input className="tracker-input" type={field.type} maxLength={field.max} value={String(values[field.key] ?? "")} onChange={(event) => updateField(field.key, event.target.value)}/>}</label>)}</div>
        {error && <Notice type="error">{error}</Notice>}
        <div className="tracker-edit-actions"><button type="button" className="tracker-quiet-button" onClick={onClose}>বাতিল</button><button type="submit" className="tracker-primary-button"><Save size={15}/> পরিবর্তন সংরক্ষণ</button></div>
      </form>
    </section>
  </div>;
}

function ExtraPrayerRecordEditor({ record, onClose }: { record: ExtraPrayerEntry; onClose: () => void }) {
  const [date, setDate] = useState(record.date);
  const [type, setType] = useState(record.type);
  const [category, setCategory] = useState<ExtraPrayerEntry["category"]>(record.category);
  const [rakats, setRakats] = useState(String(record.rakats));
  const [note, setNote] = useState(record.note);
  const [error, setError] = useState("");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const count = Number(rakats);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !type.trim() || !Number.isInteger(count) || count < 1 || count > 100) {
      setError("তারিখ, সালাতের নাম ও রাকাত সঠিকভাবে দাও।"); return;
    }
    updateWorkspaceData((current) => ({ ...current, extraPrayerEntries: current.extraPrayerEntries.map((item) => item.id === record.id ? { ...item, date, type: type.trim(), category, rakats: count, note: note.trim() } : item) }));
    onClose();
  }
  return <div className="tracker-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="tracker-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="extra-prayer-edit-title"><header><div><small>রেকর্ড সংশোধন</small><h2 id="extra-prayer-edit-title">অতিরিক্ত সালাত</h2></div><button type="button" className="tracker-icon-button" aria-label="বন্ধ করো" onClick={onClose}><X size={17}/></button></header><form onSubmit={save}><div className="tracker-edit-fields"><Field label="তারিখ"><TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)}/></Field><Field label="সালাতের নাম"><TextInput value={type} onChange={(event) => setType(event.target.value)}/></Field><Field label="ধরন"><Select value={category} onChange={(event) => setCategory(event.target.value as ExtraPrayerEntry["category"])}><option value="sunnah">সুন্নত</option><option value="wajib">ওয়াজিব</option><option value="nafl">নফল</option></Select></Field><Field label="রাকাত"><TextInput type="number" min="1" max="100" value={rakats} onChange={(event) => setRakats(event.target.value)}/></Field><Field label="নোট"><TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)}/></Field></div>{error && <Notice type="error">{error}</Notice>}<div className="tracker-edit-actions"><button type="button" className="tracker-quiet-button" onClick={onClose}>বাতিল</button><SaveButton>পরিবর্তন সংরক্ষণ</SaveButton></div></form></section></div>;
}

function TrackerHistory({ kind, data, onEditPrayer, onEditRecord, onEditExtraPrayer }: { kind: TrackerKind; data: WorkspaceData; onEditPrayer?: (entry: PrayerEntry) => void; onEditRecord?: (kind: EditableTrackerKind, record: EditableTrackerRecord) => void; onEditExtraPrayer?: (entry: ExtraPrayerEntry) => void }) {
  if (kind === "prayer") return <div className="tracker-history-list">{data.prayerEntries.slice(0, 20).map((item) => <article className="tracker-history-row" key={item.id}><div><strong>{PRAYER_NAMES[item.prayer]} · {item.method === "jamaat" ? "জামাতে" : item.method === "qada" ? "কাজা" : item.method === "not-performed" ? "আদায় হয়নি" : "একাকী"}</strong><small>{formatTrackerDate(item.date)} · {item.components.reduce((n, part) => n + part.performedRakats, 0)} রাকাত · {item.takbirStatus === "with-takbir" ? "তাকবিরে উলা" : item.takbirStatus === "late-join" ? `${item.caughtRakats} রাকাত পেয়েছ` : item.takbirStatus === "without-takbir" ? "তাকবিরে উলা ছাড়া" : ""}</small></div><div className="tracker-history-actions">{item.method !== "qada" && <button className="tracker-icon-button" type="button" onClick={() => onEditPrayer?.(item)} aria-label="সালাত সম্পাদনা"><Pencil size={14}/></button>}<button className="tracker-icon-button" type="button" onClick={() => deleteLocal(kind, item.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}{data.extraPrayerEntries.slice(0, 20).map((item) => <article className="tracker-history-row" key={item.id}><div><strong>{item.type}</strong><small>{formatTrackerDate(item.date)} · {bn(item.rakats)} রাকাত · {CATEGORY_LABELS[item.category]}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditExtraPrayer?.(item)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" type="button" onClick={() => updateWorkspaceData((current) => ({ ...current, extraPrayerEntries: current.extraPrayerEntries.filter((x) => x.id !== item.id) }))} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "quran") return <div className="tracker-history-list">{data.quranEntries.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{SURAHS[x.surahFrom - 1]?.name || "সূরা"} · {bn(x.ayahFrom)}–{bn(x.ayahTo)}</strong><small>{formatTrackerDate(x.date)} · {bn(x.ayahTo - x.ayahFrom + 1)} আয়াত{ x.pageFrom ? ` · পৃষ্ঠা ${bn(x.pageFrom)}–${bn(x.pageTo || x.pageFrom)}` : ""}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("quran", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" type="button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "dhikr") return <div className="tracker-history-list">{data.dhikrSessions.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{x.title}</strong><small>{formatTrackerDate(x.date)} · {bn(x.count)} / {bn(x.target)} বার {x.completed ? "· লক্ষ্য পূর্ণ" : ""}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("dhikr", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "fasting") return <div className="tracker-history-list">{data.fastingEntries.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{{ fard: "ফরজ", nafl: "নফল", qada: "কাজা" }[x.category]} · {formatTrackerDate(x.date)}</strong><small>{{ completed: "সম্পন্ন", planned: "পরিকল্পিত", "not-kept": "রাখা হয়নি" }[x.status]}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("fasting", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" type="button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "good") return <div className="tracker-history-list">{data.deedEntries.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{x.title}</strong><small>{x.category} · {formatTrackerDate(x.date)}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("good", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "avoid") return <div className="tracker-history-list">{data.avoidEntries.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{x.habitName}</strong><small>{formatTrackerDate(x.date)} · {{ avoided: "এড়িয়ে থাকতে পেরেছি", challenging: "কঠিন পরিস্থিতি", slipped: "পরিকল্পনা অনুযায়ী হয়নি" }[x.status]}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("avoid", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "ilm") return <div className="tracker-history-list">{data.studyEntries.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{x.resource}</strong><small>{formatTrackerDate(x.date)} · {x.subject} · {bn(x.minutes)} মিনিট</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("ilm", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  if (kind === "habit") return <div className="tracker-history-list">{data.habitLogs.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{data.habitDefinitions.find((d) => d.id === x.habitId)?.title || "অভ্যাস"}</strong><small>{formatTrackerDate(x.date)} · {x.completed ? "সম্পন্ন" : "অসম্পন্ন"}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("habit", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
  return <div className="tracker-history-list">{data.reflections.slice(0, 30).map((x) => <article className="tracker-history-row" key={x.id}><div><strong>{formatTrackerDate(x.date)} · দৈনিক মুহাসাবা</strong><small>{x.tomorrowFocus || x.lesson || "প্রতিফলন সংরক্ষিত"}</small></div><div className="tracker-history-actions"><button className="tracker-icon-button" type="button" onClick={() => onEditRecord?.("reflection", x as unknown as EditableTrackerRecord)} aria-label="সম্পাদনা"><Pencil size={14}/></button><button className="tracker-icon-button" onClick={() => deleteLocal(kind, x.id)} aria-label="মুছুন"><Trash2 size={15}/></button></div></article>)}</div>;
}

function TrackerSummary({ kind, data }: { kind: TrackerKind; data: WorkspaceData }) {
  if (kind === "prayer") {
    const todayPrayer = data.prayerEntries.filter((x) => x.date === today() && x.method !== "qada");
    const todayQada = data.prayerEntries.filter((x) => x.date === today() && x.method === "qada");
    const extras = data.extraPrayerEntries.filter((item) => item.date === today());
    const rakats = todayPrayer.reduce((total, item) => total + item.components.reduce((sum, part) => sum + part.performedRakats, 0), 0) + extras.reduce((sum, item) => sum + item.rakats, 0);
    const qadaRakatsToday = todayQada.reduce((total, item) => total + item.components.reduce((sum, part) => sum + part.performedRakats, 0), 0);
    const pending = data.qadaEntries.filter((x) => x.status === "pending").length;
    const categories = todayPrayer.flatMap((x) => x.components).reduce((acc, part) => { acc[part.category] = (acc[part.category] || 0) + part.performedRakats; return acc; }, {} as Record<string, number>);
    extras.forEach((item) => { categories[item.category] = (categories[item.category] || 0) + item.rakats; });
    return <div className="tracker-stat-grid"><div><strong>{bn(rakats)}</strong><small>আজকের আদায়কৃত রাকাত</small></div><div><strong>{bn(todayPrayer.length)}</strong><small>সালাতের এন্ট্রি</small></div><div><strong>{bn(pending)}</strong><small>বাকি কাজা</small></div><div><strong>{bn(categories.fard || 0)}</strong><small>ফরজ রাকাত</small></div><div><strong>{bn(categories.sunnah || 0)}</strong><small>সুন্নত রাকাত</small></div><div><strong>{bn(categories.wajib || 0)}</strong><small>ওয়াজিব রাকাত</small></div><div><strong>{bn(categories.nafl || 0)}</strong><small>নফল রাকাত</small></div><div><strong>{bn(todayPrayer.filter((x) => x.method === "jamaat").length)}</strong><small>জামাতে আদায়</small></div><div><strong>{bn(qadaRakatsToday)}</strong><small>আজ আদায় করা কাজা রাকাত</small></div></div>;
  }
  if (kind === "quran") { const entries = data.quranEntries.filter((x) => x.date === today()); const total = data.quranEntries.reduce((n, x) => n + x.ayahTo - x.ayahFrom + 1, 0); const latest = data.quranEntries[0]; return <div className="tracker-stat-grid"><div><strong>{bn(entries.reduce((n, x) => n + x.ayahTo - x.ayahFrom + 1, 0))}</strong><small>আজকের আয়াত</small></div><div><strong>{bn(total)}</strong><small>মোট আয়াত</small></div><div><strong>{latest ? SURAHS[latest.surahFrom - 1]?.name || "সূরা" : "—"}</strong><small>{latest ? `${bn(latest.ayahFrom)}–${bn(latest.ayahTo)} · সর্বশেষ পাঠ` : "এখনো পাঠ নেই"}</small></div></div>; }
  if (kind === "dhikr") { const sessions = data.dhikrSessions.filter((x) => x.date === today()); return <div className="tracker-stat-grid"><div><strong>{bn(sessions.reduce((n, x) => n + x.count, 0))}</strong><small>আজকের জিকির</small></div><div><strong>{bn(sessions.length)}</strong><small>সেশন</small></div><div><strong>{bn(data.dhikrSessions.reduce((n, x) => n + x.count, 0))}</strong><small>মোট জিকির</small></div></div>; }
  if (kind === "fasting") { const rows = data.fastingEntries.filter((x) => x.date === today()); return <div className="tracker-stat-grid"><div><strong>{bn(rows.filter((x) => x.status === "completed").length)}</strong><small>আজ সম্পন্ন</small></div><div><strong>{bn(data.fastingEntries.filter((x) => x.category === "qada" && x.status === "completed").length)}</strong><small>কাজা সম্পন্ন</small></div><div><strong>{bn(data.fastingEntries.filter((x) => x.category === "nafl" && x.status === "completed").length)}</strong><small>নফল সম্পন্ন</small></div></div>; }
  const count = kind === "good" ? data.deedEntries.length : kind === "avoid" ? data.avoidEntries.length : kind === "ilm" ? data.studyEntries.length : kind === "habit" ? data.habitLogs.length : data.reflections.length;
  return <div className="tracker-stat-grid"><div><strong>{bn(count)}</strong><small>{kind === "good" ? "ভালো কাজের রেকর্ড" : kind === "avoid" ? "ব্যক্তিগত লগ" : kind === "ilm" ? "অধ্যয়ন রেকর্ড" : kind === "habit" ? "অভ্যাসের রেকর্ড" : "মুহাসাবা এন্ট্রি"}</small></div></div>;
}

function readTrackerTarget() {
  if (typeof window === "undefined") return { tracker: null as TrackerKind | null, prayer: null as PrayerId | null, qada: false, date: null as string | null };
  const params = new URLSearchParams(window.location.search);
  const trackerValue = params.get("tracker") as TrackerKind | null;
  const prayerValue = params.get("prayer");
  const validTracker = TRACKERS.some((item) => item.id === trackerValue) ? trackerValue : null;
  const validPrayer = ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(prayerValue || "") ? prayerValue as PrayerId : null;
  const dateValue = params.get("entryDate");
  const validDate = dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : null;
  return { tracker: validTracker, prayer: validPrayer, qada: prayerValue === "qada", date: validDate };
}
function writeTrackerTarget(tracker: TrackerKind | null, prayer?: PrayerId | "qada", entryDate?: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete("prayer");
  url.searchParams.delete("entryDate");
  if (tracker) {
    url.searchParams.set("section", "journal");
    url.searchParams.set("tracker", tracker);
    url.searchParams.set("action", "new");
  } else {
    url.searchParams.delete("tracker"); url.searchParams.delete("action");
  }
  if (prayer) url.searchParams.set("prayer", prayer);
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) url.searchParams.set("entryDate", entryDate);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function TrackerCenter({ data, onBack }: { data: WorkspaceData; onBack: () => void }) {
  const [selected, setSelected] = useState<TrackerKind | null>(null);
  const [initialPrayer, setInitialPrayer] = useState<PrayerId | null>(null);
  const [initialQada, setInitialQada] = useState(false);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [initialEditingEntry, setInitialEditingEntry] = useState<PrayerEntry | null>(null);
  const [editingRecord, setEditingRecord] = useState<{ kind: EditableTrackerKind; record: EditableTrackerRecord } | null>(null);
  const [editingExtraPrayer, setEditingExtraPrayer] = useState<ExtraPrayerEntry | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [search, setSearch] = useState("");
  const tracker = TRACKERS.find((item) => item.id === selected);
  const filtered = TRACKERS.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const applyTarget = () => {
      const target = readTrackerTarget();
      setSelected(target.tracker);
      setInitialPrayer(target.prayer);
      setInitialQada(target.qada);
      setInitialDate(target.date);
      setInitialEditingEntry(null);
      setSavedMessage("");
    };
    applyTarget();
    window.addEventListener("popstate", applyTarget);
    window.addEventListener("amar-nfser-hisab:section-change", applyTarget);
    return () => {
      window.removeEventListener("popstate", applyTarget);
      window.removeEventListener("amar-nfser-hisab:section-change", applyTarget);
    };
  }, []);

  function chooseTracker(id: TrackerKind) {
    setSelected(id); setSavedMessage(""); setInitialPrayer(null); setInitialQada(false); setInitialDate(null); setInitialEditingEntry(null);
    writeTrackerTarget(id);
  }
  function closeTracker() {
    setSelected(null); setSavedMessage(""); setInitialPrayer(null); setInitialQada(false); setInitialDate(null); setInitialEditingEntry(null);
    writeTrackerTarget(null);
  }
  async function saved() {
    await flushWorkspaceChanges();
    if (getCloudSyncState() !== "synced") {
      setSavedMessage(getCloudSyncMessage() || "রেকর্ড অনলাইনে সংরক্ষণ করা যায়নি। সংযোগ যাচাই করে আবার চেষ্টা করো।");
      return;
    }
    setSavedMessage("");
    setSelected(null); setInitialPrayer(null); setInitialQada(false); setInitialDate(null); setInitialEditingEntry(null); writeTrackerTarget(null);
  }

  return <div className="tracker-center">
    <header className="tracker-page-heading section-heading-unified">
      <div className="tracker-page-heading-copy"><button type="button" className="section-back-button" onClick={onBack} aria-label="ড্যাশবোর্ডে ফিরে যাও"><ArrowLeft size={16}/><span>ফিরে যাও</span></button></div>
      <div className="page-intro-title-chip"><h1>আত্মশুদ্ধি লিপি</h1></div>
      <span className="section-heading-spacer" aria-hidden="true"/>
    </header>
    {savedMessage && <Notice>{savedMessage}</Notice>}
    {selected && tracker ? <>
      <div className="tracker-back-row"><button type="button" className="tracker-back-button" onClick={closeTracker}><ArrowLeft size={16}/> সব ট্র্যাকার</button><span className="tracker-back-section-chip">আত্মশুদ্ধি লিপি <ChevronRight size={14}/> {tracker.short}</span></div>
      <div className="tracker-detail-layout">
        <section className="tracker-entry-column"><div className="tracker-detail-heading"><span className="tracker-detail-icon"><tracker.icon size={22}/></span><div><h2>{tracker.title}</h2></div></div>
          {selected === "prayer" ? <PrayerWizard key={`${initialPrayer || "default"}:${initialQada ? "qada" : "regular"}:${initialDate || "today"}:${initialEditingEntry?.id || "new"}`} data={data} initialPrayer={initialPrayer} initialQada={initialQada} initialDate={initialDate} initialEditingEntry={initialEditingEntry} onCancel={closeTracker}/> : selected === "quran" ? <QuranForm onSaved={saved}/> : selected === "dhikr" ? <DhikrForm data={data} onSaved={saved}/> : selected === "fasting" ? <FastingForm onSaved={saved}/> : selected === "good" ? <GoodDeedForm onSaved={saved}/> : selected === "avoid" ? <AvoidForm onSaved={saved}/> : selected === "ilm" ? <IlmForm onSaved={saved}/> : selected === "habit" ? <HabitForm data={data} onSaved={saved}/> : <ReflectionForm data={data} onSaved={saved}/>}
        </section>
        <aside className="tracker-side-column"><Panel title="সারাংশ"><TrackerSummary kind={selected} data={data}/></Panel><Panel title="সাম্প্রতিক রেকর্ড" action={<span className="tracker-mini-count">{bn(selected === "prayer" ? data.prayerEntries.length + data.extraPrayerEntries.length : selected === "quran" ? data.quranEntries.length : selected === "dhikr" ? data.dhikrSessions.length : selected === "fasting" ? data.fastingEntries.length : selected === "good" ? data.deedEntries.length : selected === "avoid" ? data.avoidEntries.length : selected === "ilm" ? data.studyEntries.length : selected === "habit" ? data.habitLogs.length : data.reflections.length)}টি</span>}><TrackerHistory kind={selected} data={data} onEditPrayer={selected === "prayer" ? (entry) => { setInitialDate(entry.date); setInitialPrayer(entry.prayer); setInitialEditingEntry(entry); writeTrackerTarget("prayer", entry.prayer, entry.date); } : undefined} onEditRecord={(kind, record) => setEditingRecord({ kind, record })} onEditExtraPrayer={setEditingExtraPrayer}/></Panel>{selected === "prayer" && <Panel title="কাজার হিসাব"><div className="qada-ledger-list">{data.qadaEntries.slice(0, 12).map((item) => <div key={item.id}><span><strong>{PRAYER_NAMES[item.prayer]}</strong><small>{formatTrackerDate(item.missedDate)} · {item.reason}</small></span><span className={`qada-status ${item.status === "pending" ? "pending" : "settled"}`}>{item.status === "pending" ? "বাকি" : "আদায় হয়েছে"}</span></div>)}</div></Panel>}</aside>
      </div>
    </> : <>
      <div className="tracker-picker-tools"><label className="tracker-search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ট্র্যাকার খুঁজে নাও"/></label><span>{bn(filtered.length)}টি বিভাগ</span></div>
      <div className="tracker-picker-grid">{filtered.map((item) => { const Icon = item.icon; return <button type="button" className="tracker-picker-card" key={item.id} onClick={() => chooseTracker(item.id)}><span className="tracker-picker-icon"><Icon size={20}/></span><span className="tracker-picker-copy"><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={17} className="tracker-picker-arrow"/></button>; })}</div>
      <div className="tracker-privacy-note"><span>তোমার পরিবর্তন অনলাইনে সংরক্ষিত হয়। সংযোগ না থাকলে নতুন রেকর্ড স্থায়ীভাবে সংরক্ষণ হবে না।</span></div>
    </>}
    {editingRecord && <TrackerRecordEditor kind={editingRecord.kind} record={editingRecord.record} onClose={() => setEditingRecord(null)}/>}
    {editingExtraPrayer && <ExtraPrayerRecordEditor record={editingExtraPrayer} onClose={() => setEditingExtraPrayer(null)}/>}
  </div>;
}
