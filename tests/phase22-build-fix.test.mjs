import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("workspace store imports the toast dispatcher used by online-save feedback", () => {
  const source = read("src/lib/workspace/store.ts");
  assert.match(source, /import\s*\{\s*showAppToast\s*\}\s*from\s*["\']\.\.\/ui\/toast\.ts["\']/);
  assert.match(read("src/lib/ui/toast.ts"), /export function showAppToast\(/);
});

test("tracker center imports and uses the exported cloud-save confirmation helpers", () => {
  const source = read("src/modules/trackers/tracker-center.tsx");
  const store = read("src/lib/workspace/store.ts");
  for (const name of ["flushWorkspaceChanges", "getCloudSyncState", "getCloudSyncMessage"]) {
    assert.match(source, new RegExp(`\\b${name}\\b`));
    assert.match(store, new RegExp(`export (?:async )?function ${name}\\b`));
  }
  assert.match(source, /from ["']@\/lib\/workspace\/store["']/);
});

test("frontend workspace removes unused prayer imports and avoids ternary expression statements", () => {
  const source = read("src/components/frontend-workspace.tsx");
  assert.doesNotMatch(source.split("\n").slice(0, 35).join("\n"), /type PrayerEntry|getPrayerCivilDate|getPrayerWaqtWindow|nextDhakaDate/);
  assert.match(source, /onClick=\{\(\) => \{ setStageReturnTab\("journey"\); if \(progress\.currentStage\)/);
});

test("theme provider and tracker center have no newly orphaned lint symbols", () => {
  const theme = read("src/providers/theme-provider.tsx");
  const tracker = read("src/modules/trackers/tracker-center.tsx");
  assert.match(theme, /\.catch\(\(\)\s*=>\s*\{/);
  assert.doesNotMatch(tracker, /function ScaleGlyph\(/);
});
