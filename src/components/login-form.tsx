"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!configured) { setMessage("লগইন সেবা প্রস্তুত নয়। Environment সেটিংস পরীক্ষা করো।"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), cache: "no-store" });
      const result = await response.json() as { ok?: boolean; message?: string; redirectTo?: string };
      if (!response.ok || !result.ok) { setMessage(result.message || "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।"); setBusy(false); return; }
      // Go straight to the workspace. A short signed handoff avoids a duplicate
      // JWT verification round-trip on this first post-login page request.
      router.replace(result.redirectTo || "/dashboard");
    } catch {
      setMessage("সার্ভারের সঙ্গে সংযোগ করা যায়নি। ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করো।");
      setBusy(false);
    }
  }

  return <form className="login-form login-form-minimal" onSubmit={handleSubmit}>
    <label className="minimal-field"><span className="sr-only">ইমেইল</span><input id="login-email" type="email" autoComplete="username" inputMode="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ইমেইল" /></label>
    <label className="minimal-field minimal-password"><span className="sr-only">পাসওয়ার্ড</span><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="পাসওয়ার্ড" /><button className="minimal-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "পাসওয়ার্ড লুকাও" : "পাসওয়ার্ড দেখাও"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></label>
    {message && <p className="minimal-login-error" role="alert">{message}</p>}
    <button className="minimal-login-submit" type="submit" disabled={busy || !configured}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{busy ? "প্রবেশ করা হচ্ছে" : "লগইন"}</button>
  </form>;
}
