import { showAppToast } from "../ui/toast.ts";

export type AppSection = "home" | "goals" | "journal" | "mirror" | "notifications" | "settings";
export type PrayerId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PrayerMethod = "jamaat" | "home" | "qada" | "not-performed";
export type PrayerPartCategory = "sunnah" | "fard" | "wajib" | "nafl";
export type TrackerKind = "prayer" | "quran" | "dhikr" | "fasting" | "good" | "avoid" | "ilm" | "habit" | "reflection";
export type RecordKind = TrackerKind | "bad";

export type WorkspaceGoal = {
  id: string; title: string; details: string; deadline: string;
  progress: number; complete: boolean; createdAt: string;
};
export type WorkspaceRecord = {
  id: string; kind: RecordKind; title: string; details: string; amount: number; unit: string;
  prayerName?: PrayerId; prayerMethod?: "jamaat" | "alone" | "qada" | "missed";
  takbirUla?: boolean; missedRakah?: number; sunnahBefore?: boolean; sunnahAfter?: boolean;
  date: string; createdAt: string;
};
export type PrayerDay = { date: string; completed: Record<PrayerId, boolean>; updatedAt: string };
export type WorkspaceNote = { date: string; mood: string; body: string; reflection: string; gratitude: string; updatedAt: string };

export type PrayerPartConfig = { id: string; label: string; category: PrayerPartCategory; rakats: number; enabled: boolean; required: boolean; omissionReason?: string };
export type PrayerConfig = Record<PrayerId, PrayerPartConfig[]>;
export type PrayerComponentResult = { partId: string; label: string; category: PrayerPartCategory; plannedRakats: number; performed: boolean; performedRakats: number; reason: string };
export type PrayerEntry = {
  id: string; date: string; prayer: PrayerId; method: PrayerMethod; components: PrayerComponentResult[]; qadaId?: string;
  takbirStatus: "with-takbir" | "without-takbir" | "late-join" | "not-applicable";
  caughtRakats: number; completedAfterRakats?: number; missedRakats: number; lateReason: string; missedReason: string;
  performedAt: string; note: string; createdAt: string; updatedAt: string;
};
export type QadaRecord = {
  id: string; prayer: PrayerId; missedDate: string; sourceEntryId: string | null; rakats: number;
  reason: string; status: "pending" | "settled"; settledAt: string | null;
  settlementNote: string; createdAt: string;
};
export type QuranEntry = { id: string; date: string; surahFrom: number; ayahFrom: number; surahTo: number; ayahTo: number; pageFrom: number | null; pageTo: number | null; juz: number | null; note: string; createdAt: string };
export type ExtraPrayerEntry = { id: string; date: string; type: string; category: "sunnah" | "wajib" | "nafl"; rakats: number; performedAt: string; note: string; createdAt: string };
export type DhikrTemplate = { id: string; title: string; group: "morning" | "evening" | "general" | "custom"; target: number; meaning: string; active: boolean };
export type DhikrSession = { id: string; date: string; templateId: string | null; title: string; target: number; count: number; completed: boolean; note: string; createdAt: string; updatedAt: string };
export type FastingEntry = { id: string; date: string; category: "fard" | "nafl" | "qada"; status: "completed" | "not-kept" | "planned"; linkedMissedDate: string; reason: string; note: string; createdAt: string };
export type DeedEntry = { id: string; date: string; category: string; title: string; details: string; note: string; createdAt: string };
export type AvoidEntry = { id: string; date: string; habitName: string; status: "avoided" | "challenging" | "slipped"; trigger: string; response: string; note: string; createdAt: string };
export type DuaItem = { id: string; title: string; arabicText: string; transliteration: string; meaning: string; reference: string; target: number; memorization: number; note: string; createdAt: string };
export type StudyEntry = { id: string; date: string; resource: string; subject: string; chapter: string; pages: number; minutes: number; takeaway: string; note: string; createdAt: string };
export type HabitDefinition = { id: string; title: string; frequency: "daily" | "weekly" | "custom"; targetPerWeek: number; active: boolean; createdAt: string };
export type HabitLog = { id: string; habitId: string; date: string; completed: boolean; note: string; createdAt: string };
export type ReflectionEntry = { id: string; date: string; goodToday: string; mistakeToday: string; lesson: string; gratitude: string; tomorrowFocus: string; mood: string; createdAt: string; updatedAt: string };
export type Journey = { id: string; title: string; startDate: string; endDate: string | null; status: "active" | "completed"; note: string; createdAt: string };
export type JourneyMilestone = { id: string; journeyId: string; stageNumber: number; title: string; requiredDays: number; completedAt: string; rewardTitle: string; rewardAmount: number | null; rewardNote: string; badgeAwarded: boolean; createdAt: string };
export type JourneyObservation = { id: string; journeyId: string; stageNumber: number; date: string; occurredAt: string; mood: "hopeful" | "calm" | "focused" | "restless" | "challenged" | "tired" | "mixed"; context: "positive" | "difficult" | "neutral"; situation: string; response: string; reflection: string; createdAt: string };
export type DeadlineTask = { id: string; title: string; details: string; dueDate: string; completed: boolean; completedAt: string | null; createdAt: string };
export type DeadlinePlan = { id: string; title: string; category: "exam" | "assignment" | "project" | "other"; startDate?: string; deadline: string; description: string; tasks: DeadlineTask[]; createdAt: string; updatedAt: string };
export type MosqueTimes = Record<PrayerId, string>;
export type PrayerTimesCache = { date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; sunset?: string; solarNoon?: string; forbiddenTimes?: { sunrise: string; zawal: string; sunset: string }; source: string; fetchedAt: string; latitude: number; longitude: number };
export type ReminderEvent = { id: string; key: string; kind: "waqt-ended" | "jamaat-soon" | "night-qada"; date: string; prayer: PrayerId | null; title: string; message: string; createdAt: string; resolved: boolean; readAt?: string | null; response: "prayed" | "not-prayed" | null };

export type WorkspacePreferences = {
  displayName: string; timeZone: string; maghribTime: string; maghribRollover: boolean;
  remindersEnabled: boolean; prayerReminderMinutes: number; sleepReminder: string;
};
export type PrayerPreferences = {
  calculationMethod: 1; asrSchool: 1; locationLabel: string; latitude: number; longitude: number;
  mosqueTimes: MosqueTimes; mosqueReminderMinutes: number; waqtEndPrompt: boolean; nightQadaReminder: string;
  notificationPermissionAsked: boolean; lastTimesFetchedAt: string;
};
export type WorkspaceData = {
  schemaVersion: 3;
  goals: WorkspaceGoal[]; records: WorkspaceRecord[]; prayerDays: PrayerDay[]; notes: WorkspaceNote[];
  preferences: WorkspacePreferences; prayerConfig: PrayerConfig; prayerEntries: PrayerEntry[]; qadaEntries: QadaRecord[];
  quranEntries: QuranEntry[]; extraPrayerEntries: ExtraPrayerEntry[]; dhikrTemplates: DhikrTemplate[]; dhikrSessions: DhikrSession[];
  fastingEntries: FastingEntry[]; deedEntries: DeedEntry[]; avoidEntries: AvoidEntry[]; duaItems: DuaItem[];
  studyEntries: StudyEntry[]; habitDefinitions: HabitDefinition[]; habitLogs: HabitLog[];
  reflections: ReflectionEntry[]; journeys: Journey[]; journeyMilestones: JourneyMilestone[]; journeyObservations: JourneyObservation[]; deadlinePlans: DeadlinePlan[]; prayerPreferences: PrayerPreferences;
  prayerTimesCache: PrayerTimesCache[]; reminderEvents: ReminderEvent[]; updatedAt: string;
};

export const PRAYER_NAMES: Record<PrayerId, string> = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
const EMPTY_PRAYER_CONFIG: PrayerConfig = {
  fajr: [{ id: "fajr-sunnah", label: "আগের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }, { id: "fajr-fard", label: "ফরজ", category: "fard", rakats: 2, enabled: true, required: true }],
  dhuhr: [{ id: "dhuhr-sunnah-before", label: "আগের সুন্নত", category: "sunnah", rakats: 4, enabled: true, required: false }, { id: "dhuhr-fard", label: "ফরজ", category: "fard", rakats: 4, enabled: true, required: true }, { id: "dhuhr-sunnah-after", label: "পরের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }],
  asr: [{ id: "asr-sunnah-before", label: "আগের সুন্নত", category: "sunnah", rakats: 4, enabled: false, required: false }, { id: "asr-fard", label: "ফরজ", category: "fard", rakats: 4, enabled: true, required: true }],
  maghrib: [{ id: "maghrib-fard", label: "ফরজ", category: "fard", rakats: 3, enabled: true, required: true }, { id: "maghrib-sunnah-after", label: "পরের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }],
  isha: [{ id: "isha-sunnah-before", label: "আগের সুন্নত", category: "sunnah", rakats: 4, enabled: false, required: false }, { id: "isha-fard", label: "ফরজ", category: "fard", rakats: 4, enabled: true, required: true }, { id: "isha-sunnah-after", label: "পরের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }, { id: "isha-witr", label: "বিতর ওয়াজিব", category: "wajib", rakats: 3, enabled: true, required: true }]
};
const EMPTY_DATA: WorkspaceData = {
  schemaVersion: 3, goals: [], records: [], prayerDays: [], notes: [],
  preferences: { displayName: "", timeZone: "Asia/Dhaka", maghribTime: "", maghribRollover: true, remindersEnabled: false, prayerReminderMinutes: 10, sleepReminder: "22:30" },
  prayerConfig: EMPTY_PRAYER_CONFIG, prayerEntries: [], qadaEntries: [], quranEntries: [], extraPrayerEntries: [],
  dhikrTemplates: [
    { id: "morning-istighfar", title: "ইস্তিগফার", group: "morning", target: 100, meaning: "ক্ষমা প্রার্থনা", active: true },
    { id: "morning-salawat", title: "দরুদ শরিফ", group: "morning", target: 100, meaning: "নবী ﷺ-এর প্রতি দরুদ", active: true },
    { id: "evening-tasbih", title: "সুবহানাল্লাহ", group: "evening", target: 33, meaning: "পবিত্রতা ঘোষণা", active: true },
    { id: "custom-general", title: "আলহামদুলিল্লাহ", group: "general", target: 33, meaning: "কৃতজ্ঞতা প্রকাশ", active: true }
  ],
  dhikrSessions: [], fastingEntries: [], deedEntries: [], avoidEntries: [], duaItems: [], studyEntries: [],
  habitDefinitions: [], habitLogs: [], reflections: [], journeys: [], journeyMilestones: [], journeyObservations: [], deadlinePlans: [],
  prayerPreferences: { calculationMethod: 1, asrSchool: 1, locationLabel: "ময়মনসিংহ, বাংলাদেশ (পরিবর্তনযোগ্য)", latitude: 24.7471, longitude: 90.4203, mosqueTimes: { fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" }, mosqueReminderMinutes: 10, waqtEndPrompt: true, nightQadaReminder: "21:30", notificationPermissionAsked: false, lastTimesFetchedAt: "" },
  prayerTimesCache: [], reminderEvents: [], updatedAt: new Date(0).toISOString()
};
let workspaceState: WorkspaceData = EMPTY_DATA;
let hydrated = false;
let hydrateTask: Promise<void> | null = null;
const listeners = new Set<() => void>();
export type CloudSyncState = "idle" | "loading" | "syncing" | "synced" | "offline" | "error";
let cloudSyncState: CloudSyncState = "loading";
let cloudSyncMessage = "অনলাইন তথ্য লোড হচ্ছে…";
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
let cloudSavePromise: Promise<void> | null = null;
let cloudSyncAgain = false;
let pendingWorkspaceState: WorkspaceData | null = null;
let onlineListenerAttached = false;
let lifecycleListenerAttached = false;
let remoteUpdatedAt: string | null = null;
let lastSuccessfulSyncAt: string | null = null;
let confirmedWorkspaceState: WorkspaceData = EMPTY_DATA;
let hasUnsavedChanges = false;
let workspaceLoadError = "";
function setCloudSyncState(state: CloudSyncState, message = "") { cloudSyncState = state; cloudSyncMessage = message; emitChange(); }
function emitChange() { listeners.forEach((listener) => listener()); }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function arrayOrEmpty<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function safeTimeZone(value: unknown): string {
  const requested = typeof value === "string" ? value.trim() : "";
  if (requested === "Asia/Dhaka") return requested;
  return "Asia/Dhaka";
}
function getBanglaSyncError(error: unknown) {
  const detail = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  if (detail.includes("auth_required") || detail.includes("unauthorized") || detail.includes("401") || detail.includes("সেশন")) return "তোমার লগইন সেশন শেষ হয়েছে। আবার লগইন করে কাজটি সংরক্ষণ করো।";
  if (detail.includes("version_conflict") || detail.includes("concurrent") || detail.includes("revision_conflict") || detail.includes("অন্য ট্যাব") || detail.includes("সংঘর্ষ")) return "অন্য ট্যাব বা ডিভাইসে নতুন পরিবর্তন হয়েছে। পৃষ্ঠা রিফ্রেশ করে আবার চেষ্টা করো।";
  if (detail.includes("too_large") || detail.includes("payload_size") || detail.includes("413")) return "রেকর্ডের আকার সংরক্ষণ সীমা ছাড়িয়েছে। অপ্রয়োজনীয় সংযুক্তি বা তথ্য কমিয়ে আবার চেষ্টা করো।";
  if (detail.includes("fetch") || detail.includes("network") || detail.includes("offline") || detail.includes("timeout")) return "ইন্টারনেট বা সার্ভার সংযোগে সমস্যা হয়েছে। পরিবর্তন অনলাইনে সংরক্ষণ হয়নি।";
  return "পরিবর্তন অনলাইনে সংরক্ষণ করা যায়নি। সংযোগ যাচাই করে আবার চেষ্টা করো।";
}
function validClock(value: unknown, fallback = "") { return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback; }
function normalisePrayerConfig(value: unknown): PrayerConfig {
  if (!isObject(value)) return structuredClone(EMPTY_PRAYER_CONFIG);
  const result = structuredClone(EMPTY_PRAYER_CONFIG);
  (Object.keys(result) as PrayerId[]).forEach((prayer) => {
    const list = value[prayer];
    if (!Array.isArray(list)) return;
    const normalisedParts: PrayerPartConfig[] = list.filter(isObject).map((part, index) => {
      const category = ["sunnah", "fard", "wajib", "nafl"].includes(String(part.category)) ? part.category as PrayerPartCategory : "nafl";
      const rakats = Math.max(category === "fard" ? 1 : 0, Math.min(20, Number.isFinite(Number(part.rakats)) ? Number(part.rakats) : 0));
      return {
        id: typeof part.id === "string" ? part.id.slice(0, 60) : `${prayer}-part-${index}`,
        label: typeof part.label === "string" ? part.label.slice(0, 80) : "সালাতের অংশ",
        category,
        omissionReason: typeof part.omissionReason === "string" ? part.omissionReason.slice(0, 1200) : "",
        rakats,
        enabled: category === "fard" ? true : part.enabled !== false,
        required: category === "fard" ? true : category === "sunnah" ? false : part.required === true
      };
    });
    if (!normalisedParts.some((part) => part.category === "fard")) {
      const fallbackFard = EMPTY_PRAYER_CONFIG[prayer].find((part) => part.category === "fard");
      if (fallbackFard) normalisedParts.push(structuredClone(fallbackFard));
    }
    result[prayer] = normalisedParts;
  });
  return result;
}
function normaliseData(value: unknown): WorkspaceData {
  if (!isObject(value) || ![1, 2, 3].includes(Number(value.schemaVersion))) throw new Error("এই Backup ফাইলের সংস্করণ সমর্থিত নয়।");
  const preferences = isObject(value.preferences) ? value.preferences : {};
  const prayerPreferences = isObject(value.prayerPreferences) ? value.prayerPreferences : {};
  const coords = (n: unknown, fallback: number, min: number, max: number) => Number.isFinite(Number(n)) && Number(n) >= min && Number(n) <= max ? Number(n) : fallback;
  const prayerFallback = EMPTY_DATA.prayerPreferences;
  const mosque = isObject(prayerPreferences.mosqueTimes) ? prayerPreferences.mosqueTimes : {};
  const prayerConfig = normalisePrayerConfig(value.prayerConfig);
  const rawPrayerTimes = arrayOrEmpty<unknown>(value.prayerTimesCache);
  const prayerTimesCache: PrayerTimesCache[] = rawPrayerTimes.filter(isObject).map((raw) => {
    const oldLocation = isObject(raw.location) ? raw.location : {};
    return {
      date: typeof raw.date === "string" ? raw.date : "",
      fajr: typeof raw.fajr === "string" ? raw.fajr : "",
      sunrise: typeof raw.sunrise === "string" ? raw.sunrise : "",
      dhuhr: typeof raw.dhuhr === "string" ? raw.dhuhr : "",
      asr: typeof raw.asr === "string" ? raw.asr : "",
      maghrib: typeof raw.maghrib === "string" ? raw.maghrib : "",
      isha: typeof raw.isha === "string" ? raw.isha : "",
      sunset: typeof raw.sunset === "string" ? raw.sunset : (typeof raw.maghrib === "string" ? raw.maghrib : ""),
      solarNoon: typeof raw.solarNoon === "string" ? raw.solarNoon : "",
      forbiddenTimes: isObject(raw.forbiddenTimes) ? {
        sunrise: typeof raw.forbiddenTimes.sunrise === "string" ? raw.forbiddenTimes.sunrise : (typeof raw.sunrise === "string" ? raw.sunrise : ""),
        zawal: typeof raw.forbiddenTimes.zawal === "string" ? raw.forbiddenTimes.zawal : (typeof raw.solarNoon === "string" ? raw.solarNoon : ""),
        sunset: typeof raw.forbiddenTimes.sunset === "string" ? raw.forbiddenTimes.sunset : (typeof raw.sunset === "string" ? raw.sunset : (typeof raw.maghrib === "string" ? raw.maghrib : ""))
      } : undefined,
      source: typeof raw.source === "string" ? raw.source : "সময়সূচি সেবা",
      fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : new Date(0).toISOString(),
      latitude: Number.isFinite(Number(raw.latitude ?? oldLocation.latitude)) ? Number(raw.latitude ?? oldLocation.latitude) : prayerFallback.latitude,
      longitude: Number.isFinite(Number(raw.longitude ?? oldLocation.longitude)) ? Number(raw.longitude ?? oldLocation.longitude) : prayerFallback.longitude
    };
  }).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  const rawQadaEntries = arrayOrEmpty<unknown>(value.qadaEntries);
  const qadaEntries: QadaRecord[] = rawQadaEntries.filter(isObject).map((raw, index) => {
    const rawPrayer = typeof raw.prayer === "string" ? raw.prayer : "";
    const prayer = (Object.prototype.hasOwnProperty.call(PRAYER_NAMES, rawPrayer) ? rawPrayer : "fajr") as PrayerId;
    const configuredFard = prayerConfig[prayer].find((part) => part.category === "fard");
    const requestedRakats = Number(raw.rakats);
    return {
      id: typeof raw.id === "string" ? raw.id : `qada-${index}`,
      prayer,
      missedDate: typeof raw.missedDate === "string" ? raw.missedDate : "",
      sourceEntryId: typeof raw.sourceEntryId === "string" ? raw.sourceEntryId : null,
      rakats: Number.isInteger(requestedRakats) && requestedRakats > 0 && requestedRakats <= 20 ? requestedRakats : configuredFard?.rakats || 0,
      reason: typeof raw.reason === "string" ? raw.reason.slice(0, 1200) : "",
      status: raw.status === "settled" ? "settled" : "pending",
      settledAt: typeof raw.settledAt === "string" ? raw.settledAt : null,
      settlementNote: typeof raw.settlementNote === "string" ? raw.settlementNote.slice(0, 1200) : "",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString()
    };
  });
  return {
    schemaVersion: 3,
    goals: arrayOrEmpty<WorkspaceGoal>(value.goals), records: arrayOrEmpty<WorkspaceRecord>(value.records), prayerDays: arrayOrEmpty<PrayerDay>(value.prayerDays), notes: arrayOrEmpty<WorkspaceNote>(value.notes),
    preferences: {
      displayName: typeof preferences.displayName === "string" ? preferences.displayName.slice(0, 80) : "",
      timeZone: safeTimeZone(preferences.timeZone), maghribTime: validClock(preferences.maghribTime), maghribRollover: preferences.maghribRollover !== false,
      remindersEnabled: preferences.remindersEnabled === true, prayerReminderMinutes: Math.max(1, Math.min(120, Number(preferences.prayerReminderMinutes) || 10)), sleepReminder: validClock(preferences.sleepReminder, "22:30")
    },
    prayerConfig,
    prayerEntries: arrayOrEmpty<PrayerEntry>(value.prayerEntries), qadaEntries,
    quranEntries: arrayOrEmpty<QuranEntry>(value.quranEntries), extraPrayerEntries: arrayOrEmpty<ExtraPrayerEntry>(value.extraPrayerEntries), dhikrTemplates: Array.isArray(value.dhikrTemplates) ? arrayOrEmpty<DhikrTemplate>(value.dhikrTemplates) : structuredClone(EMPTY_DATA.dhikrTemplates),
    dhikrSessions: arrayOrEmpty<DhikrSession>(value.dhikrSessions), fastingEntries: arrayOrEmpty<FastingEntry>(value.fastingEntries), deedEntries: arrayOrEmpty<DeedEntry>(value.deedEntries),
    avoidEntries: arrayOrEmpty<AvoidEntry>(value.avoidEntries), duaItems: arrayOrEmpty<DuaItem>(value.duaItems), studyEntries: arrayOrEmpty<StudyEntry>(value.studyEntries),
    habitDefinitions: arrayOrEmpty<HabitDefinition>(value.habitDefinitions), habitLogs: arrayOrEmpty<HabitLog>(value.habitLogs), reflections: arrayOrEmpty<ReflectionEntry>(value.reflections),
    journeys: arrayOrEmpty<Journey>(value.journeys),
    journeyMilestones: arrayOrEmpty<unknown>(value.journeyMilestones).filter(isObject).map((item) => ({
      id: typeof item.id === "string" ? item.id : createWorkspaceRecordId(),
      journeyId: typeof item.journeyId === "string" ? item.journeyId : "",
      stageNumber: Math.max(1, Math.floor(Number(item.stageNumber) || 1)),
      title: typeof item.title === "string" ? item.title.slice(0, 120) : "অর্জনের মাইলফলক",
      requiredDays: Math.max(1, Math.floor(Number(item.requiredDays) || 1)),
      completedAt: typeof item.completedAt === "string" ? item.completedAt : "",
      rewardTitle: typeof item.rewardTitle === "string" ? item.rewardTitle.slice(0, 120) : "",
      rewardAmount: item.rewardAmount == null || item.rewardAmount === "" ? null : Number.isFinite(Number(item.rewardAmount)) && Number(item.rewardAmount) >= 0 ? Math.min(100000000, Number(item.rewardAmount)) : null,
      rewardNote: typeof item.rewardNote === "string" ? item.rewardNote.slice(0, 1200) : "",
      badgeAwarded: item.badgeAwarded !== false,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString()
    })),
    journeyObservations: arrayOrEmpty<JourneyObservation>(value.journeyObservations),
    deadlinePlans: arrayOrEmpty<DeadlinePlan>(value.deadlinePlans).filter(isObject).map((plan) => ({ ...plan, startDate: typeof plan.startDate === "string" ? plan.startDate : (typeof plan.createdAt === "string" ? plan.createdAt.slice(0, 10) : ""), tasks: arrayOrEmpty<DeadlineTask>(plan.tasks) })),
    prayerPreferences: {
      calculationMethod: 1, asrSchool: 1,
      locationLabel: typeof prayerPreferences.locationLabel === "string" ? prayerPreferences.locationLabel.slice(0, 100) : prayerFallback.locationLabel,
      latitude: coords(prayerPreferences.latitude, prayerFallback.latitude, -90, 90), longitude: coords(prayerPreferences.longitude, prayerFallback.longitude, -180, 180),
      mosqueTimes: { fajr: validClock(mosque.fajr), dhuhr: validClock(mosque.dhuhr), asr: validClock(mosque.asr), maghrib: validClock(mosque.maghrib), isha: validClock(mosque.isha) },
      mosqueReminderMinutes: Math.max(1, Math.min(120, Number(prayerPreferences.mosqueReminderMinutes) || 10)),
      waqtEndPrompt: prayerPreferences.waqtEndPrompt !== false, nightQadaReminder: validClock(prayerPreferences.nightQadaReminder, "21:30"),
      notificationPermissionAsked: prayerPreferences.notificationPermissionAsked === true,
      lastTimesFetchedAt: typeof prayerPreferences.lastTimesFetchedAt === "string" ? prayerPreferences.lastTimesFetchedAt : ""
    },
    prayerTimesCache, reminderEvents: arrayOrEmpty<ReminderEvent>(value.reminderEvents),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}
export function subscribeWorkspaceData(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getWorkspaceData() { return workspaceState; }
export function getWorkspaceServerData() { return EMPTY_DATA; }
export function getCloudSyncState() { return cloudSyncState; }
export function getCloudSyncMessage() { return cloudSyncMessage; }
export function getLastSuccessfulSyncAt() { return lastSuccessfulSyncAt; }
export function getWorkspaceLoadError() { return workspaceLoadError; }
// Cleanup-only compatibility step. Current durable data is stored in the
// authenticated Supabase relational workspace; browser persistence is never read or written.
function purgeLegacyBrowserStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("amar-nfser-hisab:frontend-workspace:v1");
    window.localStorage.removeItem("amar-nfser-hisab:theme");
  } catch { /* Storage can be disabled; the app itself does not persist there. */ }
  if (typeof indexedDB !== "undefined") {
    try {
      const request = indexedDB.deleteDatabase("amar-nfser-hisab-local");
      request.onerror = () => undefined;
      request.onblocked = () => undefined;
    } catch { /* Best-effort removal of the previous release's database only. */ }
  }
}

type WorkspaceDeltaRow = { id: string; record: Record<string, unknown> };
type WorkspaceCollectionKey =
  | "goals" | "records" | "prayerDays" | "notes" | "prayerEntries" | "qadaEntries"
  | "quranEntries" | "extraPrayerEntries" | "dhikrTemplates" | "dhikrSessions" | "fastingEntries"
  | "deedEntries" | "avoidEntries" | "duaItems" | "studyEntries" | "habitDefinitions" | "habitLogs"
  | "reflections" | "journeys" | "journeyMilestones" | "journeyObservations" | "deadlinePlans"
  | "deadlineTasks" | "prayerTimesCache" | "reminderEvents";

const WORKSPACE_COLLECTION_KEYS: WorkspaceCollectionKey[] = [
  "goals", "records", "prayerDays", "notes", "prayerEntries", "qadaEntries", "quranEntries",
  "extraPrayerEntries", "dhikrTemplates", "dhikrSessions", "fastingEntries", "deedEntries",
  "avoidEntries", "duaItems", "studyEntries", "habitDefinitions", "habitLogs", "reflections",
  "journeys", "journeyMilestones", "journeyObservations", "deadlinePlans", "deadlineTasks",
  "prayerTimesCache", "reminderEvents"
];

function rowKey(collection: WorkspaceCollectionKey, value: Record<string, unknown>): string {
  if (typeof value.id === "string" && value.id) return value.id;
  if (collection === "prayerTimesCache") {
    return `${String(value.date ?? "")}:${String(value.latitude ?? "")}:${String(value.longitude ?? "")}`;
  }
  if (typeof value.date === "string" && value.date) return value.date;
  return "";
}

function recordsForCollection(data: WorkspaceData, collection: WorkspaceCollectionKey): WorkspaceDeltaRow[] {
  if (collection === "deadlineTasks") {
    return data.deadlinePlans.flatMap((plan) => plan.tasks.map((task) => ({
      id: task.id,
      record: { ...task, planId: plan.id } as unknown as Record<string, unknown>
    })));
  }
  const source = data[collection as keyof WorkspaceData];
  if (!Array.isArray(source)) return [];
  return source.map((item) => {
    const value = item as unknown as Record<string, unknown>;
    const id = rowKey(collection, value);
    const record = collection === "deadlinePlans"
      ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== "tasks"))
      : value;
    return id ? { id, record } : null;
  }).filter((row): row is WorkspaceDeltaRow => row !== null);
}

function buildWorkspaceChanges(previous: WorkspaceData, next: WorkspaceData) {
  const collections: Record<string, { upserts: WorkspaceDeltaRow[]; deletes: string[] }> = {};
  for (const key of WORKSPACE_COLLECTION_KEYS) {
    const before = new Map(recordsForCollection(previous, key).map((row) => [row.id, JSON.stringify(row.record)]));
    const afterRows = recordsForCollection(next, key);
    const after = new Set(afterRows.map((row) => row.id));
    const upserts = afterRows.filter((row) => before.get(row.id) !== JSON.stringify(row.record));
    const deletes = [...before.keys()].filter((id) => !after.has(id));
    if (upserts.length || deletes.length) collections[key] = { upserts, deletes };
  }
  const previousSettings = { preferences: previous.preferences, prayerConfig: previous.prayerConfig, prayerPreferences: previous.prayerPreferences };
  const nextSettings = { preferences: next.preferences, prayerConfig: next.prayerConfig, prayerPreferences: next.prayerPreferences };
  const changes: { collections?: typeof collections; settings?: typeof nextSettings } = {};
  if (Object.keys(collections).length) changes.collections = collections;
  if (JSON.stringify(previousSettings) !== JSON.stringify(nextSettings)) changes.settings = nextSettings;
  return changes;
}

function scheduleWorkspaceSync(data: WorkspaceData) {
  pendingWorkspaceState = data;
  if (!hydrated) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const message = "ইন্টারনেট সংযোগ নেই। পরিবর্তন অনলাইনে সংরক্ষিত হয়নি; সংযোগ ফিরলে আবার চেষ্টা করো।";
    setCloudSyncState("offline", message);
    showAppToast("error", message);
    return;
  }
  cloudSyncTimer = setTimeout(() => { cloudSyncTimer = null; void pushWorkspaceChanges(pendingWorkspaceState ?? workspaceState); }, 220);
}

async function pushWorkspaceChanges(data: WorkspaceData): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) {
    hasUnsavedChanges = true;
    const message = "ইন্টারনেট সংযোগ নেই। পরিবর্তন অনলাইনে সংরক্ষিত হয়নি। সংযোগ ফিরলে আবার চেষ্টা করো।";
    setCloudSyncState("offline", message);
    showAppToast("error", message);
    return;
  }
  if (cloudSavePromise) {
    if (workspaceState.updatedAt !== data.updatedAt) cloudSyncAgain = true;
    await cloudSavePromise;
    if (hasUnsavedChanges) {
      cloudSyncAgain = false;
      await pushWorkspaceChanges(workspaceState);
    } else {
      cloudSyncAgain = false;
    }
    return;
  }

  const target = data;
  const changes = buildWorkspaceChanges(confirmedWorkspaceState, target);
  if (!changes.collections && !changes.settings) {
    confirmedWorkspaceState = target;
    hasUnsavedChanges = workspaceState.updatedAt !== target.updatedAt;
    if (!hasUnsavedChanges) {
      pendingWorkspaceState = null;
      setCloudSyncState("synced", "সব পরিবর্তন সংরক্ষিত আছে।");
      purgeLegacyBrowserStorage();
    }
    return;
  }

  cloudSavePromise = (async () => {
    setCloudSyncState("syncing", "পরিবর্তন অনলাইনে সংরক্ষণ হচ্ছে…");
    try {
      const response = await fetch("/api/workspace", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes, expectedUpdatedAt: remoteUpdatedAt }),
        cache: "no-store", credentials: "same-origin"
      });
      const result = await response.json().catch(() => ({})) as { message?: string; updatedAt?: string };
      if (response.status === 409) throw new Error(result.message || "অন্য ট্যাব বা ডিভাইসে তথ্য পরিবর্তিত হয়েছে। Refresh করে সর্বশেষ তথ্য নাও।");
      if (!response.ok) throw new Error(result.message || (response.status === 401 ? "সেশন যাচাই করা যায়নি। আবার লগইন করো।" : "অনলাইন সংরক্ষণ ব্যর্থ হয়েছে।"));
      remoteUpdatedAt = typeof result.updatedAt === "string" ? result.updatedAt : remoteUpdatedAt;
      lastSuccessfulSyncAt = remoteUpdatedAt;
      confirmedWorkspaceState = target;
      hasUnsavedChanges = workspaceState.updatedAt !== target.updatedAt;
      if (!hasUnsavedChanges) {
        pendingWorkspaceState = null;
        setCloudSyncState("synced", "সর্বশেষ পরিবর্তন অনলাইনে সংরক্ষিত হয়েছে।");
        showAppToast("success", "পরিবর্তন সফলভাবে অনলাইনে সংরক্ষিত হয়েছে।");
        purgeLegacyBrowserStorage();
      } else {
        setCloudSyncState("syncing", "নতুন পরিবর্তনগুলোও অনলাইনে সংরক্ষণ হচ্ছে…");
      }
    } catch (error) {
      hasUnsavedChanges = true;
      const message = getBanglaSyncError(error);
      setCloudSyncState(navigator.onLine ? "error" : "offline", message);
      showAppToast("error", message);
    }
  })();
  await cloudSavePromise;
  cloudSavePromise = null;
  if (cloudSyncAgain || (hasUnsavedChanges && pendingWorkspaceState && pendingWorkspaceState.updatedAt !== target.updatedAt)) {
    cloudSyncAgain = false;
    await pushWorkspaceChanges(workspaceState);
  }
}
async function synchronizeWorkspace() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) {
    const message = "ইন্টারনেট সংযোগ নেই। অনলাইন তথ্য লোড করা যাচ্ছে না।";
    setCloudSyncState("offline", message);
    showAppToast("error", message);
    return;
  }
  if (hasUnsavedChanges) { await pushWorkspaceChanges(workspaceState); return; }
  setCloudSyncState("syncing", "সর্বশেষ তথ্য যাচাই হচ্ছে…");
  try {
    const response = await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(response.status === 401 ? "সেশন যাচাই করা যায়নি। আবার লগইন করো।" : "অনলাইন তথ্য লোড করা যায়নি।");
    const result = await response.json() as { payload?: unknown | null; updatedAt?: string | null };
    if (result.payload) {
      const remote = normaliseData(result.payload);
      workspaceState = remote;
      confirmedWorkspaceState = remote;
      remoteUpdatedAt = typeof result.updatedAt === "string" ? result.updatedAt : null;
      lastSuccessfulSyncAt = remoteUpdatedAt;
      hasUnsavedChanges = false;
      emitChange();
      setCloudSyncState("synced", "সর্বশেষ তথ্য লোড হয়েছে।");
    } else {
      remoteUpdatedAt = null;
      lastSuccessfulSyncAt = null;
      confirmedWorkspaceState = normaliseData(EMPTY_DATA);
      hasUnsavedChanges = true;
      await pushWorkspaceChanges(workspaceState);
    }
  } catch (error) {
    const message = getBanglaSyncError(error);
    setCloudSyncState(navigator.onLine ? "error" : "offline", message);
    showAppToast("error", message);
  }
}
export async function syncCloudNow() {
  if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
  if (hasUnsavedChanges) await pushWorkspaceChanges(workspaceState);
  else await synchronizeWorkspace();
}
function attachSaveLifecycle() {
  if (lifecycleListenerAttached || typeof window === "undefined") return;
  lifecycleListenerAttached = true;
  const flushWhenHidden = () => {
    if (document.visibilityState !== "hidden" || !hasUnsavedChanges) return;
    if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
    void pushWorkspaceChanges(workspaceState);
  };
  const flushWhenLeaving = () => {
    if (!hasUnsavedChanges) return;
    if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
    // Best effort only: browsers may stop requests during tab/process shutdown.
    void pushWorkspaceChanges(workspaceState);
  };
  document.addEventListener("visibilitychange", flushWhenHidden);
  window.addEventListener("pagehide", flushWhenLeaving);
  window.addEventListener("focus", () => {
    if (hasUnsavedChanges && navigator.onLine && !cloudSavePromise) scheduleWorkspaceSync(workspaceState);
  });
}
function attachOnlineListener() {
  if (typeof window === "undefined") return;
  attachSaveLifecycle();
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    if (hasUnsavedChanges) scheduleWorkspaceSync(workspaceState);
    else void synchronizeWorkspace();
  });
  window.addEventListener("offline", () => setCloudSyncState("offline", "ইন্টারনেট সংযোগ নেই। নতুন পরিবর্তন অনলাইনে সংরক্ষিত হবে না।"));
}
export async function flushWorkspaceChanges() {
  if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
  if (hasUnsavedChanges) await pushWorkspaceChanges(workspaceState);
}
export async function hydrateWorkspaceData() {
  if (hydrated || typeof window === "undefined") return hydrateTask ?? Promise.resolve();
  if (hydrateTask) return hydrateTask;
  hydrateTask = (async () => {
    workspaceLoadError = "";
    setCloudSyncState("loading", "অনলাইন ব্যক্তিগত তথ্য লোড হচ্ছে…");
    try {
      if (!navigator.onLine) throw new Error("ইন্টারনেট সংযোগ ছাড়া অনলাইন তথ্য খোলা যাবে না। সংযোগ চালু করে আবার চেষ্টা করো।");
      const response = await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(response.status === 401 ? "সেশন শেষ হয়েছে। আবার লগইন করো।" : "তথ্য লোড করা যায়নি। সংযোগ ও সংরক্ষণ সেটআপ পরীক্ষা করে আবার চেষ্টা করো।");
      const result = await response.json() as { payload?: unknown | null; updatedAt?: string | null };
      // The authenticated relational workspace is the only durable source of truth.
      // Old browser data is deliberately not imported; legacy stores are removed instead.
      purgeLegacyBrowserStorage();
      if (result.payload) {
        const remote = normaliseData(result.payload);
        workspaceState = remote;
        confirmedWorkspaceState = remote;
        remoteUpdatedAt = typeof result.updatedAt === "string" ? result.updatedAt : null;
        lastSuccessfulSyncAt = remoteUpdatedAt;
        hasUnsavedChanges = false;
        hydrated = true;
        setCloudSyncState("synced", "সর্বশেষ তথ্য অনলাইন অ্যাকাউন্ট থেকে লোড হয়েছে।");
      } else {
        workspaceState = { ...structuredClone(EMPTY_DATA), updatedAt: new Date().toISOString() };
        confirmedWorkspaceState = normaliseData(EMPTY_DATA);
        remoteUpdatedAt = null;
        hasUnsavedChanges = false;
        hydrated = true;
        setCloudSyncState("synced", "অনলাইন ব্যক্তিগত ওয়ার্কস্পেস প্রস্তুত।");
      }
      attachOnlineListener();
      emitChange();
    } catch (error) {
      workspaceLoadError = error instanceof Error ? error.message : "অনলাইন তথ্য লোড করা যায়নি।";
      hydrated = false;
      setCloudSyncState("error", workspaceLoadError);
    } finally {
      hydrateTask = null;
      emitChange();
    }
  })();
  return hydrateTask;
}
export async function retryCloudLoad() {
  hydrated = false;
  workspaceLoadError = "";
  hydrateTask = null;
  await hydrateWorkspaceData();
}
export function updateWorkspaceData(updater: (current: WorkspaceData) => WorkspaceData) {
  const next = normaliseData(updater(workspaceState));
  next.updatedAt = new Date().toISOString();
  workspaceState = next;
  hasUnsavedChanges = true;
  if (typeof window !== "undefined") scheduleWorkspaceSync(next);
  emitChange();
}
export function replaceWorkspaceData(value: unknown) {
  const next = normaliseData(value);
  next.updatedAt = new Date().toISOString();
  workspaceState = next;
  hydrated = true;
  hasUnsavedChanges = true;
  if (typeof window !== "undefined") scheduleWorkspaceSync(next);
  emitChange();
}
export function resetWorkspaceData() {
  replaceWorkspaceData({ ...structuredClone(EMPTY_DATA), updatedAt: new Date().toISOString() });
}
export function createWorkspaceRecordId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
export function getJournalDate(now = new Date(), timeZone = "Asia/Dhaka", maghribTime: string | null = null) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const civilDate = `${values.year}-${values.month}-${values.day}`;
  const cachedMaghrib = workspaceState.prayerTimesCache.find((item) => item.date === civilDate
    && item.latitude === workspaceState.prayerPreferences.latitude && item.longitude === workspaceState.prayerPreferences.longitude)?.maghrib;
  const effectiveMaghrib = maghribTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(maghribTime)
    ? maghribTime : cachedMaghrib || "";
  if (effectiveMaghrib && /^([01]\d|2[0-3]):[0-5]\d$/.test(effectiveMaghrib)) {
    const currentMinutes = Number(values.hour) * 60 + Number(values.minute);
    const [maghribHour, maghribMinute] = effectiveMaghrib.split(":").map(Number);
    const maghribMinutes = maghribHour * 60 + maghribMinute;
    if (currentMinutes >= maghribMinutes) {
      const [year, month, day] = civilDate.split("-").map(Number);
      const next = new Date(Date.UTC(year, month - 1, day + 1, 12));
      return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
    }
  }
  return civilDate;
}
