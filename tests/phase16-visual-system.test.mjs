import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("src/app/globals.css");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

test("Release 1.2.4 baseline includes a unified semantic palette for all main card families", () => {
  for (const token of ["--surface-mint", "--surface-sky", "--surface-lilac", "--surface-sand", "--surface-rose", "--surface-teal", "--surface-info"]) {
    assert.ok(css.includes(token), `Missing color token ${token}`);
  }
  for (const selector of [".metric-card", ".stat-card", ".dashboard-journey-card-compact", ".journey-module-card", ".journey-stage-row", ".goal-card", ".deadline-plan-card", ".hadith-daily-card", ".tracker-panel"]) {
    assert.ok(css.includes(selector), `Missing visual coverage for ${selector}`);
  }
});

test("Light and dark themes both style the shell, controls, cards and login", () => {
  assert.match(css, /:root\s*\{[^}]*--page:/s);
  assert.match(css, /:root\[data-theme="dark"\]\s*\{[^}]*--page:/s);
  assert.match(css, /:root\[data-theme="dark"\] \.login-minimal-card/);
  assert.match(css, /:root\[data-theme="dark"\] \.notification-popover/);
  assert.match(css, /:root\[data-theme="dark"\] \.workspace-sidebar/);
});

test("mobile navigation, safe-area padding and responsive content grids are defined", () => {
  assert.match(css, /@media\s*\(max-width:\s*860px\)[\s\S]*?\.mobile-navigation[\s\S]*?env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.workspace-grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.mobile-navigation button\s*\{[^}]*min-height:\s*52px/s);
  assert.match(css, /\.workspace-content\s*\{[^}]*max-width|\.workspace-content\s*\{[^}]*width:\s*min\(100%,\s*1540px\)/s);
});

test("shared form controls and buttons meet the common touch target size", () => {
  assert.match(css, /\.text-input, \.text-area, \.tracker-input, \.compact-select, \.tracker-select\s*\{[^}]*min-height:\s*var\(--control-height\)/s);
  assert.match(css, /--control-height:\s*46px/);
  assert.match(css, /\.primary-button, \.button-primary, \.tracker-primary-button[\s\S]*?min-height:\s*44px/);
});

test("reduced-motion preference remains respected", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("Release 1.2.8 advances package metadata without changing dependencies", () => {
  assert.equal(pkg.version, "1.2.8");
  assert.equal(lock.version, "1.2.8");
  assert.equal(lock.packages[""].version, "1.2.8");
  assert.equal(pkg.scripts["test:phase16"], "node --test tests/phase16-visual-system.test.mjs");
  assert.match(pkg.scripts["test:all"], /test:phase16/);
  assert.match(pkg.scripts["test:all"], /test:phase17/);
  assert.match(pkg.scripts["test:all"], /test:phase19/);
  assert.deepEqual(pkg.dependencies, lock.packages[""].dependencies);
  assert.deepEqual(pkg.devDependencies, lock.packages[""].devDependencies);
});
