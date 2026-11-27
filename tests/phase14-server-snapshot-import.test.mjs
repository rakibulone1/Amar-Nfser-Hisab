import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = readFileSync(resolve(root, "src/components/frontend-workspace.tsx"), "utf8");
const store = readFileSync(resolve(root, "src/lib/workspace/store.ts"), "utf8");

test("frontend imports the server workspace getter used by useSyncExternalStore", () => {
  const storeImport = frontend.match(/import\s*\{([\s\S]*?)\}\s*from\s*[\"']@\/lib\/workspace\/store[\"']/);
  assert.ok(storeImport, "expected a named import from @/lib/workspace/store");
  assert.match(storeImport[1], /\bgetWorkspaceServerData\b/, "server snapshot getter must be imported");
  assert.match(store, /export\s+function\s+getWorkspaceServerData\s*\(/, "store must export the getter");
  assert.match(frontend, /useSyncExternalStore\(subscribeWorkspaceData,\s*getWorkspaceData,\s*getWorkspaceServerData\)/, "useSyncExternalStore must use the imported server getter");
});
