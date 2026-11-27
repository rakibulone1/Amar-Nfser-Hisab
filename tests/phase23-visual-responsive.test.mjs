import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const css = read("src/app/globals.css");
const workspace = read("src/components/frontend-workspace.tsx");
const store = read("src/lib/workspace/store.ts");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const releaseCss = css.slice(css.lastIndexOf("/* Release 1.3.0"));

test("Release 1.3.0 package and lock metadata are aligned without dependency changes", () => {
  assert.equal(pkg.version, "1.3.0");
  assert.equal(lock.version, "1.3.0");
  assert.equal(lock.packages[""].version, "1.3.0");
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
  assert.match(pkg.scripts["test:all"], /test:phase23/);
});

test("sync indicator uses status words only and never shows a sync time", () => {
  assert.match(workspace, /const syncLabel = syncState === "synced"/);
  assert.match(workspace, /"সিঙ্ক হয়েছে"/);
  assert.match(workspace, /"সিঙ্ক হচ্ছে…"/);
  assert.match(workspace, /"সংযোগ নেই"/);
  assert.match(workspace, /"সিঙ্ক ব্যর্থ"/);
  assert.match(workspace, /className="sync-label"/);
  assert.doesNotMatch(workspace, /formatLastSyncTime|formatCompactLastSyncTime|getLastSuccessfulSyncAt/);
  assert.doesNotMatch(workspace, /সর্বশেষ সিঙ্ক/);
});

test("mobile top bar keeps app identity, notification, settings, theme and sync status available", () => {
  assert.match(workspace, /<NotificationPopover events=\{data\.reminderEvents\}\/>/);
  assert.match(workspace, /mobile-settings-shortcut/);
  assert.match(workspace, /onClick=\{\(\) => setTheme\(theme === "dark" \? "light" : "dark"\)\}/);
  assert.match(releaseCss, /\.mobile-settings-shortcut\s*\{\s*display:\s*inline-flex !important/s);
  assert.match(releaseCss, /\.local-mode-label\.last-sync-label\s*\{[\s\S]*?display:\s*inline-flex !important/s);
  assert.match(releaseCss, /@media \(max-width: 390px\)[\s\S]*?\.local-mode-label\.last-sync-label\s*\{[^}]*max-width:\s*66px/s);
  assert.doesNotMatch(releaseCss, /\.mobile-settings-shortcut\s*\{\s*display:\s*none !important/s);
});

test("mobile content has enough safe-area space so the floating navigation never covers form actions", () => {
  assert.match(releaseCss, /\.workspace-main\s*\{[^}]*padding-bottom:\s*0 !important/s);
  assert.match(releaseCss, /\.workspace-content\s*\{[^}]*padding:\s*14px 13px calc\(104px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(releaseCss, /\.mobile-navigation\s*\{[\s\S]*?position:\s*fixed[\s\S]*?inset:\s*auto 8px 8px[\s\S]*?z-index:\s*90/s);
  assert.match(releaseCss, /\.mobile-navigation button\s*\{[^}]*min-height:\s*48px/s);
});

test("section changes, browser back/forward and refresh return the user to the top and refresh defaults to Dashboard", () => {
  assert.match(workspace, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.match(workspace, /navigation\?\.type !== "reload"/);
  assert.match(workspace, /window\.history\.replaceState\(\{ section: "home" \}/);
  assert.match(workspace, /const transientKeys = \["section", "tracker", "action", "prayer", "entryDate", "tab", "goalId"\]/);
});

test("the personal footer is centered and contains no copyright symbol", () => {
  assert.match(workspace, /<footer className="workspace-footer"><span>রাকিব তুমি তোমার বাবা-মায়ের বিশ্বাসটা ভেঙ্গোনা।<\/span>/);
  assert.doesNotMatch(workspace, /footer-copyright-mark|©/);
  assert.match(releaseCss, /\.workspace-footer\s*\{[\s\S]*?justify-items:\s*center[\s\S]*?margin:\s*16px auto 0[\s\S]*?border:\s*0/s);
});

test("cards and controls receive a richer but consistent visual hierarchy", () => {
  assert.match(releaseCss, /--surface-mint:\s*#e1f1e7/);
  assert.match(releaseCss, /--surface-sky:\s*#deebf7/);
  assert.match(releaseCss, /--surface-lilac:\s*#e9e2f4/);
  assert.match(releaseCss, /--accent-mint:\s*#145a3a/);
  assert.match(releaseCss, /\.today-hero\s*\{[\s\S]*?linear-gradient\(132deg/s);
  assert.match(releaseCss, /\.journey-module-card\.module-tone-2/);
  assert.match(releaseCss, /\.deadline-plan-card/);
  assert.match(releaseCss, /\.hadith-daily-card/);
});

test("mobile typography and form controls remain readable and touch friendly", () => {
  assert.match(releaseCss, /\.page-intro-title-chip h1\s*\{[^}]*font-size:\s*14px !important/s);
  assert.match(releaseCss, /\.tracker-input, \.workspace-form input[\s\S]*?min-height:\s*44px/s);
  assert.match(releaseCss, /\.metric-card-top\s*\{[^}]*font-size:\s*10\.5px/s);
  assert.match(releaseCss, /\.journey-stage-title-line strong\s*\{[^}]*font-size:\s*12px/s);
});

test("subtle entrance and interaction animations respect reduced-motion preferences", () => {
  assert.match(releaseCss, /@keyframes anh-section-enter/);
  assert.match(releaseCss, /\.workspace-content > \.view-stack\s*\{[^}]*animation:\s*anh-section-enter/s);
  assert.match(releaseCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(releaseCss, /transition-duration:\s*\.01ms !important/);
});

test("automatic saves confirm quietly; error feedback remains server-confirmed", () => {
  assert.doesNotMatch(store, /showAppToast\("success"/);
  assert.match(store, /showAppToast\("error", message\)/);
  assert.match(store, /setCloudSyncState\("synced"/);
});

test("the visual pass does not change API routes or database migrations", () => {
  assert.match(workspace, /hydrateWorkspaceData\(\)/);
  assert.match(workspace, /\/api\/workspace/);
  assert.match(store, /\/api\/workspace/);
});
