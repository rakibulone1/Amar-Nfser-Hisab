import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const masterSql = read("supabase/MASTER_DATABASE_SETUP.sql");

test("Master SQL includes authenticated, invoker-only transactional restore", () => {
  const start = masterSql.indexOf("create or replace function public.restore_personal_backup");
  const end = masterSql.indexOf("-- Login throttle RPCs", start);
  const restore = masterSql.slice(start, end);
  assert.match(restore, /returns jsonb language plpgsql security invoker/i);
  assert.match(restore, /auth\.uid\(\)/i);
  assert.match(restore, /empty journal account required/i);
  assert.match(masterSql, /grant execute on function public\.restore_personal_backup\(jsonb\) to authenticated/i);
  assert.match(restore, /jsonb_populate_record/);
  assert.doesNotMatch(restore, /security definer/i);
});

test("Analytics report is one authenticated RLS-scoped RPC with bounded date windows", () => {
  const report = read("src/modules/nafs-mirror/report.ts");
  const start = masterSql.indexOf("create or replace function public.get_nafs_report_dataset");
  const end = masterSql.indexOf("-- Empty-account-only restore", start);
  const sql = masterSql.slice(start, end);
  assert.match(report, /get_nafs_report_dataset/);
  assert.match(report, /days > 366/);
  assert.match(report, /prayerExpected = range\.days \* 5/);
  assert.match(sql, /p\.user_id=v_user and p\.journal_date between p_from and p_to/i);
  assert.match(sql, /p_to - p_from > 365/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /security definer/i);
});

test("Backup endpoints require authenticated context and explicit restore confirmation", () => {
  const exp = read("src/app/api/backup/export/route.ts");
  const imp = read("src/app/api/backup/import/route.ts");
  assert.match(exp, /getApiContext/);
  assert.match(imp, /getApiContext/);
  assert.match(imp, /confirmRestore !== true/);
  assert.match(imp, /restore_personal_backup/);
  assert.match(imp, /10 \* 1024 \* 1024/);
});

test("Downloaded backups are encrypted with AES-GCM and PBKDF2", () => {
  const ui = read("src/modules/backup/backup-workspace.tsx");
  assert.match(ui, /PBKDF2/);
  assert.match(ui, /AES-GCM/);
  assert.match(ui, /ENCRYPTION_ITERATIONS = 310_000/);
  assert.match(ui, /typedConfirm !== "RESTORE"/);
  assert.match(ui, /Private image files must be backed up separately|Private ছবির আসল ফাইল এই Backup-এ নেই/);
});

test("Legacy Nafs Mirror and settings routes redirect to the persistent client workspace", () => {
  const page = read("src/app/(protected)/nafs-mirror/page.tsx");
  const api = read("src/app/api/analytics/route.ts");
  assert.match(page, /redirect\("\/dashboard\?section=mirror"\)/);
  assert.match(api, /getNafsReport/);
  assert.match(api, /Cache-Control.*no-store/);
  assert.match(read("src/modules/nafs-mirror/analytics-workspace.tsx"), /Analytics/);
  assert.match(read("src/app/(protected)/settings/page.tsx"), /section=settings|dashboard\?section=settings/);
});

test("AES-256-GCM backup parameters round-trip and reject tampering", async () => {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify({ format: "amar-nfser-hisab", version: 1, sample: "private journal" }));
  const passphrase = "test-passphrase-strong-enough";
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const additionalData = encoder.encode("amar-nfser-hisab:encrypted-backup:v1");
  const material = await webcrypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await webcrypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
  const ciphertext = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, plaintext);
  const decoded = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData }, key, ciphertext);
  assert.equal(new TextDecoder().decode(decoded), new TextDecoder().decode(plaintext));
  const modified = new Uint8Array(ciphertext);
  modified[modified.length - 1] ^= 1;
  await assert.rejects(() => webcrypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData }, key, modified));
});
