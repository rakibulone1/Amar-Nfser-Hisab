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

test("dashboard Gregorian and Hijri date card is explicitly centered and Bengali-first", () => {
  assert.match(workspace, /dashboard-date-card dashboard-date-card-centered/);
  assert.match(workspace, /<span lang="bn">\{formatEnglishGregorianDate\(date\)\}<\/span>/);
  assert.match(css, /\.dashboard-date-card\.dashboard-date-card-centered\s*\{[^}]*margin:\s*0 auto/s);
  assert.match(css, /\.dashboard-date-card\.dashboard-date-card-centered\s*\{[^}]*justify-content:\s*center/s);
  assert.match(css, /\.dashboard-date-card\.dashboard-date-card-centered\s*\{[^}]*text-align:\s*center/s);
});

test("section headers share a compact visual rhythm and one dashboard-return control", () => {
  assert.match(workspace, /page-intro release-page-heading/);
  assert.match(workspace, /stage-detail-heading release-page-heading/);
  assert.match(workspace, /goals-page-heading release-page-heading/);
  assert.match(css, /\.page-intro, \.goals-page-heading, \.tracker-page-heading, \.stage-detail-heading, \.hadith-page-heading\s*\{/);
  assert.match(css, /\.section-back-button, \.tracker-back-button\s*\{/);
  assert.match(css, /\.stage-detail-heading\s*\{\s*display:\s*grid/);
});

test("desktop shell keeps centered top tabs and a centered content canvas", () => {
  assert.match(css, /\.workspace-desktop-nav\s*\{[^}]*justify-content:\s*center/s);
  assert.match(css, /\.workspace-content\s*\{[^}]*max-width:\s*1460px/s);
  assert.match(css, /\.workspace-content\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(css, /\.workspace-topbar\s*\{[^}]*position:\s*sticky/s);
});

test("mobile navigation is a safe-area aware floating dock with larger touch targets", () => {
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*?\.mobile-navigation\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.mobile-navigation\s*\{[^}]*env\(safe-area-inset-bottom\)/s);
  assert.match(css, /\.mobile-navigation button\s*\{[^}]*min-height:\s*52px/s);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.mobile-navigation/);
});

test("card and control refinements keep borders, focus rings and readable spacing", () => {
  assert.match(css, /\.metric-card\s*\{[^}]*border-radius:\s*18px/s);
  assert.match(css, /\.workspace-panel, \.panel, \.tracker-panel[\s\S]*?box-shadow:\s*var\(--shadow-1\)/);
  assert.match(css, /:where\(button, a, input, select, textarea, \[role="button"\]\):focus-visible/);
  assert.match(css, /\.tracker-input,[\s\S]*?min-height:\s*45px/);
});

test("light and dark palettes are both defined with reduced-motion support", () => {
  assert.match(css, /:root\s*\{[\s\S]*?--page:\s*#f5f8f5/);
  assert.match(css, /:root\[data-theme="dark"\]\s*\{[\s\S]*?--page:\s*#101914/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Release 1.2.7 changes no runtime or development dependencies", () => {
  assert.equal(pkg.version, "1.2.7");
  assert.equal(lock.version, "1.2.7");
  assert.equal(lock.packages[""].version, "1.2.7");
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
  assert.match(pkg.scripts["test:all"], /test:phase20/);
});
