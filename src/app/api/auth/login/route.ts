import { createHmac } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseEnvironment } from "@/lib/env";
import { getLoginEnvironmentStatus, getLoginThrottleSecret, getSupabaseSecretKey } from "@/lib/env.server";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";
import { createLoginHandoff, LOGIN_HANDOFF_COOKIE, LOGIN_HANDOFF_MAX_AGE } from "@/lib/auth/login-handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128)
}).strict();

function fingerprint(value: string, secret: string) {
  return createHmac("sha256", secret).update(value.toLowerCase()).digest("hex");
}

function getClientIp(request: NextRequest) {
  const platformIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (platformIp) return platformIp;
  const chain = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return chain?.length ? chain[chain.length - 1] : "unknown-client";
}

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return json({ ok: false, message: "অনুরোধটি গ্রহণ করা হয়নি।" }, 403);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return json({ ok: false, message: "সঠিক অনুরোধ পাঠাও।" }, 415);
  const setupStatus = getLoginEnvironmentStatus();
  if (!setupStatus.configured) {
    return json({
      ok: false,
      message: `Environment সেটআপ অসম্পূর্ণ: ${setupStatus.missing.join("; ")}. প্রজেক্ট Root-এর .env.local ফাইল পরীক্ষা করে Server পুনরায় চালাও।`
    }, 503);
  }

  let secret: string;
  let env: ReturnType<typeof getSupabaseEnvironment>;
  let secretKey: string;
  try {
    secret = getLoginThrottleSecret();
    env = getSupabaseEnvironment();
    secretKey = getSupabaseSecretKey();
  } catch {
    return json({ ok: false, message: "Environment মানগুলো সঠিকভাবে পড়া যায়নি। .env.local পরীক্ষা করে Development Server পুনরায় চালাও।" }, 503);
  }

  const bodyResult = await readJsonBody(request, 12_000);
  if (!bodyResult.success) {
    const status = bodyResult.reason === "too-large" ? 413 : 400;
    return json({ ok: false, message: bodyResult.reason === "too-large" ? "অনুরোধটি গ্রহণ করা যায়নি।" : "সঠিক Login তথ্য পাঠাও।" }, status);
  }
  const parsed = loginSchema.safeParse(bodyResult.data);
  if (!parsed.success) return json({ ok: false, message: "ইমেইল ও পাসওয়ার্ড সঠিকভাবে লিখো।" }, 400);

  const email = parsed.data.email.toLowerCase();
  const emailHash = fingerprint(`email:${email}`, secret);
  const ipHash = fingerprint(`ip:${getClientIp(request)}`, secret);
  const cookieStore = await cookies();
  const throttleAdmin = createSupabaseAdminClient(env.url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
    }
  });

  // Fail closed: when the throttle migration is missing/unavailable, do not attempt Auth.
  const throttleStartedAt = performance.now();
  const throttle = await throttleAdmin.rpc("check_login_throttle", { p_email_hash: emailHash, p_ip_hash: ipHash });
  const throttleDurationMs = Math.round(performance.now() - throttleStartedAt);
  if (throttle.error || !throttle.data?.length) {
    return json({ ok: false, message: "নিরাপত্তা যাচাই সেবা প্রস্তুত নয়। প্রথম SQL Migration সফল হয়েছে কি না পরীক্ষা করো।" }, 503);
  }
  const throttleRow = throttle.data[0] as { is_blocked: boolean; retry_after_seconds: number };
  if (throttleRow.is_blocked) {
    const minutes = Math.max(1, Math.ceil(throttleRow.retry_after_seconds / 60));
    return json({ ok: false, message: `অতিরিক্ত ভুল প্রচেষ্টার কারণে লগইন সাময়িক বন্ধ। প্রায় ${minutes} মিনিট পরে আবার চেষ্টা করো।` }, 429);
  }

  const authStartedAt = performance.now();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  const authDurationMs = Math.round(performance.now() - authStartedAt);
  if (process.env.NODE_ENV === "development") {
    console.info("[auth-login-timing]", { throttleMs: throttleDurationMs, authMs: authDurationMs, totalMs: Math.round(performance.now() - throttleStartedAt) });
  }
  if (error) {
    const failed = await throttleAdmin.rpc("record_login_failure", { p_email_hash: emailHash, p_ip_hash: ipHash });
    if (failed.error) return json({ ok: false, message: "লগইন যাচাই করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করো।" }, 503);
    const seconds = Number(failed.data || 0);
    if (seconds > 0) return json({ ok: false, message: "দুইবার ভুল প্রচেষ্টার কারণে ১৫ মিনিটের জন্য লগইন বন্ধ করা হয়েছে।" }, 429);
    return json({ ok: false, message: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।" }, 401);
  }

  // Reset the email bucket after sending the success response. The failure
  // counter remains server-side and the source-IP bucket is intentionally kept.
  after(async () => {
    const { error: resetError } = await throttleAdmin.rpc("clear_login_email_throttle", { p_email_hash: emailHash });
    if (resetError && process.env.NODE_ENV === "development") {
      console.warn("[auth-login] Successful login throttle reset did not complete.");
    }
  });
  const userId = signInData.user?.id;
  if (!userId) return json({ ok: false, message: "লগইন যাচাই সম্পন্ন হয়নি। আবার চেষ্টা করো।" }, 401);
  const response = json({ ok: true, redirectTo: "/dashboard" });
  response.cookies.set(LOGIN_HANDOFF_COOKIE, createLoginHandoff(userId, email, secret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: LOGIN_HANDOFF_MAX_AGE
  });
  return response;
}
