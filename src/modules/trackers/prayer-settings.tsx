"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlarmClock, Bell, CheckCircle2, MapPin, Plus, Save, ShieldCheck, X } from "lucide-react";
import { getLocalDataSnapshot, getLocalJournalDate, updateLocalData, type LocalAppData, type PrayerId, type PrayerPartCategory } from "@/lib/local/store";
import { getPrayerWaqtWindow, nextDhakaDate } from "@/lib/prayer-time";

const PRAYERS: PrayerId[] = ["maghrib", "isha", "fajr", "dhuhr", "asr"];
const LABELS: Record<PrayerId, string> = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
const CATEGORIES: { id: PrayerPartCategory; label: string }[] = [{ id: "sunnah", label: "সুন্নত" }, { id: "fard", label: "ফরজ" }, { id: "wajib", label: "ওয়াজিব" }, { id: "nafl", label: "নফল" }];
const bn = (n: number) => n.toLocaleString("bn-BD");

export function PrayerSettingsPanel({ data }: { data: LocalAppData }) {
  const [prayer, setPrayer] = useState<PrayerId>("maghrib");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<PrayerPartCategory>("nafl");
  const [rakats, setRakats] = useState("2");
  const [saved, setSaved] = useState("");
  const [pendingDisableId, setPendingDisableId] = useState("");
  const [disableReason, setDisableReason] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [locationMessage, setLocationMessage] = useState("");
  const [mosqueDraft, setMosqueDraft] = useState(data.prayerPreferences.mosqueTimes);
  const [locationLabel, setLocationLabel] = useState(data.prayerPreferences.locationLabel);
  const [latitude, setLatitude] = useState(String(data.prayerPreferences.latitude));
  const [longitude, setLongitude] = useState(String(data.prayerPreferences.longitude));
  const [leadMinutes, setLeadMinutes] = useState(String(data.prayerPreferences.mosqueReminderMinutes));
  const [nightReminder, setNightReminder] = useState(data.prayerPreferences.nightQadaReminder);
  const [waqtPrompt, setWaqtPrompt] = useState(data.prayerPreferences.waqtEndPrompt);
  const [remindersEnabled, setRemindersEnabled] = useState(data.preferences.remindersEnabled);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMosqueDraft(data.prayerPreferences.mosqueTimes);
      setLocationLabel(data.prayerPreferences.locationLabel);
      setLatitude(String(data.prayerPreferences.latitude));
      setLongitude(String(data.prayerPreferences.longitude));
      setLeadMinutes(String(data.prayerPreferences.mosqueReminderMinutes));
      setNightReminder(data.prayerPreferences.nightQadaReminder);
      setWaqtPrompt(data.prayerPreferences.waqtEndPrompt);
      setRemindersEnabled(data.preferences.remindersEnabled);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.prayerPreferences, data.preferences.remindersEnabled]);
  const activeParts = data.prayerConfig[prayer];

  function updatePart(id: string, patch: Partial<(typeof activeParts)[number]>) {
    updateLocalData((current) => ({ ...current, prayerConfig: { ...current.prayerConfig, [prayer]: current.prayerConfig[prayer].map((part) => part.id === id ? { ...part, ...patch } : part) } }));
  }
  function requestPartDisable(part: (typeof activeParts)[number]) {
    if (part.category === "fard" || part.required) return;
    if (part.category === "sunnah" && part.enabled) {
      setPendingDisableId(part.id);
      setDisableReason(part.omissionReason || "");
      return;
    }
    updatePart(part.id, { enabled: false });
  }
  function confirmPartDisable() {
    if (!pendingDisableId || disableReason.trim().length < 3) return;
    updatePart(pendingDisableId, { enabled: false, omissionReason: disableReason.trim().slice(0, 1200) });
    setPendingDisableId(""); setDisableReason("");
    setSaved("সুন্নত অংশটি বাদ দেওয়ার কারণসহ সংরক্ষিত হয়েছে।");
  }
  function addPart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!label.trim()) return;
    updateLocalData((current) => ({ ...current, prayerConfig: { ...current.prayerConfig, [prayer]: [...current.prayerConfig[prayer], { id: `custom-${Date.now().toString(36)}`, label: label.trim(), category, rakats: Math.max(0, Math.min(20, Number(rakats) || 0)), enabled: true, required: false }] } }));
    setLabel(""); setRakats("2"); setSaved("সালাতের অংশ যোগ হয়েছে।");
  }
  function savePrayerSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lat = Number(latitude); const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) { setSaved("অবস্থানের অক্ষাংশ ও দ্রাঘিমাংশ সঠিকভাবে লিখো।"); return; }
    updateLocalData((current) => ({ ...current, preferences: { ...current.preferences, remindersEnabled }, prayerPreferences: { ...current.prayerPreferences, locationLabel: locationLabel.trim() || "নির্বাচিত অবস্থান", latitude: lat, longitude: lon, mosqueTimes: mosqueDraft, mosqueReminderMinutes: Math.max(1, Math.min(120, Number(leadMinutes) || 10)), nightQadaReminder: nightReminder, waqtEndPrompt: waqtPrompt } }));
    setSaved("সালাতের সময় ও জামাতের সেটিংস সংরক্ষিত হয়েছে।");
  }
  async function askPermission() {
    if (typeof Notification === "undefined") { setPermission("unsupported"); return; }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      updateLocalData((current) => ({ ...current, prayerPreferences: { ...current.prayerPreferences, notificationPermissionAsked: true } }));
      setSaved(result === "granted" ? "নোটিফিকেশনের অনুমতি চালু হয়েছে।" : "নোটিফিকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে অনুমতি দিতে পারো।");
    } catch {
      setSaved("এই ব্রাউজারে নোটিফিকেশনের অনুমতি নেওয়া যায়নি।");
    }
  }
  function useDeviceLocation() {
    if (!navigator.geolocation) { setLocationMessage("এই ব্রাউজারে অবস্থান নেওয়া যাচ্ছে না। অক্ষাংশ ও দ্রাঘিমাংশ হাতে লিখো।"); return; }
    setLocationMessage("অবস্থান নেওয়া হচ্ছে…");
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = Number(position.coords.latitude.toFixed(5));
      const lon = Number(position.coords.longitude.toFixed(5));
      if (lat < 20.5 || lat > 26.7 || lon < 88 || lon > 92.7) {
        setLocationMessage("ডিভাইসের অবস্থান বাংলাদেশের বাইরে। বাংলাদেশের সময়সূচির জন্য বাংলাদেশের অবস্থান হাতে লিখে দাও।");
        return;
      }
      setLatitude(String(lat));
      setLongitude(String(lon));
      setLocationLabel("ডিভাইসের অবস্থান · বাংলাদেশ");
      setLocationMessage("বাংলাদেশের অবস্থান নেওয়া হয়েছে। সংরক্ষণ বাটন চাপো।");
    }, () => setLocationMessage("অবস্থানের অনুমতি পাওয়া যায়নি। অক্ষাংশ ও দ্রাঘিমাংশ হাতে লিখতে পারো।"), { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 });
  }

  return <div className="prayer-settings-stack">
    <section className="tracker-panel"><header className="tracker-panel-heading"><div><h3>ওয়াক্তের সময় গণনা</h3><p>বাংলাদেশের অবস্থান অনুযায়ী স্বয়ংক্রিয় হিসাব</p></div><span className="prayer-method-badge">হানাফি</span></header><div className="prayer-method-explain"><div><strong>গণনা পদ্ধতি</strong><span>করাচি গণনা পদ্ধতি · ১</span></div><div><strong>আসরের পদ্ধতি</strong><span>হানাফি আসর পদ্ধতি · ১</span></div><p>এটি ওয়াক্তের হিসাব। মসজিদের জামাতের সময় নিচে আলাদাভাবে দাও।</p></div><form className="tracker-form" onSubmit={savePrayerSettings}><div className="tracker-form-grid"><label className="tracker-field"><span>অবস্থানের নাম</span><input className="tracker-input" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="যেমন: ময়মনসিংহ, বাংলাদেশ"/></label><div className="tracker-location-action"><button type="button" className="tracker-secondary-button" onClick={useDeviceLocation}><MapPin size={15}/> ডিভাইসের অবস্থান</button></div><label className="tracker-field"><span>অক্ষাংশ</span><input className="tracker-input" type="number" step="0.00001" min="-90" max="90" value={latitude} onChange={(e) => setLatitude(e.target.value)}/></label><label className="tracker-field"><span>দ্রাঘিমাংশ</span><input className="tracker-input" type="number" step="0.00001" min="-180" max="180" value={longitude} onChange={(e) => setLongitude(e.target.value)}/></label></div>{locationMessage && <p className="tracker-field-hint">{locationMessage}</p>}</form></section>
    <section className="tracker-panel"><header className="tracker-panel-heading"><div><h3>মসজিদের জামাতের সময়</h3><p>প্রতিটি ওয়াক্তের সময় নিজে হাতে নির্ধারণ করো</p></div><AlarmClock size={20}/></header><form className="tracker-form" onSubmit={savePrayerSettings}><div className="mosque-time-settings">{PRAYERS.map((id) => <label className="mosque-time-row" key={id}><span>{LABELS[id]}</span><input className="tracker-input" type="time" value={mosqueDraft[id]} onChange={(e) => setMosqueDraft((current) => ({ ...current, [id]: e.target.value }))}/></label>)}</div><div className="tracker-form-grid"><label className="tracker-field"><span>জামাতের কত মিনিট আগে স্মরণ করবে?</span><select className="tracker-input" value={leadMinutes} onChange={(e) => setLeadMinutes(e.target.value)}>{[5, 10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{bn(n)} মিনিট আগে</option>)}</select></label><label className="tracker-field"><span>রাতের কাজা স্মরণ</span><input className="tracker-input" type="time" value={nightReminder} onChange={(e) => setNightReminder(e.target.value)}/></label></div><label className="tracker-switch-row"><span><strong>সকল সালাতের স্মরণিকা চালু</strong><small>ওয়াক্ত, জামাত ও রাতের কাজার নোটিফিকেশন</small></span><input type="checkbox" checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)}/></label><label className="tracker-switch-row"><span><strong>ওয়াক্ত শেষের নিশ্চিতকরণ</strong><small>সময় শেষের পর জিজ্ঞেস করবে—সালাত আদায় করেছ কি না?</small></span><input type="checkbox" checked={waqtPrompt} onChange={(e) => setWaqtPrompt(e.target.checked)}/></label><button className="tracker-primary-button" type="submit"><Save size={16}/> সময়সূচি ও জামাতের সেটিংস সংরক্ষণ</button></form></section>
    <section className="tracker-panel"><header className="tracker-panel-heading"><div><h3>সালাতের রাকাত ও অংশ</h3><p>গ্লোবাল Configuration — Entry-তে এখানকার তথ্য ব্যবহৃত হবে</p></div><ShieldCheck size={20}/></header><div className="prayer-config-tabs">{PRAYERS.map((id) => <button key={id} type="button" className={prayer === id ? "active" : ""} onClick={() => setPrayer(id)}>{LABELS[id]}</button>)}</div><div className="prayer-config-list">{activeParts.map((part) => <div className="prayer-config-item" key={part.id}><div className="prayer-config-row"><label className="prayer-config-enabled"><input type="checkbox" checked={part.enabled || part.category === "fard" || part.required} disabled={part.category === "fard" || part.required} onChange={(e) => e.target.checked ? updatePart(part.id, { enabled: true, omissionReason: "" }) : requestPartDisable(part)}/><span><strong>{part.label}</strong><small>{CATEGORIES.find((c) => c.id === part.category)?.label || "অন্যান্য"}{part.category === "fard" || part.required ? " · বাধ্যতামূলক" : ""}</small></span></label><select className="tracker-input category-select" value={part.category} disabled={part.category === "fard" || part.required} onChange={(e) => updatePart(part.id, { category: e.target.value as PrayerPartCategory })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select><label className="rakat-edit"><span>রাকাত</span><input className="tracker-input" type="number" min="0" max="20" value={part.rakats} onChange={(e) => updatePart(part.id, { rakats: Math.max(part.category === "fard" ? 1 : 0, Number(e.target.value) || 0) })}/></label></div>{pendingDisableId === part.id && <div className="prayer-omission-editor"><label><span>এই সুন্নত অংশটি কেন বাদ দিচ্ছ?</span><textarea value={disableReason} onChange={(e) => setDisableReason(e.target.value)} rows={2} maxLength={1200} placeholder="নিজের জন্য কারণটি লিখে রাখো…"/></label><div><button type="button" className="tracker-secondary-button" onClick={() => { setPendingDisableId(""); setDisableReason(""); }}><X size={14}/> বাতিল</button><button type="button" className="tracker-primary-button" disabled={disableReason.trim().length < 3} onClick={confirmPartDisable}>কারণসহ বাদ দাও</button></div></div>}{!part.enabled && part.omissionReason && <p className="prayer-omission-saved">বাদ দেওয়ার কারণ: {part.omissionReason}</p>}</div>)}</div><form className="add-prayer-part" onSubmit={addPart}><div className="tracker-form-grid"><label className="tracker-field"><span>নতুন অংশের নাম</span><input className="tracker-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="যেমন: অতিরিক্ত নফল" required/></label><label className="tracker-field"><span>ধরন</span><select className="tracker-input" value={category} onChange={(e) => setCategory(e.target.value as PrayerPartCategory)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label className="tracker-field"><span>রাকাত</span><input className="tracker-input" type="number" min="0" max="20" value={rakats} onChange={(e) => setRakats(e.target.value)}/></label></div><button type="submit" className="tracker-secondary-button"><Plus size={15}/> অংশ যোগ করো</button></form></section>
    <section className="tracker-panel"><header className="tracker-panel-heading"><div><h3>ব্রাউজার নোটিফিকেশন</h3><p>এই ডিভাইসের ব্রাউজার অনুমতি</p></div><Bell size={20}/></header><div className="notification-permission-row"><div><strong>{permission === "granted" ? "নোটিফিকেশন অনুমোদিত" : permission === "denied" ? "নোটিফিকেশন ব্লক করা" : permission === "unsupported" ? "এই ব্রাউজারে সমর্থিত নয়" : "অনুমতি দেওয়া হয়নি"}</strong><small>অ্যাপ খোলা থাকলে ওয়াক্ত, জামাত ও রাতের কাজার স্মরণ পাঠাবে।</small></div>{permission !== "granted" && permission !== "unsupported" && <button className="tracker-secondary-button" type="button" onClick={() => void askPermission()}><Bell size={15}/> অনুমতি দাও</button>}{permission === "granted" && <CheckCircle2 size={20} className="permission-ok"/>}</div><p className="tracker-field-hint">ব্রাউজার বন্ধ থাকলে নোটিফিকেশন নিশ্চিত নয়। পূর্ণ Push সুবিধা আলাদা সার্ভার ব্যবস্থা চায়।</p></section>
    {saved && <p className="tracker-inline-saved" role="status">{saved}</p>}
  </div>;
}

function getDhakaDateAndTime() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute), clock: `${values.hour}:${values.minute}` };
}
function toMinutes(time: string) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }
function notify(title: string, message: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, { body: message, icon: "/brand/logo.svg", tag: `${title}-${Date.now()}` });
    notification.onclick = () => { window.focus(); notification.close(); };
  } catch {
    // The in-app notification remains available if the browser blocks a system alert.
  }
}

export function PrayerReminderEngine({ userName = "" }: { userName?: string }) {
  useEffect(() => {
    let active = true;
    const run = () => {
      if (!active) return;
      const data = getLocalDataSnapshot();
      if (!data.preferences.remindersEnabled) return;
      const { date: civilDate, minutes } = getDhakaDateAndTime();
      const journalDate = getLocalJournalDate(new Date(), data.preferences.timeZone || "Asia/Dhaka", data.preferences.maghribTime || null);
      const times = data.prayerTimesCache.find((item) => item.date === civilDate && item.latitude === data.prayerPreferences.latitude && item.longitude === data.prayerPreferences.longitude);
      if (!times) return;
      const tomorrowDate = nextDhakaDate(civilDate);
      const tomorrowTimes = data.prayerTimesCache.find((item) => item.date === tomorrowDate && item.latitude === data.prayerPreferences.latitude && item.longitude === data.prayerPreferences.longitude);
      const names: Record<PrayerId, string> = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
      const prayerList: { id: PrayerId; journalDate: string; window: { start: string; end: string } | null; jamaatTime: string }[] = [
        { id: "maghrib", journalDate: nextDhakaDate(civilDate), window: getPrayerWaqtWindow(times, tomorrowTimes, "maghrib"), jamaatTime: data.prayerPreferences.mosqueTimes.maghrib },
        { id: "isha", journalDate: nextDhakaDate(civilDate), window: getPrayerWaqtWindow(times, tomorrowTimes, "isha"), jamaatTime: data.prayerPreferences.mosqueTimes.isha },
        { id: "fajr", journalDate: civilDate, window: getPrayerWaqtWindow(times, tomorrowTimes, "fajr"), jamaatTime: data.prayerPreferences.mosqueTimes.fajr },
        { id: "dhuhr", journalDate: civilDate, window: getPrayerWaqtWindow(times, tomorrowTimes, "dhuhr"), jamaatTime: data.prayerPreferences.mosqueTimes.dhuhr },
        { id: "asr", journalDate: civilDate, window: getPrayerWaqtWindow(times, tomorrowTimes, "asr"), jamaatTime: data.prayerPreferences.mosqueTimes.asr }
      ];
      const events = data.reminderEvents;
      const addEvent = (key: string, eventDate: string, kind: "waqt-ended" | "jamaat-soon" | "night-qada", prayer: PrayerId | null, title: string, message: string) => {
        if (!eventDate || events.some((event) => event.key === key)) return;
        updateLocalData((current) => ({ ...current, reminderEvents: [{ id: `${Date.now()}-${key}`, key, kind, date: eventDate, prayer, title, message, createdAt: new Date().toISOString(), resolved: false, response: null }, ...current.reminderEvents].slice(0, 100) }));
        notify(title, message);
      };
      const name = data.preferences.displayName.trim() || userName.trim() || "তোমার";
      for (const item of prayerList) {
        const window = item.window;
        const alreadyLogged = data.prayerEntries.some((entry) => entry.date === item.journalDate && entry.prayer === item.id && entry.method !== "qada" && entry.method !== "not-performed" && entry.missedRakats === 0 && entry.components.some((part) => part.category === "fard" && part.performed && part.performedRakats >= part.plannedRakats))
          || data.qadaEntries.some((entry) => entry.prayer === item.id && entry.missedDate === item.journalDate);
        if (window && data.prayerPreferences.waqtEndPrompt && !alreadyLogged && minutes >= toMinutes(window.end)) {
          addEvent(`waqt-ended:${item.journalDate}:${item.id}`, item.journalDate, "waqt-ended", item.id, "ওয়াক্তের সময় শেষ হয়েছে", `${name}, ${names[item.id]} আদায় করেছ কি?`);
        }
        if (item.jamaatTime) {
          const remaining = toMinutes(item.jamaatTime) - minutes;
          if (remaining > 0 && remaining <= data.prayerPreferences.mosqueReminderMinutes) {
            addEvent(`jamaat-soon:${item.journalDate}:${item.id}`, item.journalDate, "jamaat-soon", item.id, "জামাতের সময় ঘনিয়ে এসেছে", `${name}, আর ${remaining.toLocaleString("bn-BD")} মিনিট পর ${names[item.id]}-এর জামাত।`);
          }
        }
      }
      const [nightHour, nightMinute] = data.prayerPreferences.nightQadaReminder.split(":").map(Number);
      const hasPendingQada = data.qadaEntries.some((item) => item.status === "pending");
      if (hasPendingQada && minutes >= nightHour * 60 + nightMinute) {
        addEvent(`night-qada:${journalDate}`, journalDate, "night-qada", null, "বাকি কাজার স্মরণ", `${name}, তোমার কিছু কাজা সালাতের রেকর্ড বাকি আছে। দিনের শেষে সেগুলো পর্যালোচনা করো।`);
      }
    };
    run(); const timer = window.setInterval(run, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [userName]);
  return null;
}
