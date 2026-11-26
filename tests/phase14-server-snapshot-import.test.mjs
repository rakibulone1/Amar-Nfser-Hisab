import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = readFileSync(resolve(root, "src/components/frontend-workspace.tsx"), "utf8");
const store = readFileSync(resolve(root, "src/lib/local/store.ts"), "utf8");

test("frontend imports the server snapshot getter used by useSyncExternalStore", () => {
  const storeImport = frontend.match(/import\s*\{([\s\S]*?)\}\s*from\s*[\"']@\/lib\/local\/store[\"']/);
  assert.ok(storeImport, "expected a named import from @/lib/local/store");
  assert.match(storeImport[1], /\bgetLocalDataServerSnapshot\b/, "server snapshot getter must be imported");
  assert.match(store, /export\s+function\s+getLocalDataServerSnapshot\s*\(/, "store must export the getter");
  assert.match(frontend, /useSyncExternalStore\(subscribeLocalData,\s*getLocalDataSnapshot,\s*getLocalDataServerSnapshot\)/, "useSyncExternalStore must use the imported server getter");
});
