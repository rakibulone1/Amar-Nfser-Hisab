"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileArchive, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck, Upload } from "lucide-react";

type EncryptedBackup = {
  format: "amar-nfser-hisab-encrypted-backup";
  version: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  cipher: "AES-256-GCM";
  salt: string;
  iv: string;
  ciphertext: string;
};

type BackupPayload = {
  format: "amar-nfser-hisab";
  version: 1;
  data: Record<string, unknown>;
  [key: string]: unknown;
};

const ENCRYPTION_ITERATIONS = 310_000;
const ASSOCIATED_DATA = new TextEncoder().encode("amar-nfser-hisab:encrypted-backup:v1");

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number, usage: KeyUsage[]) {
  const material = await crypto.subtle.importKey("raw", toArrayBuffer(new TextEncoder().encode(passphrase)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

async function encryptBackup(plain: unknown, passphrase: string): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ENCRYPTION_ITERATIONS, ["encrypt"]);
  const plaintext = new TextEncoder().encode(JSON.stringify(plain));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(ASSOCIATED_DATA) }, key, toArrayBuffer(plaintext));
  return {
    format: "amar-nfser-hisab-encrypted-backup", version: 1,
    kdf: "PBKDF2-SHA256", iterations: ENCRYPTION_ITERATIONS, cipher: "AES-256-GCM",
    salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptBackup(value: EncryptedBackup, passphrase: string): Promise<BackupPayload> {
  if (value.format !== "amar-nfser-hisab-encrypted-backup" || value.version !== 1 || value.kdf !== "PBKDF2-SHA256" || value.cipher !== "AES-256-GCM" || value.iterations !== ENCRYPTION_ITERATIONS) {
    throw new Error("Encrypted backup-এর Format বা Version সমর্থিত নয়।");
  }
  const salt = fromBase64(value.salt);
  const iv = fromBase64(value.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error("Backup-এর Encryption Metadata সঠিক নয়।");
  const key = await deriveKey(passphrase, salt, value.iterations, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(ASSOCIATED_DATA) },
    key,
    toArrayBuffer(fromBase64(value.ciphertext))
  );
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("ডিক্রিপ্ট করা ফাইলটি সমর্থিত Journal Backup নয়।");
  const candidate = parsed as Partial<BackupPayload>;
  if (candidate.format !== "amar-nfser-hisab" || candidate.version !== 1 || typeof candidate.data !== "object" || candidate.data === null || Array.isArray(candidate.data)) {
    throw new Error("ডিক্রিপ্ট করা ফাইলটি সমর্থিত Journal Backup নয়।");
  }
  return candidate as BackupPayload;
}

function downloadFile(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function BackupWorkspace() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState<"export" | "inspect" | "restore" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [counts, setCounts] = useState<[string, number][]>([]);
  const [acknowledge, setAcknowledge] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState("");

  async function exportEncrypted() {
    if (passphrase.length < 12) { setError("Backup Passphrase কমপক্ষে ১২ অক্ষরের হতে হবে।"); return; }
    setBusy("export"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/backup/export", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Backup Export করা যায়নি।");
      const encrypted = await encryptBackup(payload, passphrase);
      const suffix = new Date().toISOString().slice(0, 10);
      downloadFile(`Amar_Nfser_Hisab_${suffix}.anhbackup`, JSON.stringify(encrypted));
      setMessage("Encrypted Backup তৈরি ও ডাউনলোড করা হয়েছে। Passphrase আলাদা নিরাপদ স্থানে রাখো।");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Backup তৈরি করা যায়নি।");
    } finally { setBusy(null); }
  }

  async function inspectFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Backup ফাইল ১০ MB সীমা অতিক্রম করেছে।"); return; }
    if (passphrase.length < 12) { setError("ফাইল খোলার আগে Export করার সময় ব্যবহৃত Passphrase লিখো (কমপক্ষে ১২ অক্ষর)।"); return; }
    setBusy("inspect"); setError(""); setMessage(""); setPendingBackup(null); setCounts([]);
    try {
      const encrypted = JSON.parse(await file.text()) as EncryptedBackup;
      const backup = await decryptBackup(encrypted, passphrase);
      const arrayCounts = Object.entries(backup.data as Record<string, unknown>)
        .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
        .map(([name, rows]) => [name, rows.length] as [string, number]);
      setPendingBackup(backup); setCounts(arrayCounts);
      setAcknowledge(false); setTypedConfirm("");
      setMessage("ফাইলটি সঠিক Passphrase দিয়ে খোলা হয়েছে। নিচের রেকর্ড তালিকা পরীক্ষা করো।");
    } catch (reason) {
      setError(reason instanceof Error && reason.name === "OperationError" ? "Passphrase ভুল অথবা Backup ফাইল ক্ষতিগ্রস্ত।" : reason instanceof Error ? reason.message : "Backup ফাইল পড়া যায়নি।");
    } finally { setBusy(null); }
  }

  async function restoreBackup() {
    if (!pendingBackup || !acknowledge || typedConfirm !== "RESTORE") return;
    setBusy("restore"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/backup/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: pendingBackup, confirmRestore: true })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Restore সম্পন্ন হয়নি।");
      const ignored = Number(result.result?.attachment_metadata_ignored || 0);
      const voided = Number(result.result?.voided_qada_obligations_not_restored || 0);
      const notes = [
        "Restore সম্পন্ন হয়েছে।",
        "ছবির আসল ফাইল এই Backup-এ নেই।",
        ignored ? `${ignored.toLocaleString("bn-BD")}টি Attachment Metadata Restore হয়নি।` : "",
        voided ? `${voided.toLocaleString("bn-BD")}টি বাতিল Qada ইতিহাস পুনর্গঠন করা হয়নি।` : ""
      ].filter(Boolean).join(" ");
      setMessage(`${notes} পৃষ্ঠা রিফ্রেশ করা হচ্ছে।`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Restore সম্পন্ন হয়নি।");
    } finally { setBusy(null); }
  }

  return <section className="panel backup-workspace">
    <div className="panel-heading"><div><span className="eyebrow">ব্যক্তিগত তথ্য ব্যবস্থাপনা</span><h2>ডেটা ব্যাকআপ ও পুনরুদ্ধার</h2></div><span className="panel-icon"><FileArchive size={18} /></span></div>
    <p className="backup-intro">ব্যাকআপ AES-256-GCM দিয়ে এনক্রিপ্ট হবে। ফাইল খোলার জন্য Export-এর সময় দেওয়া Passphrase লাগবে; সেটি হারালে ব্যাকআপ পুনরুদ্ধার করা যাবে না।</p>
    <div className="backup-passphrase-row">
      <label className="backup-passphrase">Backup Passphrase
        <input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} minLength={12} maxLength={256} placeholder="কমপক্ষে ১২ অক্ষর" />
      </label>
      <button type="button" className="primary-button" onClick={() => void exportEncrypted()} disabled={busy !== null}>
        {busy === "export" ? <RefreshCw size={16} className="spin-icon" /> : <Download size={16} />} Encrypted Backup Export
      </button>
    </div>
    <div className="backup-security-note"><LockKeyhole size={17} /><span>Backup ফাইল কম্পিউটারে Encrypted অবস্থায় থাকবে। Passphrase কখনো Journal Database-এ সংরক্ষণ হয় না।</span></div>

    <div className="backup-import-area">
      <div className="backup-import-title"><div><strong>Backup Restore</strong><span>শুধুমাত্র নতুন/খালি Journal অ্যাকাউন্টে</span></div><button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} disabled={busy !== null}><Upload size={15} /> Encrypted File নির্বাচন</button></div>
      <input ref={fileInput} type="file" accept=".anhbackup,application/json" className="visually-hidden" onChange={(event) => void inspectFile(event.target.files?.[0])} />
      {busy === "inspect" && <div className="inline-status"><RefreshCw size={14} className="spin-icon" /> Backup যাচাই হচ্ছে</div>}
      {pendingBackup && <div className="backup-preview">
        <div className="backup-preview-heading"><FileCheck2 size={18} /><strong>Backup যাচাই সফল</strong><span>Version 1</span></div>
        <div className="backup-count-grid">{counts.map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><b>{value.toLocaleString("bn-BD")}</b></div>)}</div>
        <div className="backup-warning"><AlertTriangle size={17} /><span>Restore কেবল খালি অ্যাকাউন্টে চলবে। বর্তমান অ্যাকাউন্টে Journal রেকর্ড থাকলে Restore প্রত্যাখ্যান হবে। Private ছবির আসল ফাইল এই Backup-এ নেই; শুধু কিছু Attachment Metadata আছে।</span></div>
        <label className="backup-acknowledge"><input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} /> আমি নিশ্চিত যে এই অ্যাকাউন্টটি খালি এবং Restore-এর সীমাবদ্ধতা বুঝেছি।</label>
        <label className="backup-passphrase">নিশ্চিত করতে RESTORE লিখো
          <input value={typedConfirm} onChange={(event) => setTypedConfirm(event.target.value)} autoComplete="off" maxLength={12} placeholder="RESTORE" />
        </label>
        <button type="button" className="danger-button" onClick={() => void restoreBackup()} disabled={busy !== null || !acknowledge || typedConfirm !== "RESTORE"}>
          {busy === "restore" ? <RefreshCw size={16} className="spin-icon" /> : <ShieldCheck size={16} />} নিরাপদে Restore করো
        </button>
      </div>}
    </div>
    {error && <p className="form-error backup-feedback">{error}</p>}
    {message && <p className="backup-success"><CheckCircle2 size={15} /> {message}</p>}
    <p className="analytics-footnote">Import বর্তমান ডেটার সঙ্গে Merge হয় না। Storage-এর ছবি আলাদাভাবে ব্যাকআপ করো।</p>
  </section>;
}
