import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const target = resolve(root, ".env.local");
const template = resolve(root, ".env.example");

if (existsSync(target) && !process.argv.includes("--reset")) {
  const current = await readFile(target, "utf8");
  const lines = current.split(/\r?\n/);
  const throttlePattern = /^\s*LOGIN_THROTTLE_SECRET\s*=(.*)$/;
  const index = lines.findIndex((line) => throttlePattern.test(line));
  const existingValue = index >= 0 ? lines[index].match(throttlePattern)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "" : "";
  const needsSecret = existingValue.length < 32 || /__GENERATE_|REPLACE_WITH_/i.test(existingValue);
  if (needsSecret) {
    const generatedSecret = randomBytes(32).toString("hex");
    if (index >= 0) lines[index] = `LOGIN_THROTTLE_SECRET=${generatedSecret}`;
    else {
      while (lines.length && lines.at(-1) === "") lines.pop();
      lines.push("", `LOGIN_THROTTLE_SECRET=${generatedSecret}`);
    }
    await writeFile(target, lines.join("\n") + (current.endsWith("\n") ? "\n" : ""), "utf8");
    console.log(".env.local-এর বিদ্যমান Supabase মান অক্ষত রাখা হয়েছে; অনুপস্থিত LOGIN_THROTTLE_SECRET নিরাপদভাবে তৈরি হয়েছে।");
  } else {
    console.log(".env.local আগে থেকেই আছে। কোনো Environment Value পরিবর্তন করা হয়নি।");
  }
  console.log("এখন শুধু Supabase-এর URL, Publishable Key ও Server-only Secret Key সঠিক আছে কি না `npm run env:check` দিয়ে যাচাই করো।");
  process.exit(0);
}

if (existsSync(target) && process.argv.includes("--reset")) {
  const backup = resolve(root, `.env.local.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const previousContents = await readFile(target);
  await writeFile(backup, previousContents, { flag: "wx", mode: 0o600 });
  await unlink(target);
  console.log(`আগের Environment backup রাখা হয়েছে: ${backup.split(/[\\/]/).at(-1)}`);
}

if (!existsSync(template)) {
  console.error(".env.example পাওয়া যায়নি। প্রজেক্ট Root থেকে কমান্ডটি চালাও।");
  process.exit(1);
}

const source = await readFile(template, "utf8");
const throttleSecret = randomBytes(32).toString("hex");
const output = source.replace(/(__GENERATE_RANDOM_SECRET__|REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARS)/g, throttleSecret);
await writeFile(target, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
console.log(".env.local তৈরি হয়েছে এবং LOGIN_THROTTLE_SECRET নিরাপদভাবে Generate করা হয়েছে।");
console.log("এখন .env.local ফাইলে এই তিনটি মান বসাও:");
console.log("  1. NEXT_PUBLIC_SUPABASE_URL");
console.log("  2. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
console.log("  3. SUPABASE_SECRET_KEY");
console.log("কোনো Secret Value Terminal-এ দেখানো হয়নি।");
