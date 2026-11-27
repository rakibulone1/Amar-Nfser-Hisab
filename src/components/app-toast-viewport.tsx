"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { subscribeAppToast, type AppToastMessage } from "@/lib/ui/toast";

export function AppToastViewport() {
  const [toast, setToast] = useState<AppToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeAppToast((next) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      setToast(next);
      timerRef.current = window.setTimeout(() => setToast((current) => current?.id === next.id ? null : current), 4400);
    });
    return () => {
      unsubscribe();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);
  if (!toast) return null;
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  return <div className={`app-toast app-toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} aria-live={toast.type === "error" ? "assertive" : "polite"}>
    <span className="app-toast-icon"><Icon size={19}/></span>
    <span className="app-toast-message">{toast.message}</span>
    <button type="button" onClick={() => setToast(null)} aria-label="বার্তা বন্ধ করো"><X size={16}/></button>
  </div>;
}
