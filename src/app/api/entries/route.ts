import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiContext, isErrorResponse } from "@/lib/api/context";
import { readJsonBody } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const component = z.object({
  componentKey: z.enum(["fajr_sunnah", "dhuhr_before", "dhuhr_after", "asr_before", "maghrib_after", "isha_after", "isha_witr"]),
  componentName: z.string().trim().min(1).max(100),
  rakats: z.number().int().min(1).max(4),
  performed: z.boolean(),
  omissionReason: z.string().trim().max(1500).optional()
}).strict();

const prayerSchema = z.object({
  kind: z.literal("prayer"), journalDate: date,
  prayerName: z.enum(["fajr", "dhuhr", "asr", "maghrib", "isha"]),
  fardMethod: z.enum(["jamaat", "individual", "missed"]),
  jamaatResult: z.enum(["takbir_ula", "late_complete", "missed_rakat"]).nullable().optional(),
  missedRakat: z.number().int().min(0).max(3).optional(),
  fardReason: z.string().trim().max(1500).optional(),
  performedAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(2000).optional(),
  components: z.array(component).max(4).default([])
}).strict();
const fastingSchema = z.object({
  kind: z.literal("fasting"), journalDate: date,
  fastingType: z.enum(["obligatory", "sunnah", "nafl"]),
  fastingCategory: z.enum(["ramadan", "qada", "vow", "monday", "thursday", "white_days", "arafah", "ashura", "shawwal", "custom"]),
  customLabel: z.string().trim().max(120).optional(),
  status: z.enum(["completed", "missed", "excused"]),
  saveAsTemplate: z.boolean().optional(),
  reason: z.string().trim().max(1500).optional(), note: z.string().trim().max(2000).optional()
}).strict();
const quranSchema = z.object({
  kind: z.literal("quran"), journalDate: date,
  surahFrom: z.number().int().min(1).max(114).nullable().optional(),
  ayahFrom: z.number().int().min(1).max(300).nullable().optional(),
  surahTo: z.number().int().min(1).max(114).nullable().optional(),
  ayahTo: z.number().int().min(1).max(300).nullable().optional(),
  pageFrom: z.number().int().min(1).max(604).nullable().optional(),
  pageTo: z.number().int().min(1).max(604).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  note: z.string().trim().max(1500).optional()
}).strict().refine((v) => {
  const ayah = v.surahFrom != null && v.ayahFrom != null && v.surahTo != null && v.ayahTo != null;
  const page = v.pageFrom != null && v.pageTo != null;
  const pagePartial = (v.pageFrom == null) !== (v.pageTo == null);
  return (ayah || page) && !pagePartial;
}, { message: "আয়াত বা পৃষ্ঠার সম্পূর্ণ পরিসর দিতে হবে।" });
const dhikrSchema = z.object({
  kind: z.literal("dhikr"), journalDate: date,
  title: z.string().trim().min(1).max(120), category: z.enum(["morning", "evening", "after_prayer", "general", "custom"]).default("general"),
  count: z.number().int().min(1).max(1000000), targetCount: z.number().int().min(1).max(1000000).nullable().optional(),
  saveAsTemplate: z.boolean().optional(), note: z.string().trim().max(1200).optional(), performedAt: z.string().datetime().nullable().optional()
}).strict();
const deedSchema = z.object({
  kind: z.literal("deed"), journalDate: date,
  deedType: z.enum(["good", "bad"]), title: z.string().trim().min(1).max(140),
  details: z.string().trim().max(3000).optional(), saveAsTemplate: z.boolean().optional(), occurredAt: z.string().datetime().nullable().optional()
}).strict();
const dailySchema = z.object({
  kind: z.literal("daily"), journalDate: date,
  title: z.string().trim().max(160).optional(),
  mood: z.enum(["peaceful", "grateful", "hopeful", "neutral", "stressed", "sad", "tired"]).nullable().optional(),
  energyLevel: z.number().int().min(1).max(5).nullable().optional(),
  body: z.string().trim().max(12000).optional(),
  reflection: z.string().trim().max(5000).optional(),
  gratitude: z.string().trim().max(3000).optional(),
  nextDayFocus: z.string().trim().max(2000).optional()
}).strict();
const schema = z.discriminatedUnion("kind", [prayerSchema, fastingSchema, quranSchema, dhikrSchema, deedSchema, dailySchema]);

const tables = {
  prayer: "prayer_logs", fasting: "fasting_logs", quran: "quran_reading_logs",
  dhikr: "dhikr_logs", deed: "deed_logs", daily: "daily_journals"
} as const;

export async function GET(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind");
  const journalDate = params.get("date");
  if (!kind || !Object.prototype.hasOwnProperty.call(tables, kind) || (journalDate && !date.safeParse(journalDate).success)) {
    return NextResponse.json({ message: "Entry Type বা তারিখ সঠিক নয়।" }, { status: 400 });
  }
  const table = tables[kind as keyof typeof tables];
  let query = context.supabase.from(table).select("*").eq("user_id", context.user.id);
  if (journalDate && kind !== "dhikr" && kind !== "deed") query = query.eq("journal_date", journalDate);
  query = query.order("created_at", { ascending: false }).limit(kind === "daily" || kind === "fasting" ? 1 : 40);
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: "রেকর্ড লোড করা যায়নি। Migration পরীক্ষা করো।" }, { status: 400 });

  let entries: Record<string, unknown>[] = (data ?? []) as Record<string, unknown>[];
  let templates: { title: string; group?: string }[] = [];

  if (kind === "prayer" && data?.length) {
    const ids = data.map((row) => row.id as string);
    const { data: parts } = await context.supabase.from("prayer_components").select("*")
      .eq("user_id", context.user.id).in("prayer_log_id", ids);
    entries = data.map((row) => ({ ...row, components: (parts ?? []).filter((part) => part.prayer_log_id === row.id) }));
  }

  if (kind === "fasting") {
    const { data: rows } = await context.supabase.from("fasting_templates").select("title")
      .eq("user_id", context.user.id).order("title").limit(100);
    templates = (rows ?? []).flatMap((row) => typeof row.title === "string" ? [{ title: row.title }] : []);
  } else if (kind === "dhikr") {
    const { data: rows } = await context.supabase.from("dhikr_templates").select("title")
      .eq("user_id", context.user.id).order("title").limit(100);
    templates = (rows ?? []).flatMap((row) => typeof row.title === "string" ? [{ title: row.title }] : []);
  } else if (kind === "deed") {
    const { data: rows } = await context.supabase.from("deed_templates").select("title, deed_type")
      .eq("user_id", context.user.id).order("title").limit(100);
    templates = (rows ?? []).flatMap((row) => typeof row.title === "string" ? [{ title: row.title, ...(typeof row.deed_type === "string" ? { group: row.deed_type } : {}) }] : []);
  }

  if ((kind === "daily" || kind === "deed") && data?.length) {
    const ids = data.map((row) => row.id as string);
    const { data: attachments } = await context.supabase.from("journal_attachments").select("id, entity_id, storage_path, mime_type, file_size")
      .eq("user_id", context.user.id).eq("entity_type", kind === "daily" ? "daily_journal" : "deed_log").in("entity_id", ids);
    const paths = (attachments ?? []).flatMap((attachment) => typeof attachment.storage_path === "string" ? [attachment.storage_path] : []);
    const signedResult = paths.length ? await context.supabase.storage.from("journal-private").createSignedUrls(paths, 120) : { data: [] };
    const signedByPath = new Map((signedResult.data ?? []).map((item) => [item.path, item.signedUrl] as const));
    entries = data.map((row) => ({
      ...row,
      attachments: (attachments ?? []).filter((attachment) => attachment.entity_id === row.id).map((attachment) => ({
        id: attachment.id, mime_type: attachment.mime_type, file_size: attachment.file_size,
        signed_url: typeof attachment.storage_path === "string" ? signedByPath.get(attachment.storage_path) ?? null : null
      }))
    }));
  }
  return NextResponse.json({ entries, templates }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getApiContext(request);
  if (isErrorResponse(context)) return context.response;
  const body = await readJsonBody(request, 24_000);
  if (!body.success) return NextResponse.json({ message: "সঠিক তথ্য পাঠাও।" }, { status: body.reason === "too-large" ? 413 : 400 });
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ message: "এন্ট্রির তথ্য সঠিক নয়। প্রয়োজনীয় ঘরগুলো পরীক্ষা করো।" }, { status: 400 });
  const value = parsed.data;

  if (value.kind === "prayer") {
    const components = value.components.map((item) => ({
      component_key: item.componentKey, component_name: item.componentName,
      rakats: item.rakats, performed: item.performed, omission_reason: item.omissionReason || null
    }));
    const { data, error } = await context.supabase.rpc("save_prayer_entry", {
      p_prayer_name: value.prayerName,
      p_journal_date: value.journalDate,
      p_fard_method: value.fardMethod,
      p_jamaat_result: value.jamaatResult || null,
      p_missed_rakat: value.missedRakat ?? 0,
      p_fard_reason: value.fardReason || null,
      p_performed_at: value.performedAt || null,
      p_note: value.note || null,
      p_components: components
    });
    if (error) return NextResponse.json({ message: "সালাতের রেকর্ড সংরক্ষণ করা যায়নি। কারণ ও Migration পরীক্ষা করো।" }, { status: 400 });
    return NextResponse.json({ id: data, message: "সালাতের হিসাব সংরক্ষিত হয়েছে।" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }

  if (value.kind === "fasting") {
    let customTemplateId: string | null = null;
    if (value.fastingCategory === "custom" && value.customLabel) {
      if (value.saveAsTemplate) {
        const { data: template, error: templateError } = await context.supabase.from("fasting_templates")
          .upsert({ user_id: context.user.id, title: value.customLabel }, { onConflict: "user_id,title" }).select("id").single();
        if (templateError) return NextResponse.json({ message: "সিয়ামের নিজস্ব নাম সংরক্ষণ করা যায়নি।" }, { status: 400 });
        customTemplateId = typeof template.id === "string" ? template.id : null;
      } else {
        const { data: template } = await context.supabase.from("fasting_templates").select("id")
          .eq("user_id", context.user.id).eq("title", value.customLabel).maybeSingle();
        customTemplateId = typeof template?.id === "string" ? template.id : null;
      }
    }
    const { data, error } = await context.supabase.from("fasting_logs").upsert({
      user_id: context.user.id, journal_date: value.journalDate, fasting_type: value.fastingType,
      fasting_category: value.fastingCategory, custom_label: value.customLabel || null,
      custom_template_id: customTemplateId, status: value.status,
      reason: value.reason || null, note: value.note || null
    }, { onConflict: "user_id,journal_date" }).select("id").single();
    if (error) return NextResponse.json({ message: "সিয়ামের তথ্য সংরক্ষণ করা যায়নি। কারণ উল্লেখ করো।" }, { status: 400 });
    return NextResponse.json({ id: data.id, message: "সিয়ামের হিসাব সংরক্ষিত হয়েছে।" }, { status: 201 });
  }

  if (value.kind === "quran") {
    const { data, error } = await context.supabase.from("quran_reading_logs").insert({
      user_id: context.user.id, journal_date: value.journalDate,
      surah_from: value.surahFrom ?? null, ayah_from: value.ayahFrom ?? null,
      surah_to: value.surahTo ?? null, ayah_to: value.ayahTo ?? null,
      page_from: value.pageFrom ?? null, page_to: value.pageTo ?? null,
      duration_minutes: value.durationMinutes ?? null, note: value.note || null
    }).select("id").single();
    if (error) return NextResponse.json({ message: "কুরআন তিলাওয়াতের তথ্য সংরক্ষণ করা যায়নি।" }, { status: 400 });
    return NextResponse.json({ id: data.id, message: "তিলাওয়াতের হিসাব সংরক্ষিত হয়েছে।" }, { status: 201 });
  }

  if (value.kind === "dhikr") {
    let templateId: string | null = null;
    if (value.saveAsTemplate) {
      const { data: template, error: templateError } = await context.supabase.from("dhikr_templates")
        .upsert({ user_id: context.user.id, title: value.title, category: value.category, target_count: value.targetCount ?? null }, { onConflict: "user_id,title" })
        .select("id").single();
      if (templateError) return NextResponse.json({ message: "জিকিরের নাম সংরক্ষণ করা যায়নি।" }, { status: 400 });
      templateId = typeof template.id === "string" ? template.id : null;
    } else {
      const { data: template } = await context.supabase.from("dhikr_templates").select("id")
        .eq("user_id", context.user.id).eq("title", value.title).maybeSingle();
      templateId = typeof template?.id === "string" ? template.id : null;
    }
    const { data, error } = await context.supabase.from("dhikr_logs").insert({
      user_id: context.user.id, template_id: templateId, title_snapshot: value.title,
      count: value.count, journal_date: value.journalDate,
      performed_at: value.performedAt || null, note: value.note || null
    }).select("id").single();
    if (error) return NextResponse.json({ message: "জিকিরের রেকর্ড সংরক্ষণ করা যায়নি।" }, { status: 400 });
    return NextResponse.json({ id: data.id, message: "জিকিরের হিসাব সংরক্ষিত হয়েছে।" }, { status: 201 });
  }

  if (value.kind === "deed") {
    let templateId: string | null = null;
    if (value.saveAsTemplate) {
      const { data: template, error: templateError } = await context.supabase.from("deed_templates")
        .upsert({ user_id: context.user.id, deed_type: value.deedType, title: value.title }, { onConflict: "user_id,deed_type,title" })
        .select("id").single();
      if (templateError) return NextResponse.json({ message: "কাজের নাম সাজেশনে সংরক্ষণ করা যায়নি।" }, { status: 400 });
      templateId = typeof template.id === "string" ? template.id : null;
    } else {
      const { data: template } = await context.supabase.from("deed_templates").select("id")
        .eq("user_id", context.user.id).eq("deed_type", value.deedType).eq("title", value.title).maybeSingle();
      templateId = typeof template?.id === "string" ? template.id : null;
    }
    const { data, error } = await context.supabase.from("deed_logs").insert({
      user_id: context.user.id, template_id: templateId, deed_type: value.deedType,
      title_snapshot: value.title, details: value.details || null,
      journal_date: value.journalDate, occurred_at: value.occurredAt || null
    }).select("id").single();
    if (error) return NextResponse.json({ message: "কাজের রেকর্ড সংরক্ষণ করা যায়নি।" }, { status: 400 });
    return NextResponse.json({ id: data.id, message: "রেকর্ড সংরক্ষিত হয়েছে।", entityType: "deed_log" }, { status: 201 });
  }

  const { data, error } = await context.supabase.from("daily_journals").upsert({
    user_id: context.user.id, journal_date: value.journalDate, title: value.title || null,
    mood: value.mood || null, energy_level: value.energyLevel ?? null,
    body: value.body || null, reflection: value.reflection || null,
    gratitude: value.gratitude || null, next_day_focus: value.nextDayFocus || null
  }, { onConflict: "user_id,journal_date" }).select("id").single();
  if (error) return NextResponse.json({ message: "দৈনিক জার্নাল সংরক্ষণ করা যায়নি।" }, { status: 400 });
  return NextResponse.json({ id: data.id, message: "দৈনিক জার্নাল সংরক্ষিত হয়েছে।", entityType: "daily_journal" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
