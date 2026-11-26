"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Moon, Monitor, Sun, UserRound, ShieldCheck, BellRing, Database, LoaderCircle, CalendarClock } from "lucide-react";
import { useTheme, type Theme } from "@/providers/theme-provider";

export function SettingsPanel({ displayName, phone, timeZone, maghribTime, maghribEnabled, hijriAdjustmentDays }: { displayName: string; phone: string; timeZone: string; maghribTime: string; maghribEnabled: boolean; hijriAdjustmentDays: number }) {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(displayName);
  const [mobile, setMobile] = useState(phone);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [journalTimeZone, setJournalTimeZone] = useState(timeZone);
  const [journalMaghribTime, setJournalMaghribTime] = useState(maghribTime);
  const [journalMaghribEnabled, setJournalMaghribEnabled] = useState(maghribEnabled);
  const [journalHijriAdjustment, setJournalHijriAdjustment] = useState(String(hijriAdjustmentDays));
  const [dateSettingsBusy, setDateSettingsBusy] = useState(false);
  const [dateSettingsMessage, setDateSettingsMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, phone: mobile }) });
      const result = await response.json() as { message?: string };
      setProfileMessage(response.ok ? "প্রোফাইল আপডেট হয়েছে।" : result.message || "আপডেট করা যায়নি।");
    } catch {
      setProfileMessage("সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordMessage("নতুন পাসওয়ার্ড দুটি মিলছে না।");
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
      const result = await response.json() as { message?: string };
      setPasswordMessage(result.message || (response.ok ? "পাসওয়ার্ড পরিবর্তিত হয়েছে।" : "পাসওয়ার্ড পরিবর্তন করা যায়নি।"));
      if (response.ok) {
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      setPasswordMessage("সার্ভারের সঙ্গে সংযোগ করা যায়নি।");
    } finally {
      setPasswordBusy(false);
    }
  }


  async function saveDateSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setDateSettingsBusy(true); setDateSettingsMessage("");
    try {
      const response = await fetch("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timeZone: journalTimeZone, maghribTime: journalMaghribTime || null, maghribEnabled: journalMaghribEnabled, hijriAdjustmentDays: Number(journalHijriAdjustment) }) });
      const result = await response.json() as { message?: string };
      setDateSettingsMessage(result.message || (response.ok ? "সংরক্ষিত হয়েছে।" : "সেটিংস সংরক্ষণ করা যায়নি।"));
    } catch { setDateSettingsMessage("সার্ভারের সঙ্গে সংযোগ করা যায়নি।"); }
    finally { setDateSettingsBusy(false); }
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "লাইট", icon: Sun },
    { value: "dark", label: "ডার্ক", icon: Moon },
    { value: "system", label: "সিস্টেম", icon: Monitor }
  ];

  return (
    <div className="settings-layout">
      <section className="panel settings-card">
        <div className="settings-section-heading"><div className="settings-icon"><UserRound size={19} /></div><div><h2>ব্যক্তিগত প্রোফাইল</h2><p>নাম ও যোগাযোগের তথ্য</p></div></div>
        <form className="settings-form" onSubmit={saveProfile}>
          <label className="field-label" htmlFor="displayName">নাম</label>
          <input className="text-input" id="displayName" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="তোমার নাম" />
          <label className="field-label" htmlFor="phone">মোবাইল নম্বর</label>
          <input className="text-input" id="phone" maxLength={25} value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="মোবাইল নম্বর (ঐচ্ছিক)" />
          {profileMessage && <p className="inline-feedback">{profileMessage}</p>}
          <button className="secondary-button" type="submit" disabled={profileBusy}>{profileBusy && <LoaderCircle className="spin" size={16} />} প্রোফাইল সংরক্ষণ</button>
        </form>
      </section>

      <section className="panel settings-card">
        <div className="settings-section-heading"><div className="settings-icon"><Sun size={19} /></div><div><h2>অ্যাপের থিম</h2><p>পছন্দ অনুযায়ী প্রদর্শন</p></div></div>
        <div className="theme-options">
          {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} type="button" className={`theme-option ${theme === value ? "selected" : ""}`} onClick={() => setTheme(value)}><Icon size={18} /><span>{label}</span>{theme === value && <span className="selected-dot" />}</button>)}
        </div>
        <p className="settings-hint">থিমের পছন্দ তোমার অ্যাকাউন্টে অনলাইনে সংরক্ষিত হয় এবং অন্য ডিভাইসেও ফিরে আসে।</p>
      </section>

      <section className="panel settings-card">
        <div className="settings-section-heading"><div className="settings-icon"><CalendarClock size={19} /></div><div><h2>মুহাসাবার তারিখ</h2><p>টাইম জোন ও মাগরিবের পর দিন পরিবর্তন</p></div></div>
        <form className="settings-form" onSubmit={saveDateSettings}>
          <label className="field-label" htmlFor="journal-time-zone">Time Zone</label>
          <select className="text-input" id="journal-time-zone" value={journalTimeZone} onChange={(event) => setJournalTimeZone(event.target.value)}>
            <option value="Asia/Dhaka">বাংলাদেশ — Asia/Dhaka</option>
            <option value="Asia/Kolkata">ভারত — Asia/Kolkata</option>
            <option value="Asia/Riyadh">সৌদি আরব — Asia/Riyadh</option>
            <option value="Europe/London">যুক্তরাজ্য — Europe/London</option>
            <option value="America/New_York">নিউ ইয়র্ক — America/New_York</option>
            <option value="America/Los_Angeles">লস অ্যাঞ্জেলেস — America/Los_Angeles</option>
            <option value="UTC">UTC</option>
          </select>
          <label className="field-label" htmlFor="journal-maghrib-time">স্থানীয় মাগরিবের সময়</label>
          <input className="text-input" id="journal-maghrib-time" type="time" value={journalMaghribTime} onChange={(event) => setJournalMaghribTime(event.target.value)} />
          <label className="field-label" htmlFor="journal-hijri-adjustment">হিজরি তারিখ সমন্বয়</label>
          <select className="text-input" id="journal-hijri-adjustment" value={journalHijriAdjustment} onChange={(event) => setJournalHijriAdjustment(event.target.value)}>
            <option value="-2">২ দিন পিছিয়ে</option><option value="-1">১ দিন পিছিয়ে</option><option value="0">সমন্বয় নেই</option><option value="1">১ দিন এগিয়ে</option><option value="2">২ দিন এগিয়ে</option>
          </select>
          <label className="check-line"><input type="checkbox" checked={journalMaghribEnabled} onChange={(event) => setJournalMaghribEnabled(event.target.checked)} /> মাগরিবের পর নতুন মুহাসাবার দিন শুরু হবে</label>
          {dateSettingsMessage && <p className="inline-feedback">{dateSettingsMessage}</p>}
          <button className="secondary-button" type="submit" disabled={dateSettingsBusy}>{dateSettingsBusy && <LoaderCircle className="spin" size={16} />} তারিখের সেটিংস সংরক্ষণ</button>
        </form>
        <p className="settings-hint">মাগরিবের সময় এখন ম্যানুয়ালি নির্ধারণ করা হচ্ছে। Prayer Time API সংযোগের পর এটি স্বয়ংক্রিয়ভাবে আপডেট করা যাবে।</p>
      </section>

      <section className="panel settings-card">
        <div className="settings-section-heading"><div className="settings-icon"><KeyRound size={19} /></div><div><h2>পাসওয়ার্ড পরিবর্তন</h2><p>বর্তমান পাসওয়ার্ড দিয়ে পরিচয় যাচাই হবে</p></div></div>
        <form className="settings-form" onSubmit={changePassword}>
          <label className="field-label" htmlFor="currentPassword">বর্তমান পাসওয়ার্ড</label>
          <input className="text-input" id="currentPassword" type="password" autoComplete="current-password" required minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <label className="field-label" htmlFor="newPassword">নতুন পাসওয়ার্ড</label>
          <input className="text-input" id="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <label className="field-label" htmlFor="confirmPassword">নতুন পাসওয়ার্ড আবার লিখো</label>
          <input className="text-input" id="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          {passwordMessage && <p className="inline-feedback">{passwordMessage}</p>}
          <button className="secondary-button" type="submit" disabled={passwordBusy}>{passwordBusy && <LoaderCircle className="spin" size={16} />} পাসওয়ার্ড পরিবর্তন</button>
        </form>
      </section>

      <section className="panel settings-card settings-list-card">
        <div className="settings-section-heading"><div className="settings-icon"><ShieldCheck size={19} /></div><div><h2>সিস্টেম সেটিংস</h2><p>পরবর্তী ধাপের জন্য প্রস্তুত রাখা হয়েছে</p></div></div>
        <div className="settings-list-row"><BellRing size={18} /><div><strong>নোটিফিকেশন ও সালাতের জামাত</strong><span>ইন-অ্যাপ নোটিফিকেশন সক্রিয়; জামাতভিত্তিক সময়সূচি ও Background Push পরবর্তী আপডেটে যুক্ত হবে</span></div><span className="coming-soon">আংশিক</span></div>
        <div className="settings-list-row"><Database size={18} /><div><strong>ডেটা Backup / Import / Export</strong><span>নিচের Backup অংশ থেকে Encrypted Export ও খালি অ্যাকাউন্টে Restore করা যাবে</span></div><span className="coming-soon">চালু</span></div>
      </section>
    </div>
  );
}
