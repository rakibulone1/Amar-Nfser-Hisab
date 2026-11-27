"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Activity, BookOpen, CalendarDays, Clock3, FileText, Heart, ImagePlus, MoonStar, Save, ShieldCheck } from "lucide-react";
import { SURAHS } from "@/modules/journal/surahs";
import { getReligiousDateKey, formatBengaliDate } from "@/lib/date/religious-date";
import { formatHijriDate } from "@/lib/date/hijri";
import { fetchJsonOnce } from "@/lib/client/fetch-json-once";

type JournalKind = "prayer" | "qada" | "fasting" | "quran" | "dhikr" | "deed" | "daily";
type Notice = { type: "success" | "error"; message: string } | null;
type PrayerComponent = { id: string; component_key: string; component_name: string; rakats: number; performed: boolean; omission_reason: string | null };
type Entry = {
  id: string; journal_date?: string; created_at?: string; title_snapshot?: string; deed_type?: string;
  prayer_name?: string; fard_method?: string; jamaat_result?: string; missed_rakat?: number; fard_reason?: string;
  components?: PrayerComponent[]; fasting_type?: string; fasting_category?: string; status?: string; reason?: string;
  count?: number; page_from?: number; page_to?: number; surah_from?: number; ayah_from?: number;
  surah_to?: number; ayah_to?: number; duration_minutes?: number; note?: string; details?: string;
  title?: string; mood?: string; body?: string; reflection?: string; gratitude?: string; next_day_focus?: string; energy_level?: number;
  attachments?: { id: string; mime_type: string; file_size: number; signed_url: string | null }[];
};
type TemplateSuggestion = { title: string; group?: string };
type Qada = { id: string; prayer_name: string; missed_on: string; status: "pending" | "settled" | "voided"; created_at: string; settled_at: string | null };

const prayerNames = [
  { id: "fajr", name: "ফজর" }, { id: "dhuhr", name: "যোহর" }, { id: "asr", name: "আসর" },
  { id: "maghrib", name: "মাগরিব" }, { id: "isha", name: "ইশা" }
] as const;
const componentsByPrayer: Record<string, { key: string; name: string; rakats: number }[]> = {
  fajr: [{ key: "fajr_sunnah", name: "ফজরের আগের সুন্নত", rakats: 2 }],
  dhuhr: [{ key: "dhuhr_before", name: "যোহরের আগের সুন্নত", rakats: 4 }, { key: "dhuhr_after", name: "যোহরের পরের সুন্নত", rakats: 2 }],
  asr: [],
  maghrib: [{ key: "maghrib_after", name: "মাগরিবের পরের সুন্নত", rakats: 2 }],
  isha: [{ key: "isha_after", name: "ইশার পরের সুন্নত", rakats: 2 }, { key: "isha_witr", name: "বিতর ওয়াজিব", rakats: 3 }]
};
const tabItems: { id: JournalKind; label: string; icon: typeof MoonStar }[] = [
  { id: "prayer", label: "সালাত", icon: MoonStar }, { id: "qada", label: "কাজা", icon: Clock3 },
  { id: "fasting", label: "সিয়াম", icon: CalendarDays }, { id: "quran", label: "কুরআন", icon: BookOpen },
  { id: "dhikr", label: "জিকির", icon: Activity }, { id: "deed", label: "ভালো-মন্দ কাজ", icon: Heart },
  { id: "daily", label: "দৈনিক জার্নাল", icon: FileText }
];
function currentLocalDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
function dateLabel(value?: string) { if (!value) return ""; return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
async function parseResponse<T>(response: Response) { return response.json() as Promise<T & { message?: string }>; }

async function compressImage(source: File): Promise<File> {
  if (!source.type.startsWith("image/")) throw new Error("শুধু ছবি যুক্ত করা যাবে।");
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  const maxDimension = 1400;
  let scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let blob: Blob | null = null;
  const mime = "image/webp";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("ছবি প্রস্তুত করা যায়নি।");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, Math.max(0.42, 0.88 - attempt * 0.07)));
    if (blob && blob.size <= 100 * 1024) break;
    scale *= 0.82;
  }
  bitmap.close();
  if (!blob || blob.size > 100 * 1024) throw new Error("ছবিটি ১০০ KB-এর মধ্যে সংকুচিত করা যায়নি। ছোট ছবি বেছে নাও।");
  const actualMime = blob.type === "image/webp" ? "image/webp" : "image/png";
  const extension = actualMime === "image/png" ? "png" : "webp";
  return new File([blob], `journal-image.${extension}`, { type: actualMime, lastModified: Date.now() });
}

async function uploadAttachment(file: File, entityType: "daily_journal" | "deed_log", entityId: string) {
  const compressed = await compressImage(file);
  const form = new FormData();
  form.set("entityType", entityType); form.set("entityId", entityId); form.set("file", compressed);
  const response = await fetch("/api/attachments", { method: "POST", body: form });
  const result = await parseResponse<{ attachment?: { id: string } }>(response);
  if (!response.ok) throw new Error(result.message || "ছবি আপলোড করা যায়নি।");
}

export function JournalWorkspace({ initialJournalDate, timeZone, maghribTime, hijriAdjustmentDays }: { initialJournalDate: string; timeZone: string; maghribTime: string | null; hijriAdjustmentDays: number }) {
  const [tab, setTab] = useState<JournalKind>("prayer");
  const [journalDate, setJournalDate] = useState(initialJournalDate || currentLocalDate());
  const [dateOverride, setDateOverride] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [templates, setTemplates] = useState<TemplateSuggestion[]>([]);
  const [qada, setQada] = useState<Qada[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    try {
      if (tab === "qada") {
        const result = await fetchJsonOnce<{ obligations?: Qada[]; message?: string }>("/api/qada");
        if (!result.ok) throw new Error(result.data.message || "কাজার হিসাব লোড করা যায়নি।");
        setQada(result.data.obligations ?? []); setEntries([]); setTemplates([]);
      } else {
        const result = await fetchJsonOnce<{ entries?: Entry[]; templates?: TemplateSuggestion[]; message?: string }>(`/api/entries?kind=${tab}&date=${journalDate}`);
        if (!result.ok) throw new Error(result.data.message || "এন্ট্রি লোড করা যায়নি। SQL Migration পরীক্ষা করো।");
        setEntries(result.data.entries ?? []); setTemplates(result.data.templates ?? []);
      }
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "তথ্য লোড করা যায়নি।" }); }
    finally { setLoading(false); }
  }, [tab, journalDate]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (dateOverride) return;
    const updateDate = () => setJournalDate(getReligiousDateKey(new Date(), timeZone, maghribTime).dateKey);
    const interval = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(interval);
  }, [dateOverride, timeZone, maghribTime]);

  async function submitEntry(body: Record<string, unknown>, file?: File | null, fileType?: "daily_journal" | "deed_log") {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await parseResponse<{ id?: string; message?: string }>(response);
      if (!response.ok || !result.id) throw new Error(result.message || "রেকর্ড সংরক্ষণ করা যায়নি।");
      let message = result.message || "রেকর্ড সংরক্ষিত হয়েছে।";
      if (file && fileType) {
        try { await uploadAttachment(file, fileType, result.id); message += " ছবিও যুক্ত হয়েছে।"; }
        catch (error) { message += ` তবে ছবি যুক্ত হয়নি: ${error instanceof Error ? error.message : "ত্রুটি"}`; }
      }
      setNotice({ type: "success", message }); await load();
      return true;
    } catch (error) { setNotice({ type: "error", message: error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি।" }); return false; }
    finally { setBusy(false); }
  }

  return (
    <div className="workspace-stack">
      <header className="workspace-heading"><div><span className="eyebrow">DAILY WORSHIP & SELF-REFLECTION</span><h1>আত্মশুদ্ধি লিপি</h1><p>ইবাদত, ভালো কাজ, ব্যক্তিগত অভ্যাস ও দৈনিক প্রতিফলনের রেকর্ড।</p></div><div className="workspace-heading-icon"><BookOpen size={25} /></div></header>
      <div className="journal-date-bar"><div><CalendarDays size={17} /><span>হিসাবের তারিখ</span></div><input className="text-input" type="date" value={journalDate} onChange={(e) => { setDateOverride(true); setLoading(true); setJournalDate(e.target.value); }} /><button className="text-button" type="button" onClick={() => { setDateOverride(false); setLoading(true); setJournalDate(getReligiousDateKey(new Date(), timeZone, maghribTime).dateKey); }}>আজকের হিসাব</button><span className="date-helper">{formatBengaliDate(journalDate)} · {formatHijriDate(journalDate, hijriAdjustmentDays)} · মাগরিবভিত্তিক</span></div>
      <div className="journal-tabs" role="tablist" aria-label="আত্মশুদ্ধি লিপির বিভাগ">{tabItems.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`journal-tab ${tab === item.id ? "active" : ""}`} onClick={() => { setLoading(true); setTab(item.id); setNotice(null); }}><Icon size={16} /><span>{item.label}</span></button>; })}</div>
      {notice && <div className={`workspace-notice ${notice.type}`} role="status">{notice.message}</div>}
      {loading ? <div className="panel workspace-loading">রেকর্ড লোড হচ্ছে…</div> : (
        <div className="journal-content-grid">
          <section className="panel journal-entry-panel">
            {tab === "prayer" && <PrayerEntryForm journalDate={journalDate} busy={busy} onSubmit={submitEntry} />}
            {tab === "qada" && <QadaPanel records={qada} onSettled={load} onNotice={setNotice} />}
            {tab === "fasting" && <FastingEntryForm journalDate={journalDate} templates={templates} busy={busy} onSubmit={submitEntry} />}
            {tab === "quran" && <QuranEntryForm journalDate={journalDate} busy={busy} onSubmit={submitEntry} />}
            {tab === "dhikr" && <DhikrEntryForm journalDate={journalDate} entries={entries} templates={templates} busy={busy} onSubmit={submitEntry} />}
            {tab === "deed" && <DeedEntryForm journalDate={journalDate} entries={entries} templates={templates} busy={busy} onSubmit={submitEntry} />}
            {tab === "daily" && <DailyJournalForm key={`${journalDate}:${entries[0]?.id ?? "new"}`} journalDate={journalDate} existing={entries[0]} busy={busy} onSubmit={submitEntry} />}
          </section>
          <aside className="panel journal-history-panel">
            <div className="panel-heading"><div><span className="eyebrow">সংরক্ষিত রেকর্ড</span><h2>{tab === "qada" ? "কাজার ইতিহাস" : tab === "prayer" ? "এই দিনের সালাত" : tab === "fasting" ? "সিয়ামের রেকর্ড" : tab === "quran" ? "তিলাওয়াতের রেকর্ড" : tab === "dhikr" ? "জিকিরের রেকর্ড" : tab === "deed" ? "কাজের রেকর্ড" : "দৈনিক জার্নাল"}</h2></div><span className="count-pill">{tab === "qada" ? qada.length.toLocaleString("bn-BD") : entries.length.toLocaleString("bn-BD")}</span></div>
            {tab === "qada" ? <QadaSummary records={qada} /> : <EntryHistory tab={tab} entries={entries} />}
          </aside>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof MoonStar }) {
  return <div className="workspace-card-title"><span className="workspace-icon"><Icon size={19} /></span><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}
function Field({ label, id, children }: { label: string; id?: string; children: ReactNode }) { return <div className="entry-field"><label className="field-label" htmlFor={id}>{label}</label>{children}</div>; }
function Submit({ busy, label = "রেকর্ড সংরক্ষণ" }: { busy: boolean; label?: string }) { return <button className="primary-button form-submit" type="submit" disabled={busy}><Save size={16} /> {busy ? "সংরক্ষণ হচ্ছে…" : label}</button>; }

function PrayerEntryForm({ journalDate, busy, onSubmit }: { journalDate: string; busy: boolean; onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [prayerName, setPrayerName] = useState("fajr");
  const [method, setMethod] = useState("");
  const [jamaatResult, setJamaatResult] = useState("");
  const [missedRakat, setMissedRakat] = useState("1");
  const [fardReason, setFardReason] = useState("");
  const [note, setNote] = useState("");
  const [components, setComponents] = useState<Record<string, { performed: boolean | null; reason: string }>>({});
  const [componentError, setComponentError] = useState("");
  const selectedComponents = componentsByPrayer[prayerName] ?? [];
  const needReason = method === "missed" || (method === "jamaat" && jamaatResult === "missed_rakat");

  function updateComponent(key: string, field: "performed" | "reason", value: boolean | string) {
    setComponentError("");
    setComponents((current) => {
      const previous = current[key] ?? { performed: null, reason: "" };
      const next = field === "performed"
        ? { ...previous, performed: Boolean(value) }
        : { ...previous, reason: String(value) };
      return { ...current, [key]: next };
    });
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const componentPayload = selectedComponents.map((item) => ({ componentKey: item.key, componentName: item.name, rakats: item.rakats, performed: components[item.key]?.performed ?? null, omissionReason: components[item.key]?.reason ?? "" }));
    if (componentPayload.some((item) => item.performed === null)) { setComponentError("প্রতিটি সুন্নত/বিতরের অবস্থা নির্বাচন করো।"); return; }
    if (componentPayload.some((item) => !item.performed && item.omissionReason.trim().length < 2)) { setComponentError("যে অংশ আদায় হয়নি, তার কারণ লিখো।"); return; }
    setComponentError("");
    await onSubmit({ kind: "prayer", journalDate, prayerName, fardMethod: method, jamaatResult: method === "jamaat" ? jamaatResult : null, missedRakat: method === "jamaat" && jamaatResult === "missed_rakat" ? Number(missedRakat) : 0, fardReason: needReason ? fardReason : "", performedAt: method === "missed" ? null : new Date().toISOString(), note, components: componentPayload });
  }
  return <>
    <SectionTitle title="সালাতের হিসাব" subtitle="প্রতিটি ওয়াক্তের ফরজ এবং সংশ্লিষ্ট সুন্নত / বিতরের রেকর্ড" icon={MoonStar} />
    <form className="entry-form" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="ওয়াক্ত নির্বাচন" id="prayer-name"><select id="prayer-name" className="text-input" value={prayerName} onChange={(e) => { setPrayerName(e.target.value); setComponents({}); setFardReason(""); }} >{prayerNames.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <div className="entry-section-divider"><span>ফরজ সালাত</span></div>
      <div className="choice-grid three-col">
        <label className={`choice-card ${method === "jamaat" ? "selected" : ""}`}><input type="radio" name="fard-method" value="jamaat" required checked={method === "jamaat"} onChange={() => { setMethod("jamaat"); setJamaatResult(""); }} /><span>জামাতে</span></label>
        <label className={`choice-card ${method === "individual" ? "selected" : ""}`}><input type="radio" name="fard-method" value="individual" required checked={method === "individual"} onChange={() => setMethod("individual")} /><span>একাকী</span></label>
        <label className={`choice-card ${method === "missed" ? "selected" : ""}`}><input type="radio" name="fard-method" value="missed" required checked={method === "missed"} onChange={() => setMethod("missed")} /><span>আদায় হয়নি</span></label>
      </div>
      {method === "jamaat" && <div className="nested-field-panel"><Field label="জামাতে যোগদানের অবস্থা" id="jamaat-result"><select id="jamaat-result" className="text-input" value={jamaatResult} onChange={(e) => setJamaatResult(e.target.value)} required><option value="" disabled>অবস্থা বেছে নাও</option><option value="takbir_ula">তাকবিরে উলা পেয়েছি</option><option value="late_complete">দেরিতে গিয়েছি, সব রাকাত পেয়েছি</option><option value="missed_rakat">এক বা একাধিক রাকাত মিস হয়েছে</option></select></Field>{jamaatResult === "missed_rakat" && <><Field label="কয় রাকাত মিস হয়েছে" id="missed-rakat"><select id="missed-rakat" className="text-input" value={missedRakat} onChange={(e) => setMissedRakat(e.target.value)}><option value="1">১ রাকাত</option><option value="2">২ রাকাত</option><option value="3">৩ রাকাত</option></select></Field><Field label="দেরির কারণ" id="jamaat-reason"><textarea id="jamaat-reason" className="text-area" rows={2} value={fardReason} onChange={(e) => setFardReason(e.target.value)} required minLength={2} /></Field></>}</div>}
      {method === "missed" && <Field label="কেন সালাত আদায় হয়নি?" id="missed-reason"><textarea id="missed-reason" className="text-area" rows={3} value={fardReason} onChange={(e) => setFardReason(e.target.value)} required minLength={2} /></Field>}
      {selectedComponents.length > 0 && <><div className="entry-section-divider"><span>সুন্নত ও বিতরের হিসাব</span></div><div className="component-list">{selectedComponents.map((item) => { const current = components[item.key] ?? { performed: null, reason: "" }; return <div className="component-item" key={item.key}><div className="component-item-top"><div><strong>{item.name}</strong><span>{item.rakats.toLocaleString("bn-BD")} রাকাত</span></div><div className="component-choice"><label className={`switch-label ${current.performed === true ? "selected" : ""}`}><input type="radio" name={`component-${item.key}`} required checked={current.performed === true} onChange={() => updateComponent(item.key, "performed", true)} /><span>আদায় হয়েছে</span></label><label className={`switch-label ${current.performed === false ? "selected" : ""}`}><input type="radio" name={`component-${item.key}`} required checked={current.performed === false} onChange={() => updateComponent(item.key, "performed", false)} /><span>আদায় হয়নি</span></label></div></div>{current.performed === false && <Field label="বাদ দেওয়ার কারণ" id={`${item.key}-reason`}><textarea id={`${item.key}-reason`} className="text-area" rows={2} value={current.reason} onChange={(e) => updateComponent(item.key, "reason", e.target.value)} required minLength={2} /></Field>}</div>; })}</div></>}
      {componentError && <div className="workspace-notice error">{componentError}</div>}
      <Field label="অতিরিক্ত নোট (ঐচ্ছিক)" id="prayer-note"><textarea id="prayer-note" className="text-area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /></Field>
      <div className="form-footnote"><ShieldCheck size={15} /> একই তারিখ ও ওয়াক্তের পুরোনো রেকর্ড আপডেট হবে।</div>
      <Submit busy={busy} label="সালাতের হিসাব সংরক্ষণ" />
    </form>
  </>;
}

function QadaPanel({ records, onSettled, onNotice }: { records: Qada[]; onSettled: () => Promise<void>; onNotice: (notice: Notice) => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = records.filter((item) => item.status === "pending");
  async function settle(record: Qada) {
    setBusyId(record.id);
    try {
      const response = await fetch("/api/qada", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ obligationId: record.id }) });
      const result = await parseResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(result.message || "কাজা রেকর্ড করা যায়নি।");
      onNotice({ type: "success", message: "কাজা আদায়ের হিসাব সংরক্ষিত হয়েছে।" }); await onSettled();
    } catch (error) { onNotice({ type: "error", message: error instanceof Error ? error.message : "কাজা রেকর্ড করা যায়নি।" }); }
    finally { setBusyId(null); }
  }
  return <><SectionTitle title="কাজা সালাত" subtitle="যে ফরজ সালাত আদায় হয়নি তার বকেয়া হিসাব" icon={Clock3} /><div className="qada-summary"><strong>{pending.length.toLocaleString("bn-BD")}</strong><span>টি কাজা সালাত বাকি</span></div>{pending.length ? <div className="qada-list">{pending.map((item) => <div className="qada-row" key={item.id}><div><strong>{prayerNames.find((p) => p.id === item.prayer_name)?.name || item.prayer_name}</strong><span>{dateLabel(item.missed_on)}</span></div><button className="secondary-button" onClick={() => void settle(item)} disabled={busyId === item.id}>{busyId === item.id ? "সংরক্ষণ…" : "আদায় হয়েছে"}</button></div>)}</div> : <div className="empty-inline">বর্তমানে কোনো বকেয়া কাজা রেকর্ড নেই।</div>}<div className="form-footnote"><ShieldCheck size={15} /> কাজা আদায়ের পর পুরোনো রেকর্ড থাকে; Settlement আলাদা সংরক্ষিত হয়।</div></>;
}
function QadaSummary({ records }: { records: Qada[] }) {
  const pending = records.filter((item) => item.status === "pending").length;
  const settled = records.filter((item) => item.status === "settled").length;
  return <div className="history-metrics"><div><strong>{pending.toLocaleString("bn-BD")}</strong><span>বাকি</span></div><div><strong>{settled.toLocaleString("bn-BD")}</strong><span>আদায় হয়েছে</span></div>{records.filter((item) => item.status === "settled").slice(0, 8).map((item) => <div className="history-compact-row" key={item.id}><span>{prayerNames.find((p) => p.id === item.prayer_name)?.name}</span><time>{dateLabel(item.missed_on)}</time><span className="status-pill status-completed">আদায়</span></div>)}</div>;
}

function FastingEntryForm({ journalDate, templates, busy, onSubmit }: { journalDate: string; templates: TemplateSuggestion[]; busy: boolean; onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [type, setType] = useState(""); const [category, setCategory] = useState(""); const [custom, setCustom] = useState("");
  const [status, setStatus] = useState(""); const [reason, setReason] = useState(""); const [note, setNote] = useState(""); const [saveTemplate, setSaveTemplate] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await onSubmit({ kind: "fasting", journalDate, fastingType: type, fastingCategory: category, customLabel: category === "custom" ? custom : "", saveAsTemplate: saveTemplate, status, reason, note }); }
  return <><SectionTitle title="সিয়ামের হিসাব" subtitle="ফরজ, সুন্নত ও নফল সিয়ামের দৈনিক রেকর্ড" icon={MoonStar} /><form className="entry-form" onSubmit={(event) => void submit(event)}><Field label="সিয়ামের ধরন" id="fasting-type"><select id="fasting-type" className="text-input" value={type} onChange={(e) => setType(e.target.value)} required><option value="" disabled>ধরন বেছে নাও</option><option value="obligatory">ফরজ</option><option value="sunnah">সুন্নত</option><option value="nafl">নফল</option></select></Field><Field label="সিয়ামের বিভাগ" id="fasting-category"><select id="fasting-category" className="text-input" value={category} onChange={(e) => setCategory(e.target.value)} required><option value="" disabled>বিভাগ বেছে নাও</option><option value="ramadan">রমজান</option><option value="qada">কাজা</option><option value="vow">মানত</option><option value="monday">সোমবার</option><option value="thursday">বৃহস্পতিবার</option><option value="white_days">আইয়ামে বীজ</option><option value="arafah">আরাফার দিন</option><option value="ashura">আশুরা</option><option value="shawwal">শাওয়ালের সিয়াম</option><option value="custom">নিজস্ব</option></select></Field>{category === "custom" && <><Field label="নিজস্ব নাম" id="fast-custom"><input id="fast-custom" className="text-input" list="fasting-suggestions" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={120} required /><datalist id="fasting-suggestions">{templates.map((item) => <option key={item.title} value={item.title} />)}</datalist></Field><label className="check-line"><input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} /> পরেরবারের জন্য নামটি সংরক্ষণ করো</label></>}<Field label="অবস্থা" id="fasting-status"><select id="fasting-status" className="text-input" value={status} onChange={(e) => setStatus(e.target.value)} required><option value="" disabled>অবস্থা বেছে নাও</option><option value="completed">সম্পন্ন</option><option value="missed">রাখা হয়নি</option><option value="excused">শরয়ি ওজরে রাখা হয়নি</option></select></Field>{status !== "completed" && <Field label="কারণ" id="fasting-reason"><textarea id="fasting-reason" className="text-area" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} minLength={2} required /></Field>}<Field label="নোট (ঐচ্ছিক)" id="fasting-note"><textarea id="fasting-note" className="text-area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /></Field><div className="form-footnote"><CalendarDays size={15} /> {dateLabel(journalDate)} — দিনে একটি সিয়াম রেকর্ড; পুনরায় সংরক্ষণ করলে আপডেট হবে।</div><Submit busy={busy} label="সিয়ামের হিসাব সংরক্ষণ" /></form></>;
}

function QuranEntryForm({ journalDate, busy, onSubmit }: { journalDate: string; busy: boolean; onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [surahFrom, setSurahFrom] = useState(""); const [ayahFrom, setAyahFrom] = useState(""); const [surahTo, setSurahTo] = useState(""); const [ayahTo, setAyahTo] = useState("");
  const [pageFrom, setPageFrom] = useState(""); const [pageTo, setPageTo] = useState(""); const [duration, setDuration] = useState(""); const [note, setNote] = useState("");
  const pageRangeStarted = pageFrom.trim() !== "" || pageTo.trim() !== "";
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const usePages = pageFrom.trim() !== "" && pageTo.trim() !== ""; await onSubmit({ kind: "quran", journalDate, surahFrom: usePages ? null : Number(surahFrom), ayahFrom: usePages ? null : Number(ayahFrom), surahTo: usePages ? null : Number(surahTo), ayahTo: usePages ? null : Number(ayahTo), pageFrom: usePages ? Number(pageFrom) : null, pageTo: usePages ? Number(pageTo) : null, durationMinutes: duration ? Number(duration) : null, note }); }
  return <><SectionTitle title="কুরআন তিলাওয়াত" subtitle="সূরা-আয়াত অথবা পৃষ্ঠার পরিসর অনুযায়ী অগ্রগতি সংরক্ষণ" icon={BookOpen} /><form className="entry-form" onSubmit={(event) => void submit(event)}><div className="entry-section-divider"><span>সূরা ও আয়াত</span></div><div className="form-two-col"><Field label="শুরু সূরা" id="surah-from"><select id="surah-from" className="text-input" value={surahFrom} onChange={(e) => setSurahFrom(e.target.value)}>{SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number.toLocaleString("bn-BD")}. {s.name}</option>)}</select></Field><Field label="শুরু আয়াত" id="ayah-from"><input id="ayah-from" className="text-input" type="number" min="1" max="300" value={ayahFrom} onChange={(e) => setAyahFrom(e.target.value)} required={!pageRangeStarted} /></Field></div><div className="form-two-col"><Field label="শেষ সূরা" id="surah-to"><select id="surah-to" className="text-input" value={surahTo} onChange={(e) => setSurahTo(e.target.value)}>{SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number.toLocaleString("bn-BD")}. {s.name}</option>)}</select></Field><Field label="শেষ আয়াত" id="ayah-to"><input id="ayah-to" className="text-input" type="number" min="1" max="300" value={ayahTo} onChange={(e) => setAyahTo(e.target.value)} required={!pageRangeStarted} /></Field></div><div className="entry-section-divider"><span>অথবা পৃষ্ঠা</span></div><div className="form-two-col"><Field label="শুরু পৃষ্ঠা" id="page-from"><input id="page-from" className="text-input" type="number" min="1" max="604" value={pageFrom} onChange={(e) => setPageFrom(e.target.value)} placeholder="ঐচ্ছিক" required={pageRangeStarted} /></Field><Field label="শেষ পৃষ্ঠা" id="page-to"><input id="page-to" className="text-input" type="number" min="1" max="604" value={pageTo} onChange={(e) => setPageTo(e.target.value)} placeholder="ঐচ্ছিক" required={pageRangeStarted} /></Field></div><Field label="তিলাওয়াতের সময় (মিনিট)" id="quran-duration"><input id="quran-duration" className="text-input" type="number" min="1" max="1440" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field><Field label="নোট (ঐচ্ছিক)" id="quran-note"><textarea id="quran-note" className="text-area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1500} /></Field><div className="form-footnote">আয়াত অথবা পৃষ্ঠার যেকোনো একটি পরিসর দাও।</div><Submit busy={busy} label="তিলাওয়াত সংরক্ষণ" /></form></>;
}

function DhikrEntryForm({ journalDate, entries, templates, busy, onSubmit }: { journalDate: string; entries: Entry[]; templates: TemplateSuggestion[]; busy: boolean; onSubmit: (body: Record<string, unknown>) => Promise<boolean> }) {
  const suggestions = Array.from(new Set([...templates.map((item) => item.title), ...entries.map((item) => item.title_snapshot).filter((title): title is string => Boolean(title))]));
  const [title, setTitle] = useState(""); const [category, setCategory] = useState("general"); const [count, setCount] = useState(""); const [target, setTarget] = useState(""); const [note, setNote] = useState(""); const [saveTemplate, setSaveTemplate] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await onSubmit({ kind: "dhikr", journalDate, title, category, count: Number(count), targetCount: target ? Number(target) : null, note, saveAsTemplate: saveTemplate, performedAt: new Date().toISOString() }); }
  return <><SectionTitle title="জিকির ও তাসবিহ" subtitle="নিজস্ব জিকির তৈরি, সংখ্যা গণনা ও দৈনিক রেকর্ড" icon={Activity} /><form className="entry-form" onSubmit={(event) => void submit(event)}><Field label="জিকিরের নাম" id="dhikr-title"><input id="dhikr-title" className="text-input" list="dhikr-suggestions" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="নাম লিখো বা আগেরটি বেছে নাও" /><datalist id="dhikr-suggestions">{suggestions.map((item) => <option key={item} value={item} />)}</datalist></Field><Field label="বিভাগ" id="dhikr-category"><select id="dhikr-category" className="text-input" value={category} onChange={(e) => setCategory(e.target.value)}><option value="morning">সকালের জিকির</option><option value="evening">সন্ধ্যার জিকির</option><option value="after_prayer">সালাতের পর</option><option value="general">সাধারণ</option><option value="custom">নিজস্ব</option></select></Field><div className="form-two-col"><Field label="পড়ার সংখ্যা" id="dhikr-count"><input id="dhikr-count" className="text-input" type="number" min="1" max="1000000" value={count} onChange={(e) => setCount(e.target.value)} required /></Field><Field label="লক্ষ্যমাত্রা (ঐচ্ছিক)" id="dhikr-target"><input id="dhikr-target" className="text-input" type="number" min="1" max="1000000" value={target} onChange={(e) => setTarget(e.target.value)} /></Field></div><Field label="নোট (ঐচ্ছিক)" id="dhikr-note"><textarea id="dhikr-note" className="text-area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1200} /></Field><label className="check-line"><input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} /> পরেরবারের জন্য নামটি সংরক্ষণ করো</label><Submit busy={busy} label="জিকিরের হিসাব সংরক্ষণ" /></form></>;
}

function DeedEntryForm({ journalDate, entries, templates, busy, onSubmit }: { journalDate: string; entries: Entry[]; templates: TemplateSuggestion[]; busy: boolean; onSubmit: (body: Record<string, unknown>, file?: File | null, fileType?: "daily_journal" | "deed_log") => Promise<boolean> }) {
  const [type, setType] = useState("good"); const [title, setTitle] = useState(""); const [details, setDetails] = useState(""); const [saveTemplate, setSaveTemplate] = useState(false); const [file, setFile] = useState<File | null>(null);
  const suggestions = Array.from(new Set([...templates.filter((item) => item.group === type).map((item) => item.title), ...entries.filter((item) => item.deed_type === type).map((item) => item.title_snapshot).filter((value): value is string => Boolean(value))]));
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const ok = await onSubmit({ kind: "deed", journalDate, deedType: type, title, details, saveAsTemplate: saveTemplate, occurredAt: new Date().toISOString() }, file, "deed_log"); if (ok) { setTitle(""); setDetails(""); setFile(null); setSaveTemplate(false); const input = document.getElementById("deed-image") as HTMLInputElement | null; if (input) input.value = ""; } }
  return <><SectionTitle title="ভালো ও অনাকাঙ্ক্ষিত কাজ" subtitle="দিনের কাজগুলো লিখে রাখো; নিজের আচরণ বুঝতে রেকর্ড ব্যবহার করো" icon={Heart} /><form className="entry-form" onSubmit={(event) => void submit(event)}><div className="choice-grid two-col"><label className={`choice-card ${type === "good" ? "selected" : ""}`}><input type="radio" name="deed-type" checked={type === "good"} onChange={() => setType("good")} /><span>ভালো কাজ</span></label><label className={`choice-card ${type === "bad" ? "selected" : ""}`}><input type="radio" name="deed-type" checked={type === "bad"} onChange={() => setType("bad")} /><span>অনাকাঙ্ক্ষিত কাজ</span></label></div><Field label="কাজের নাম" id="deed-title"><input id="deed-title" className="text-input" list="deed-suggestions" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required placeholder="কাজের নাম লিখো বা আগেরটি বেছে নাও" /><datalist id="deed-suggestions">{suggestions.map((item) => <option key={item} value={item} />)}</datalist></Field><Field label="বিস্তারিত / পরিস্থিতি" id="deed-details"><textarea id="deed-details" className="text-area" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} /></Field><Field label="রেফারেন্স ছবি (সর্বোচ্চ ১০০ KB)" id="deed-image"><div className="file-input-wrap"><ImagePlus size={17} /><input id="deed-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>{file && <span className="file-selected">{file.name} · আপলোডের আগে ১০০ KB-এর মধ্যে সংকুচিত হবে</span>}</Field><label className="check-line"><input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} /> পরেরবারের জন্য কাজের নামটি সাজেশনে রাখো</label><div className="form-footnote">রেকর্ড ব্যক্তিগত থাকবে; এখানে কোনো নৈতিক স্কোর গণনা করা হয় না।</div><Submit busy={busy} label="কাজের রেকর্ড সংরক্ষণ" /></form></>;
}

function DailyJournalForm({ journalDate, existing, busy, onSubmit }: { journalDate: string; existing?: Entry; busy: boolean; onSubmit: (body: Record<string, unknown>, file?: File | null, fileType?: "daily_journal" | "deed_log") => Promise<boolean> }) {
  const [title, setTitle] = useState(existing?.title || ""); const [mood, setMood] = useState(existing?.mood || "");
  const [energy, setEnergy] = useState(existing?.energy_level ? String(existing.energy_level) : ""); const [body, setBody] = useState(existing?.body || ""); const [reflection, setReflection] = useState(existing?.reflection || ""); const [gratitude, setGratitude] = useState(existing?.gratitude || ""); const [focus, setFocus] = useState(existing?.next_day_focus || ""); const [file, setFile] = useState<File | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const saved = await onSubmit({ kind: "daily", journalDate, title, mood: mood || null, energyLevel: energy ? Number(energy) : null, body, reflection, gratitude, nextDayFocus: focus }, file, "daily_journal"); if (saved) { setFile(null); const input = document.getElementById("daily-image") as HTMLInputElement | null; if (input) input.value = ""; } }
  return <><SectionTitle title="দৈনিক জার্নাল" subtitle={`${dateLabel(journalDate)}-এর অভিজ্ঞতা, আত্মপর্যালোচনা ও আগামী দিনের প্রস্তুতি`} icon={FileText} /><form className="entry-form" onSubmit={(event) => void submit(event)}><Field label="দিনের শিরোনাম" id="daily-title"><input id="daily-title" className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="আজকের দিনের সংক্ষিপ্ত নাম" /></Field><div className="form-two-col"><Field label="আজকের অনুভূতি" id="daily-mood"><select id="daily-mood" className="text-input" value={mood} onChange={(e) => setMood(e.target.value)}><option value="" disabled>অনুভূতি বেছে নাও</option><option value="peaceful">শান্ত</option><option value="grateful">কৃতজ্ঞ</option><option value="hopeful">আশাবাদী</option><option value="neutral">স্বাভাবিক</option><option value="stressed">চাপ অনুভব</option><option value="sad">মন খারাপ</option><option value="tired">ক্লান্ত</option></select></Field><Field label="শক্তি / উদ্যম" id="daily-energy"><select id="daily-energy" className="text-input" value={energy} onChange={(e) => setEnergy(e.target.value)}><option value="" disabled>উদ্যম বেছে নাও</option><option value="1">১ — খুব কম</option><option value="2">২</option><option value="3">৩ — মাঝারি</option><option value="4">৪</option><option value="5">৫ — ভালো</option></select></Field></div><Field label="দিনের বিবরণ" id="daily-body"><textarea id="daily-body" className="text-area large-textarea" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={12000} placeholder="আজ কী কী ঘটেছে?" /></Field><Field label="নিজের প্রতি পর্যালোচনা" id="daily-reflection"><textarea id="daily-reflection" className="text-area" rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} maxLength={5000} /></Field><Field label="আজকের কৃতজ্ঞতা" id="daily-gratitude"><textarea id="daily-gratitude" className="text-area" rows={2} value={gratitude} onChange={(e) => setGratitude(e.target.value)} maxLength={3000} /></Field><Field label="আগামী দিনের অগ্রাধিকার" id="daily-focus"><textarea id="daily-focus" className="text-area" rows={2} value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={2000} /></Field><Field label="রেফারেন্স ছবি (সর্বোচ্চ ১০০ KB)" id="daily-image"><div className="file-input-wrap"><ImagePlus size={17} /><input id="daily-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>{file && <span className="file-selected">{file.name} · আপলোডের আগে ১০০ KB-এর মধ্যে সংকুচিত হবে</span>}</Field><div className="form-footnote"><ShieldCheck size={15} /> একই দিনের জার্নাল পুনরায় সংরক্ষণ করলে আগের লেখাটি আপডেট হবে।</div><Submit busy={busy} label={existing ? "জার্নাল আপডেট" : "জার্নাল সংরক্ষণ"} /></form></>;
}

function EntryHistory({ tab, entries }: { tab: JournalKind; entries: Entry[] }) {
  if (!entries.length) return <div className="empty-inline">এই তারিখে এখনো কোনো রেকর্ড নেই।</div>;
  return <div className="entry-history-list">{entries.slice(0, 12).map((item) => <article className="entry-history-item" key={item.id}>
    {tab === "prayer" && <><div className="history-item-heading"><strong>{prayerNames.find((p) => p.id === item.prayer_name)?.name || item.prayer_name}</strong><span className={`status-pill ${item.fard_method === "missed" ? "status-paused" : "status-completed"}`}>{item.fard_method === "jamaat" ? "জামাত" : item.fard_method === "individual" ? "একাকী" : "আদায় হয়নি"}</span></div>{item.jamaat_result && <p>{item.jamaat_result === "takbir_ula" ? "তাকবিরে উলা" : item.jamaat_result === "late_complete" ? "দেরিতে, সব রাকাত" : `${(item.missed_rakat || 0).toLocaleString("bn-BD")} রাকাত মিস`}</p>}{item.components?.map((part) => <span className="history-detail-chip" key={part.id}>{part.component_name}: {part.performed ? "আদায়" : "বাদ"}</span>)}{item.fard_reason && <small>কারণ: {item.fard_reason}</small>}</>}
    {tab === "fasting" && <><div className="history-item-heading"><strong>{item.fasting_category === "ramadan" ? "রমজান" : item.fasting_category === "qada" ? "কাজা" : item.fasting_category === "monday" ? "সোমবার" : item.fasting_category === "thursday" ? "বৃহস্পতিবার" : item.fasting_category === "custom" ? "নিজস্ব" : item.fasting_category}</strong><span className="status-pill status-completed">{item.status === "completed" ? "সম্পন্ন" : item.status === "missed" ? "রাখা হয়নি" : "ওজর"}</span></div>{item.reason && <small>{item.reason}</small>}</>}
    {tab === "quran" && <><div className="history-item-heading"><strong>তিলাওয়াত</strong><span>{item.duration_minutes ? `${Number(item.duration_minutes).toLocaleString("bn-BD")} মিনিট` : ""}</span></div><p>{item.page_from ? `পৃষ্ঠা ${item.page_from}–${item.page_to}` : `সূরা ${item.surah_from} : ${item.ayah_from} থেকে ${item.surah_to} : ${item.ayah_to}`}</p></>}
    {tab === "dhikr" && <><div className="history-item-heading"><strong>{item.title_snapshot}</strong><b>{Number(item.count || 0).toLocaleString("bn-BD")}</b></div><small>{item.note || "জিকিরের হিসাব"}</small></>}
    {tab === "deed" && <><div className="history-item-heading"><strong>{item.title_snapshot}</strong><span className={`status-pill ${item.deed_type === "good" ? "status-completed" : "status-paused"}`}>{item.deed_type === "good" ? "ভালো কাজ" : "অনাকাঙ্ক্ষিত কাজ"}</span></div>{item.details && <p>{item.details}</p>}</>}
    {tab === "daily" && <><div className="history-item-heading"><strong>{item.title || "দৈনিক জার্নাল"}</strong><span>{item.mood || ""}</span></div>{item.body && <p>{item.body}</p>}</>}
    {item.attachments?.map((attachment) => attachment.signed_url ? <a className="attachment-link" key={attachment.id} href={attachment.signed_url} target="_blank" rel="noreferrer">রেফারেন্স ছবি দেখো · {Math.ceil(attachment.file_size / 1024).toLocaleString("bn-BD")} KB</a> : null)}
    <time>{dateLabel(item.journal_date)}</time>
  </article>)}</div>;
}
