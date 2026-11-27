"use client";

import { useState } from "react";
import { BellRing, Check, LoaderCircle, Trash2 } from "lucide-react";
import type { NotificationRecord } from "@/types/database";

export function NotificationsList({ initialItems }: { initialItems: NotificationRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteOne(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("delete_failed");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch { setMessage("নোটিফিকেশন মুছে ফেলা যায়নি। আবার চেষ্টা করো।"); }
    finally { setBusy(false); }
  }

  async function deleteAll() {
    if (!window.confirm("সব নোটিফিকেশন স্থায়ীভাবে মুছে ফেলবে?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (!response.ok) throw new Error("delete_failed");
      setItems([]);
    } catch { setMessage("নোটিফিকেশন মুছে ফেলা যায়নি। আবার চেষ্টা করো।"); }
    finally { setBusy(false); }
  }

  async function markRead(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("update_failed");
      setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    } catch { setMessage("নোটিফিকেশন আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  }

  if (items.length === 0) {
    return <section className="panel empty-notifications"><div><BellRing size={25} /></div><strong>এখনো কোনো নোটিফিকেশন নেই</strong><p>সালাত, লক্ষ্য ও গুরুত্বপূর্ণ আপডেট এখানে দেখা যাবে।</p>{message && <p role="status">{message}</p>}</section>;
  }

  return (
    <>
      <div className="notification-toolbar"><button className="danger-button" type="button" onClick={deleteAll} disabled={busy}><Trash2 size={14} /> সব মুছে ফেলো</button></div>
      {message && <p className="inline-feedback" role="status">{message}</p>}
      <section className="notification-list">
        {items.map((item) => (
          <article className={`panel notification-item ${!item.is_read ? "is-unread" : ""}`} key={item.id}>
            <BellRing size={18} />
            <div className="notification-item-content">
              <h3>{item.title}</h3>
              {item.body && <p>{item.body}</p>}
              <time dateTime={item.created_at}>{new Intl.DateTimeFormat("bn-BD", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(item.created_at))}</time>
            </div>
            <div className="notification-actions">
              {!item.is_read && <button className="small-action" type="button" disabled={busy} onClick={() => markRead(item.id)}><Check size={12} /> পড়া হয়েছে</button>}
              <button className="small-action" type="button" disabled={busy} onClick={() => deleteOne(item.id)}><Trash2 size={12} /> মুছুন</button>
              {busy && <LoaderCircle size={13} className="spin" />}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
