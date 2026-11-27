import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const css = read("src/app/globals.css");
const workspace = read("src/components/frontend-workspace.tsx");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

const releaseCss = css.slice(css.lastIndexOf("/* Release 1.2.9"));

test("Release 1.2.9 metadata is aligned and dependency manifests remain unchanged", () => {
  assert.equal(pkg.version, "1.2.9");
  assert.equal(lock.version, "1.2.9");
  assert.equal(lock.packages[""].version, "1.2.9");
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
  assert.match(pkg.scripts["test:all"], /test:phase23/);
});

test("mobile sync badge uses a compact clock while retaining the complete accessible status", () => {
  assert.match(workspace, /function formatCompactLastSyncTime\(value: string \| null\)/);
  assert.match(workspace, /hour:\s*["']2-digit["'][\s\S]*?minute:\s*["']2-digit["'][\s\S]*?hourCycle:\s*["']h23["'][\s\S]*?timeZone:\s*["']Asia\/Dhaka["']/);
  assert.match(workspace, /const syncDesktopLabel =/);
  assert.match(workspace, /const syncMobileLabel =/);
  assert.match(workspace, /className="sync-label-desktop"/);
  assert.match(workspace, /className="sync-label-mobile"/);
  assert.match(workspace, /title=\{syncTooltip\} aria-label=\{syncTooltip\}/);
  assert.match(workspace, /getLastSuccessfulSyncAt\(\)/);
});

test("mobile header reserves room for the app name and compacts secondary controls", () => {
  assert.match(releaseCss, /@media \(max-width: 860px\)[\s\S]*?\.desktop-brand,[\s\S]*?\.mobile-brand\s*\{[^}]*display:\s*flex/s);
  assert.match(releaseCss, /@media \(max-width: 860px\)[\s\S]*?\.last-sync-label \.sync-label-desktop\s*\{\s*display:\s*none/s);
  assert.match(releaseCss, /@media \(max-width: 520px\)[\s\S]*?\.topbar-avatar,[\s\S]*?\.mobile-settings-shortcut\s*\{\s*display:\s*none !important/s);
  assert.match(workspace, /<nav className="mobile-navigation"[\s\S]*?<span>আরও<\/span>/);
  assert.match(releaseCss, /@media \(max-width: 360px\)[\s\S]*?\.mobile-brand strong\s*\{[^}]*max-width:\s*108px/s);
  assert.match(releaseCss, /@media \(max-width: 520px\)[\s\S]*?\.metric-card small\s*\{\s*font-size:\s*9px/s);
});

test("responsive content collapses safely without removing the two-column metric summary", () => {
  assert.match(releaseCss, /\.content-grid,[\s\S]*?\.content-grid-wide-left,[\s\S]*?\.side-stack\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(releaseCss, /\.metric-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(releaseCss, /\.workspace-content\s*\{[^}]*env\(safe-area-inset-bottom\)/);
  assert.match(releaseCss, /\.tracker-edit-fields\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("premium light and dark theme tokens have separate readable surface and accent palettes", () => {
  assert.match(releaseCss, /:root\s*\{[\s\S]*?--page:\s*#f2f6f4[\s\S]*?--ink:\s*#16271f[\s\S]*?--green:\s*#19704d/);
  assert.match(releaseCss, /:root\[data-theme="dark"\]\s*\{[\s\S]*?--page:\s*#0b1712[\s\S]*?--ink:\s*#f1f7f3[\s\S]*?--green:\s*#82c8a0/);
  assert.match(releaseCss, /--surface-lilac:/);
  assert.match(releaseCss, /--surface-sand:/);
  assert.match(releaseCss, /--shadow-2:/);
});

test("new visual layer preserves the existing sync and navigation actions", () => {
  assert.match(workspace, /<NotificationPopover events=\{data\.reminderEvents\}\/>/);
  assert.match(workspace, /onClick=\{\(\) => setTheme\(theme === "dark" \? "light" : "dark"\)\}/);
  assert.match(workspace, /onClick=\{\(\) => navigateSection\("settings"\)\}/);
  assert.match(workspace, /onClick=\{\(\) => navigateSection\(item\.id\)\}/);
  assert.match(workspace, /getCloudSyncState\(\)/);
});

test("main README and project manifest identify the current responsive UI release", () => {
  assert.match(read("README_BN.md"), /Release 1\.2\.9/);
  assert.match(read("PROJECT_PACKAGE_MANIFEST.txt"), /Release 1\.2\.9/);
  assert.match(read("PATCH_BASE.txt"), /Release 1\.2\.8 Experience Upgrade \+ Release 1\.2\.8 Fix 01/);
});

test("dark theme primary actions use a dark foreground against the brighter jade surface", () => {
  assert.match(releaseCss, /:root\[data-theme="dark"\] \.button-primary\s*\{[^}]*color:\s*#10291b[^}]*background:\s*#82c8a0/s);
});
