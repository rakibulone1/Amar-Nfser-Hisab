"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell, BookOpen, Compass, Target, LogOut, LockKeyhole,
  Scale, Settings, ShieldCheck
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";

const navigation = [
  { id: "muhasaba", label: "মুহাসাবা কেন্দ্র", shortLabel: "মুহাসাবা", href: "/dashboard", icon: Compass },
  { id: "goals", label: "লক্ষ্য ও সময়সীমা", shortLabel: "লক্ষ্য", href: "/goals", icon: Target },
  { id: "journal", label: "আত্মশুদ্ধি লিপি", shortLabel: "লিপি", href: "/journal", icon: BookOpen },
  { id: "mirror", label: "নফস আয়না", shortLabel: "আয়না", href: "/nafs-mirror", icon: Scale }
] as const;

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const activeId = pathname === "/dashboard" ? "muhasaba"
    : pathname.startsWith("/goals") ? "goals"
      : pathname.startsWith("/journal") ? "journal"
        : pathname.startsWith("/nafs-mirror") ? "mirror" : "";

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="app-background">
      <div className="app-frame">
        <header className="topbar">
          <div className="topbar-brand"><AppLogo /></div>
          <div className="topbar-actions">
            <div className="workspace-private-tag"><ShieldCheck size={14} /><span>ব্যক্তিগত ও সুরক্ষিত</span></div>
            <span className="profile-greeting"><span className="profile-avatar"><LockKeyhole size={15} /></span><span className="profile-name">{userName || "আমার হিসাব"}</span></span>
            <Link className={`icon-button ${pathname === "/notifications" ? "is-active" : ""}`} href="/notifications" aria-label="নোটিফিকেশন" title="নোটিফিকেশন">
              <Bell size={19} strokeWidth={1.8} />
            </Link>
            <Link className={`icon-button ${pathname === "/settings" ? "is-active" : ""}`} href="/settings" aria-label="সেটিংস" title="সেটিংস">
              <Settings size={19} strokeWidth={1.8} />
            </Link>
            <button className="icon-button logout-button" type="button" aria-label="লগআউট" title="লগআউট" onClick={() => void logout()} disabled={loggingOut}>
              <LogOut size={18} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <nav className="primary-tabs" aria-label="প্রধান বিভাগ">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            return (
              <Link key={item.id} href={item.href} className={`primary-tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon className="tab-icon" size={18} strokeWidth={1.8} />
                <span className="tab-full-label">{item.label}</span>
                <span className="tab-short-label">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>

        <main className="main-content">{children}</main>
        <footer className="app-footer">
          <span className="footer-brand"><Scale size={15} /> আমার নফসের হিসাব</span>
          <span>নিজেকে জানার · নিজেকে গড়ার যাত্রা</span>
        </footer>
        <div className="mobile-bottom-spacer" aria-hidden="true" />
      </div>
    </div>
  );
}
