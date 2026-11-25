import { NextResponse, type NextRequest } from "next/server";
import { getApiContext, isErrorResponse } from "@/lib/api/context";

export const dynamic = "force-dynamic";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 100 * 1024;

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 132_000) {
    return NextResponse.json({ message: "ছবির আপলোডের আকার সীমা অতিক্রম করেছে।" }, { status: 413 });
  }
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "ছবির তথ্য পড়া যায়নি।" }, { status: 400 });
  }
  const entityType = form.get("entityType");
  const entityId = form.get("entityId");
  const file = form.get("file");
  if ((entityType !== "daily_journal" && entityType !== "deed_log") || typeof entityId !== "string" || !/^[0-9a-f-]{36}$/i.test(entityId) || !(file instanceof File)) {
    return NextResponse.json({ message: "ছবির তথ্য সঠিক নয়।" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type) || file.size < 1 || file.size > MAX_BYTES) {
    return NextResponse.json({ message: "শুধু JPG, PNG বা WebP ছবি সর্বোচ্চ ১০০ KB আকারে যুক্ত করা যাবে।" }, { status: 413 });
  }
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isPng = signature.length >= 8 && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a;
  const isWebp = signature.length >= 12 && String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  const matchesDeclaredType = (file.type === "image/jpeg" && isJpeg) || (file.type === "image/png" && isPng) || (file.type === "image/webp" && isWebp);
  if (!matchesDeclaredType) {
    return NextResponse.json({ message: "ছবির ফাইলের ধরন যাচাই করা যায়নি।" }, { status: 415 });
  }

  const table = entityType === "daily_journal" ? "daily_journals" : "deed_logs";
  const { data: ownedEntry, error: lookupError } = await context.supabase.from(table).select("id")
    .eq("id", entityId).eq("user_id", context.user.id).maybeSingle();
  if (lookupError || !ownedEntry) return NextResponse.json({ message: "এই এন্ট্রির সঙ্গে ছবি যুক্ত করার অনুমতি নেই।" }, { status: 404 });

  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const storagePath = `${context.user.id}/${entityType}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await context.supabase.storage.from("journal-private").upload(storagePath, file, {
    contentType: file.type, upsert: false, cacheControl: "3600"
  });
  if (uploadError) return NextResponse.json({ message: "ছবি আপলোড করা যায়নি। Storage Migration পরীক্ষা করো।" }, { status: 400 });

  const { data, error: metadataError } = await context.supabase.from("journal_attachments").insert({
    user_id: context.user.id, entity_type: entityType, entity_id: entityId,
    storage_path: storagePath, mime_type: file.type, file_size: file.size
  }).select("id, storage_path, mime_type, file_size").single();
  if (metadataError) {
    await context.supabase.storage.from("journal-private").remove([storagePath]);
    return NextResponse.json({ message: "ছবির তথ্য সংরক্ষণ করা যায়নি।" }, { status: 400 });
  }
  return NextResponse.json({ attachment: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
