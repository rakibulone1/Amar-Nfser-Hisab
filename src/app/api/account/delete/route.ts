import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { isSameOriginRequest } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/read-json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  password: z.string().min(8).max(128),
  confirmation: z.literal("DELETE")
}).strict();

const STORAGE_BUCKET = "journal-private";
const STORAGE_PAGE_SIZE = 100;
const MAX_ACCOUNT_FILES = 5000;
const REMOVE_BATCH_SIZE = 100;

type StorageEntry = { name: string; id?: string | null; metadata?: unknown | null };

async function collectAccountStoragePaths(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  accountId: string
): Promise<string[]> {
  const paths: string[] = [];
  let bucketMissing = false;

  async function visit(prefix: string, depth: number): Promise<void> {
    if (depth > 4) throw new Error("ACCOUNT_STORAGE_DEPTH_LIMIT");
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(STORAGE_BUCKET).list(prefix, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" }
      });
      if (error) {
        if (/bucket not found|not found/i.test(error.message)) {
          bucketMissing = true;
          return;
        }
        throw new Error("ACCOUNT_STORAGE_LIST_FAILED");
      }
      const entries = (data ?? []) as StorageEntry[];
      for (const item of entries) {
        const path = `${prefix}/${item.name}`;
        const isFile = Boolean(item.id || item.metadata);
        if (isFile) {
          paths.push(path);
          if (paths.length > MAX_ACCOUNT_FILES) throw new Error("ACCOUNT_STORAGE_LIMIT");
        } else {
          await visit(path, depth + 1);
        }
      }
      if (entries.length < STORAGE_PAGE_SIZE) break;
      offset += entries.length;
    }
  }

  await visit(accountId, 0);
  return bucketMissing ? [] : paths;
}

async function removeAccountStorage(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  paths: string[]
): Promise<void> {
  for (let offset = 0; offset < paths.length; offset += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(offset, offset + REMOVE_BATCH_SIZE);
    const { error } = await admin.storage.from(STORAGE_BUCKET).remove(batch);
    if (error) throw new Error("ACCOUNT_STORAGE_REMOVE_FAILED");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "অনুরোধটি গ্রহণ করা হয়নি।" }, { status: 403 });
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ message: "সঠিক অনুরোধ পাঠাও।" }, { status: 415 });
  }

  const body = await readJsonBody(request, 4_000);
  if (!body.success) {
    return NextResponse.json({ message: "অ্যাকাউন্ট মুছে ফেলার তথ্য সঠিক নয়।" }, { status: 400 });
  }
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ message: "বর্তমান পাসওয়ার্ড এবং DELETE নিশ্চিতকরণ লিখতে হবে।" }, { status: 400 });
  }

  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  if (!context.user.email) {
    return NextResponse.json({ message: "সেশন যাচাই করা যায়নি। আবার লগইন করো।" }, { status: 401 });
  }

  // Re-authenticate with the account password before performing an irreversible operation.
  const { error: reauthError } = await context.supabase.auth.signInWithPassword({
    email: context.user.email,
    password: parsed.data.password
  });
  if (reauthError) {
    return NextResponse.json({ message: "বর্তমান পাসওয়ার্ড সঠিক নয়।" }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdminClient();
    // Storage objects are not relational children of auth.users. Remove the
    // account-prefixed private files explicitly before deleting the Auth user.
    const storagePaths = await collectAccountStoragePaths(admin, context.user.id);
    await removeAccountStorage(admin, storagePaths);

    // All public account-owned records are linked to auth.users with ON DELETE CASCADE.
    // Deleting the Auth user therefore removes profiles, preferences and tracker rows.
    const { error: deleteError } = await admin.auth.admin.deleteUser(context.user.id);
    if (deleteError) {
      return NextResponse.json({ message: "অ্যাকাউন্ট মুছে ফেলা যায়নি। ডেটা রেকর্ড অক্ষত আছে; আবার চেষ্টা করো।" }, { status: 503 });
    }

    // Clear the current browser session cookie after the server confirms deletion.
    await context.supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      message: "অ্যাকাউন্ট ও এর সঙ্গে যুক্ত অনলাইন তথ্য মুছে ফেলা হয়েছে।"
    }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ACCOUNT_DELETE_FAILED";
    const message = code === "ACCOUNT_STORAGE_LIMIT"
      ? "অ্যাকাউন্টে ৫,০০০-এর বেশি ব্যক্তিগত ফাইল রয়েছে। নিরাপদে মুছে ফেলার জন্য সাপোর্ট দরকার।"
      : code === "ACCOUNT_STORAGE_DEPTH_LIMIT"
        ? "ব্যক্তিগত ফাইলের ফোল্ডার কাঠামো প্রত্যাশিত সীমা ছাড়িয়েছে।"
        : "ব্যক্তিগত ফাইল পরিষ্কার করা যায়নি; নিরাপত্তার জন্য অ্যাকাউন্ট মুছে ফেলা হয়নি।";
    return NextResponse.json({ message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
