import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const workspace = read("src/components/frontend-workspace.tsx");
const tracker = read("src/modules/trackers/tracker-center.tsx");
const css = read("src/app/globals.css");
const hadith = read("src/modules/hadith/hadith-library.tsx");
const login = read("src/app/login/page.tsx");

test("desktop uses full-width top tabs while mobile retains its bottom navigation", () => {
  assert.match(workspace, /workspace-desktop-nav/);
  assert.match(workspace, /workspace-desktop-tab/);
  assert.match(workspace, /mobile-navigation/);
  assert.match(css, /\.workspace-app\s*\{\s*display:\s*block/);
  assert.match(css, /\.workspace-sidebar\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*?\.workspace-desktop-nav\s*\{\s*display:\s*none/);
});

test("section headings use a compact single return control", () => {
  assert.match(workspace, /className="section-back-button"[\s\S]{0,180}ফিরে যাও/);
  assert.match(css, /\.page-intro-main\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.section-back-button\s*\{[^}]*min-height:\s*36px/);
  assert.match(tracker, /tracker-page-heading-copy/);
});

test("internal pages use centered copyright footer and public login has none", () => {
  assert.match(workspace, /workspace-footer-copy[\s\S]*?footer-copyright-mark/);
  assert.match(hadith, /workspace-footer-copy[\s\S]*?footer-copyright-mark/);
  assert.doesNotMatch(login, /login-personal-footer|রাকিব তুমি/);
  assert.match(css, /\.workspace-footer-copy\s*\{\s*display:\s*inline-flex/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*?\.workspace-footer\s*\{\s*flex-direction:\s*column/);
});

test("notification activation navigates instead of expanding a detail panel", () => {
  assert.match(workspace, /function openTarget\(item: ReminderEvent\)/);
  assert.match(workspace, /navigateSection\("journal", "prayer", item\.prayer, item\.date\)/);
  assert.match(workspace, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(workspace, /document\.body\.style\.overflow = "hidden"/);
  assert.match(workspace, /document\.addEventListener\("pointerdown", onPointerDown, true\)/);
  assert.doesNotMatch(workspace, /expandedId|notification-item-detail|WaqtPrayerEntryForm|WaqtNotPerformedForm/);
  assert.match(css, /\.notification-popover-list\s*\{[^}]*overscroll-behavior:\s*contain/s);
});

test("Settings provides account profile and logout but no account-delete UI", () => {
  assert.match(workspace, /function SettingsView\(\{ data, userEmail, onLogout, loggingOut \}/);
  assert.match(workspace, /ব্যক্তিগত প্রোফাইল/);
  assert.match(workspace, /প্রোফাইল সংরক্ষণ/);
  assert.match(workspace, /এই ডিভাইস থেকে লগআউট/);
  assert.doesNotMatch(workspace, /অ্যাকাউন্ট ও সব তথ্য মুছে ফেলা|নিশ্চিত করতে DELETE লিখো|\/api\/account\/delete/);
  assert.match(read("src/app/api/profile/route.ts"), /export async function GET/);
});

test("Dashboard Gregorian date uses Bengali typography", () => {
  assert.match(workspace, /new Intl\.DateTimeFormat\("bn-BD"/);
  assert.match(workspace, /<span lang="bn">\{formatEnglishGregorianDate\(date\)\}<\/span>/);
});

test("prayer-time widget no longer renders the prohibited-time panel", () => {
  const widget = read("src/modules/trackers/prayer-time-widget.tsx");
  assert.doesNotMatch(widget, /forbidden-prayer-times|নিষিদ্ধ মুহূর্তের সময়সূচি/);
  assert.match(widget, /mosque-jamaat-inline/);
});

test("prayer records are unique per accounting date, show recorded status and can be edited", () => {
  assert.match(tracker, /const existingPrayerEntry = prayer \? data\.prayerEntries\.find/);
  assert.match(tracker, /disabled=\{Boolean\(existing\)\}/);
  assert.match(tracker, /এন্ট্রি হয়েছে/);
  assert.match(tracker, /সম্পাদনা/);
  assert.match(tracker, /initialEditingEntry/);
  assert.match(tracker, /function PrayerEntryEditForm/);
  assert.match(tracker, /writeTrackerTarget\("prayer", entry\.prayer, entry\.date\)/);
});

test("home prayer does not ask a second completion question and assumes configured fard rakats", () => {
  assert.doesNotMatch(tracker, /home-partial|ফরজ সালাত সম্পূর্ণ আদায় করেছ\?/);
  assert.match(tracker, /বাসায় \/ একাকী/);
  assert.match(tracker, /performedRakats: currentPart\.rakats/);
});

test("notification routing carries the Maghrib-based journal date into the prayer tracker", () => {
  assert.match(workspace, /function navigateSection\(section: AppSection, tracker\?: string, prayer\?: PrayerId \| "qada", targetDate\?: string\)/);
  assert.match(workspace, /url\.searchParams\.set\("entryDate", targetDate\)/);
  assert.match(tracker, /params\.get\("entryDate"\)/);
  assert.match(tracker, /initialDate=\{initialDate\}/);
});

test("release metadata is 1.2.9 and dependencies remain unchanged", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.version, "1.2.9");
  assert.equal(lock.version, "1.2.9");
  assert.equal(lock.packages[""].version, "1.2.9");
  assert.match(pkg.scripts["test:all"], /test:phase19/);
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
});
