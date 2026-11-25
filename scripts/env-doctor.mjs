import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const file = ".env.local";
if (!existsSync(file)) {
  console.error("✖ .env.local পাওয়া যায়নি। প্রথমে `npm run setup:env` চালাও।");
  process.exit(1);
}

const content = await readFile(file, "utf8");
const values = new Map();
for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const splitAt = line.indexOf("=");
  if (splitAt < 1) continue;
  values.set(line.slice(0, splitAt).trim(), line.slice(splitAt + 1).trim().replace(/^['"]|['"]$/g, ""));
}

const isExample = (value) => !value || /YOUR_PROJECT|PASTE_|REPLACE_ME|__GENERATE_|EXAMPLE/i.test(value);
const checks = [];
const url = values.get("NEXT_PUBLIC_SUPABASE_URL");
if (isExample(url)) checks.push(["NEXT_PUBLIC_SUPABASE_URL", false]);
else {
  try {
    const parsed = new URL(url);
    checks.push(["NEXT_PUBLIC_SUPABASE_URL", parsed.protocol === "https:" || ["localhost", "127.0.0.1"].includes(parsed.hostname)]);
  } catch { checks.push(["NEXT_PUBLIC_SUPABASE_URL", false]); }
}
const pickUsable = (names) => names.map((name) => values.get(name)).find((value) => !isExample(value));
const publishable = pickUsable(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
checks.push(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(publishable && (publishable.startsWith("sb_publishable_") || publishable.startsWith("eyJ")))]);
const secret = pickUsable(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
checks.push(["SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY", Boolean(secret && (secret.startsWith("sb_secret_") || secret.startsWith("eyJ")))]);
const throttle = values.get("LOGIN_THROTTLE_SECRET");
checks.push(["LOGIN_THROTTLE_SECRET (কমপক্ষে ৩২ অক্ষর)", Boolean(throttle && throttle.length >= 32 && !isExample(throttle))]);

console.log("\nAmar Nfser Hisab — Environment Check\n");
for (const [name, ok] of checks) console.log(`${ok ? "✔" : "✖"} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  const names = failed.map(([name]) => name);
  console.log(`\n${failed.length}টি Environment মান পূরণ বা সংশোধন করা বাকি।`);
  if (names.some((name) => name.includes("SUPABASE_URL") || name.includes("PUBLISHABLE_KEY") || name.includes("SECRET_KEY"))) {
    console.log("Supabase Dashboard → Project Settings → API Keys থেকে Project URL, Publishable Key এবং Server-only Secret Key নিয়ে শুধু .env.local-এ বসাও।");
    console.log("Publishable Key ক্লায়েন্টে ব্যবহারের জন্য; Server-only Secret Key কখনো NEXT_PUBLIC_ নামে রাখবে না বা কারও সঙ্গে শেয়ার করবে না।");
  }
  if (names.some((name) => name.startsWith("LOGIN_THROTTLE_SECRET"))) {
    console.log("LOGIN_THROTTLE_SECRET নিরাপদভাবে তৈরি করতে `npm run setup:env` আবার চালাও। এটি Supabase Key নয়; স্ক্রিপ্ট নিজেই তৈরি করবে।");
  }
  console.log("কোনো Key বা Secret এখানে পাঠানোর দরকার নেই। মান বসানোর পর Development Server পুনরায় চালাও।");
} else {
  console.log("\nEnvironment File-এর প্রাথমিক যাচাই সফল। এখন Supabase Master SQL ও Auth configuration যাচাই করো।");
}
process.exit(failed.length ? 1 : 0);
