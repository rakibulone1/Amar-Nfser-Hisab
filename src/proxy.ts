import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnvironment, hasSupabaseEnvironment } from "@/lib/env";
import { LOGIN_HANDOFF_COOKIE, verifyLoginHandoff } from "@/lib/auth/login-handoff";

function buildContentSecurityPolicy(nonce: string, supabaseOrigin?: string) {
  const socketOrigin = supabaseOrigin?.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const devSockets = process.env.NODE_ENV === "development" ? " ws: wss:" : "";
  const upgrade = process.env.NODE_ENV === "production" ? " upgrade-insecure-requests;" : "";
  return [
    "default-src 'self';",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval};`,
    `style-src 'self' 'nonce-${nonce}';`,
    `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ""};`,
    "font-src 'self' data:;",
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}${socketOrigin ? ` ${socketOrigin}` : ""}${devSockets};`,
    "object-src 'none';",
    "base-uri 'self';",
    "form-action 'self';",
    "frame-ancestors 'none';",
    upgrade
  ].join(" ").trim();
}

export async function proxy(request: NextRequest) {
  let supabaseUrl: string | undefined;
  let publishableKey: string | undefined;
  if (hasSupabaseEnvironment) {
    const environment = getSupabaseEnvironment();
    supabaseUrl = environment.url;
    publishableKey = environment.publishableKey;
  }

  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : undefined;
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce, supabaseOrigin);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // Never trust identity headers supplied by the browser. Only this proxy may
  // repopulate them after JWT verification below.
  requestHeaders.delete("x-verified-user-id");
  requestHeaders.delete("x-verified-user-email");

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (!supabaseUrl || !publishableKey) return response;

  const hasAuthCookie = request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  if (!hasAuthCookie) return response;

  // A short-lived signed handoff is minted only after a successful password
  // sign-in. It skips the duplicate remote JWT-claims call on that first
  // dashboard navigation, then is immediately cleared. All later requests
  // continue through normal Supabase JWT verification below.
  const handoffToken = request.cookies.get(LOGIN_HANDOFF_COOKIE)?.value;
  const handoffSecret = process.env.LOGIN_THROTTLE_SECRET?.trim();
  const handoffIdentity = verifyLoginHandoff(handoffToken, handoffSecret);
  if (handoffIdentity) {
    requestHeaders.set("x-verified-user-id", handoffIdentity.userId);
    requestHeaders.set("x-verified-user-email", handoffIdentity.email);
    const fastResponse = NextResponse.next({ request: { headers: requestHeaders } });
    fastResponse.headers.set("Content-Security-Policy", csp);
    fastResponse.cookies.set(LOGIN_HANDOFF_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return fastResponse;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Content-Security-Policy", csp);
      }
    }
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = !error && typeof claims?.sub === "string" ? claims.sub : "";
  const userEmail = !error && typeof claims?.email === "string" ? claims.email : "";
  if (userId) requestHeaders.set("x-verified-user-id", userId);
  if (userEmail) requestHeaders.set("x-verified-user-email", userEmail);

  // Rebuild the request with verified identity headers while preserving any
  // refreshed Auth cookies emitted during getClaims().
  const refreshedCookies = response.cookies.getAll();
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  finalResponse.headers.set("Content-Security-Policy", csp);
  refreshedCookies.forEach((cookie) => finalResponse.cookies.set(cookie));
  if (handoffToken) finalResponse.cookies.set(LOGIN_HANDOFF_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return finalResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
