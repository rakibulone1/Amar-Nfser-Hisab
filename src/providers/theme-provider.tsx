"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { showAppToast } from "@/lib/ui/toast";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeSaveState: "loading" | "saved" | "saving" | "error";
  themeSaveMessage: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}
function subscribeSystemTheme(callback: () => void) {
  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const serverResolvedTheme = (): ResolvedTheme => "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>("light");
  const [themeSaveState, setThemeSaveState] = useState<ThemeContextValue["themeSaveState"]>("loading");
  const [themeSaveMessage, setThemeSaveMessage] = useState("অনলাইন পছন্দ লোড হচ্ছে…");
  const requestSequence = useRef(0);
  const systemTheme = useSyncExternalStore<ResolvedTheme>(subscribeSystemTheme, readSystemTheme, serverResolvedTheme);
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (pathname === "/login") return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/preferences", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("অনলাইন থিম পছন্দ লোড করা যায়নি।");
        const result = await response.json() as { hasPreferences?: boolean; preferences?: { theme?: Theme } };
        if (!active) return;
        const remoteTheme = result.preferences?.theme;
        if (remoteTheme === "light" || remoteTheme === "dark" || remoteTheme === "system") {
          setThemeState(remoteTheme);
        }
        // Theme state is account-owned and server-backed; no browser preference is read or written.
        if (!result.hasPreferences && active) setThemeState("light");
        if (active) {
          setThemeSaveState("saved");
          setThemeSaveMessage("থিম পছন্দ অনলাইনে সংরক্ষিত।");
        }
      } catch (error) {
        if (active) {
          setThemeSaveState("error");
          setThemeSaveMessage(error instanceof Error ? error.message : "থিম পছন্দ লোড করা যায়নি।");
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [pathname]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const sequence = ++requestSequence.current;
    setThemeSaveState("saving");
    setThemeSaveMessage("থিম পছন্দ অনলাইনে সংরক্ষণ হচ্ছে…");
    void fetch("/api/preferences", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }), credentials: "same-origin"
    }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "থিম অনলাইনে সংরক্ষণ করা যায়নি।");
      if (sequence === requestSequence.current) {
        setThemeSaveState("saved");
        setThemeSaveMessage("থিম পছন্দ অনলাইনে সংরক্ষিত।");
        showAppToast("success", "থিম পছন্দ আপডেট হয়েছে।");
      }
    }).catch(() => {
      if (sequence === requestSequence.current) {
        const message = "থিমের পছন্দ অনলাইনে সংরক্ষণ করা যায়নি। সংযোগ যাচাই করে আবার চেষ্টা করো।";
        setThemeSaveState("error");
        setThemeSaveMessage(message);
        showAppToast("error", message);
      }
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, themeSaveState, themeSaveMessage }), [theme, setTheme, themeSaveState, themeSaveMessage]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
