import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("API context uses signed JWT claims rather than an Auth getUser round-trip", () => {
  const source = read("../src/lib/api/context.ts");
  assert.match(source, /auth\.getClaims\(\)/);
  assert.doesNotMatch(source, /auth\.getUser\(\)/);
  assert.match(source, /auth\(\) remains the final authorization boundary|RLS remains the final authorization boundary/i);
});

test("Server Component identity lookup consumes the proxy-verified identity and avoids duplicate Auth claims requests", () => {
  const source = read("../src/lib/auth/require-user.ts");
  const proxy = read("../src/proxy.ts");
  assert.match(source, /import \{ cache \} from "react"/);
  assert.match(source, /requireUser = cache\(/);
  assert.match(source, /x-verified-user-id/);
  assert.match(proxy, /requestHeaders\.delete\("x-verified-user-id"\)/);
  assert.match(proxy, /x-verified-user-id/);
});

test("successful login defers throttle reset until after the response", () => {
  const source = read("../src/app/api/auth/login/route.ts");
  assert.match(source, /after\(async \(\) =>/);
  assert.match(source, /clear_login_email_throttle/);
  assert.match(source, /auth-login-timing/);
});

test("dashboard renders the front-end workspace without issuing database queries", () => {
  const source = read("../src/app/(protected)/dashboard/page.tsx");
  const workspace = read("../src/components/frontend-workspace.tsx");
  assert.match(source, /FrontendWorkspace/);
  assert.doesNotMatch(source, /supabase\.from\(|supabase\.rpc\(/);
  assert.match(workspace, /history\.pushState/);
  assert.match(workspace, /amar-nfser-hisab:section-change/);
});

test("analytics dataset is consolidated to one report RPC per period", () => {
  const source = read("../src/modules/nafs-mirror/report.ts");
  assert.match(source, /get_nafs_report_dataset/);
  assert.doesNotMatch(source, /fetchPagedRows\(/);
  assert.doesNotMatch(source, /\bany\b/);
});

test("performance SQL remains SECURITY INVOKER and scopes data to auth.uid", () => {
  const sql = read("../supabase/MASTER_DATABASE_SETUP.sql").toLowerCase();
  const start = sql.indexOf("create or replace function public.get_nafs_report_dataset");
  const end = sql.indexOf("-- empty-account-only restore", start);
  const report = sql.slice(start, end);
  assert.match(report, /language plpgsql security invoker/);
  assert.match(report, /auth\.uid\(\)/);
  assert.match(report, /p_to - p_from > 365/);
  assert.match(sql, /grant execute on function public\.get_nafs_report_dataset\(date,date,date\) to authenticated/);
  assert.doesNotMatch(report, /security definer/);
});

test("theme preference is stored online and provides a reduced-motion-compatible palette", () => {
  const source = read("../src/providers/theme-provider.tsx");
  const css = read("../src/app/globals.css");
  const preferences = read("../src/app/api/preferences/route.ts");
  assert.match(source, /fetch\("\/api\/preferences"/);
  assert.match(source, /body: JSON\.stringify\(\{ theme: next \}\)/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
  assert.match(preferences, /theme: z\.enum/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});



test("Goals workspace combines the initial data load and the browser helper deduplicates in-flight GETs", () => {
  const route = read("../src/app/api/goals/workspace/route.ts");
  const helper = read("../src/lib/client/fetch-json-once.ts");
  const workspace = read("../src/modules/goals/goals-workspace.tsx");
  assert.match(route, /Promise\.all\(/);
  assert.match(route, /self_purification_journeys/);
  assert.match(route, /learning_goal_tasks/);
  assert.match(helper, /inFlightGets/);
  assert.match(helper, /cache: "no-store"/);
  assert.match(workspace, /\/api\/goals\/workspace/);
});

test("analytics comparison periods load concurrently", () => {
  const source = read("../src/modules/nafs-mirror/report.ts");
  assert.match(source, /const \[currentData, previousData\] = await Promise\.all\(/);
});

test("login navigation uses a client-side route transition rather than a full document reload", () => {
  const source = read("../src/components/login-form.tsx");
  assert.match(source, /router\.replace\(/);
  assert.doesNotMatch(source, /window\.location\.(assign|href)/);
});
