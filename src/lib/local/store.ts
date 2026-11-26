export type AppSection = "home" | "goals" | "journal" | "mirror" | "notifications" | "settings";
export type PrayerId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PrayerMethod = "jamaat" | "home" | "qada" | "not-performed";
export type PrayerPartCategory = "sunnah" | "fard" | "wajib" | "nafl";
export type TrackerKind = "prayer" | "quran" | "dhikr" | "fasting" | "good" | "avoid" | "ilm" | "habit" | "reflection";
export type RecordKind = TrackerKind | "bad";

export type LocalGoal = {
  id: string; title: string; details: string; deadline: string;
  progress: number; complete: boolean; createdAt: string;
};
export type LocalRecord = {
  id: string; kind: RecordKind; title: string; details: string; amount: number; unit: string;
  prayerName?: PrayerId; prayerMethod?: "jamaat" | "alone" | "qada" | "missed";
  takbirUla?: boolean; missedRakah?: number; sunnahBefore?: boolean; sunnahAfter?: boolean;
  date: string; createdAt: string;
};
export type PrayerDay = { date: string; completed: Record<PrayerId, boolean>; updatedAt: string };
export type LocalNote = { date: string; mood: string; body: string; reflection: string; gratitude: string; updatedAt: string };

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
export type PrayerTimesCache = { date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; forbiddenTimes?: { sunriseStart: string; sunriseEnd: string; zawalStart: string; zawalEnd: string; sunsetStart: string; sunsetEnd: string }; source: string; fetchedAt: string; latitude: number; longitude: number };
export type ReminderEvent = { id: string; key: string; kind: "waqt-ended" | "jamaat-soon" | "night-qada"; date: string; prayer: PrayerId | null; title: string; message: string; createdAt: string; resolved: boolean; readAt?: string | null; response: "prayed" | "not-prayed" | null };

export type LocalPreferences = {
  displayName: string; timeZone: string; maghribTime: string; maghribRollover: boolean;
  remindersEnabled: boolean; prayerReminderMinutes: number; sleepReminder: string;
};
export type PrayerPreferences = {
  calculationMethod: 1; asrSchool: 1; locationLabel: string; latitude: number; longitude: number;
  mosqueTimes: MosqueTimes; mosqueReminderMinutes: number; waqtEndPrompt: boolean; nightQadaReminder: string;
  notificationPermissionAsked: boolean; lastTimesFetchedAt: string;
};
export type LocalAppData = {
  schemaVersion: 3;
  goals: LocalGoal[]; records: LocalRecord[]; prayerDays: PrayerDay[]; notes: LocalNote[];
  preferences: LocalPreferences; prayerConfig: PrayerConfig; prayerEntries: PrayerEntry[]; qadaEntries: QadaRecord[];
  quranEntries: QuranEntry[]; extraPrayerEntries: ExtraPrayerEntry[]; dhikrTemplates: DhikrTemplate[]; dhikrSessions: DhikrSession[];
  fastingEntries: FastingEntry[]; deedEntries: DeedEntry[]; avoidEntries: AvoidEntry[]; duaItems: DuaItem[];
  studyEntries: StudyEntry[]; habitDefinitions: HabitDefinition[]; habitLogs: HabitLog[];
  reflections: ReflectionEntry[]; journeys: Journey[]; journeyMilestones: JourneyMilestone[]; journeyObservations: JourneyObservation[]; deadlinePlans: DeadlinePlan[]; prayerPreferences: PrayerPreferences;
  prayerTimesCache: PrayerTimesCache[]; reminderEvents: ReminderEvent[]; updatedAt: string;
};

export const PRAYER_NAMES: Record<PrayerId, string> = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
const STORAGE_KEY = "amar-nfser-hisab:frontend-workspace:v1";
const DB_NAME = "amar-nfser-hisab-local";
const DB_VERSION = 1;
const DB_STORE = "workspace";
const EMPTY_PRAYER_CONFIG: PrayerConfig = {
  fajr: [{ id: "fajr-sunnah", label: "আগের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }, { id: "fajr-fard", label: "ফরজ", category: "fard", rakats: 2, enabled: true, required: true }],
  dhuhr: [{ id: "dhuhr-sunnah-before", label: "আগের সুন্নত", category: "sunnah", rakats: 4, enabled: true, required: false }, { id: "dhuhr-fard", label: "ফরজ", category: "fard", rakats: 4, enabled: true, required: true }, { id: "dhuhr-sunnah-after", label: "পরের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }],
  asr: [{ id: "asr-sunnah-before", label: "আগের সুন্নত", category: "sunnah", rakats: 4, enabled: false, required: false }, { id: "asr-fard", label: "ফরজ", category: "fard", rakats: 4, enabled: true, required: true }],
  maghrib: [{ id: "maghrib-fard", label: "ফরজ", category: "fard", rakats: 3, enabled: true, required: true }, { id: "maghrib-sunnah-after", label: "পরের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }],
  isha: [{ id: "isha-sunnah-before", label: "আগের সুন্নত", category: "sunnah", rakats: 4, enabled: false, required: false }, { id: "isha-fard", label: "ফরজ", category: "fard", rakats: 4, enabled: true, required: true }, { id: "isha-sunnah-after", label: "পরের সুন্নত", category: "sunnah", rakats: 2, enabled: true, required: false }, { id: "isha-witr", label: "বিতর ওয়াজিব", category: "wajib", rakats: 3, enabled: true, required: true }]
};
const EMPTY_DATA: LocalAppData = {
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
let snapshot: LocalAppData = EMPTY_DATA;
let hydrated = false;
let hydrateTask: Promise<void> | null = null;
const listeners = new Set<() => void>();
export type CloudSyncState = "idle" | "loading" | "syncing" | "synced" | "offline" | "error";
let cloudSyncState: CloudSyncState = "loading";
let cloudSyncMessage = "অনলাইন তথ্য লোড হচ্ছে…";
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
let cloudSavePromise: Promise<void> | null = null;
let cloudSyncAgain = false;
let pendingSnapshot: LocalAppData | null = null;
let onlineListenerAttached = false;
let lifecycleListenerAttached = false;
let remoteUpdatedAt: string | null = null;
let syncedSnapshot: LocalAppData = EMPTY_DATA;
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
function normaliseData(value: unknown): LocalAppData {
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
    goals: arrayOrEmpty<LocalGoal>(value.goals), records: arrayOrEmpty<LocalRecord>(value.records), prayerDays: arrayOrEmpty<PrayerDay>(value.prayerDays), notes: arrayOrEmpty<LocalNote>(value.notes),
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
      id: typeof item.id === "string" ? item.id : createLocalId(),
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
export function subscribeLocalData(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function getLocalDataSnapshot() { return snapshot; }
export function getLocalDataServerSnapshot() { return EMPTY_DATA; }
export function getCloudSyncState() { return cloudSyncState; }
export function getCloudSyncMessage() { return cloudSyncMessage; }
export function getWorkspaceLoadError() { return workspaceLoadError; }
// One-time compatibility reader: previous builds used IndexedDB/localStorage.
// Existing data is read only when no cloud snapshot exists, uploaded once, and
// deleted from the browser only after Supabase confirms the write.

async function openLegacyDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;
  const factory = indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> };
  if (factory.databases) {
    try {
      const known = await factory.databases();
      if (!known.some((item) => item.name === DB_NAME)) return null;
    } catch {
      // If database enumeration is unavailable, still attempt a read-only open
      // so a previous IndexedDB-only account is not mistaken for an empty one.
    }
  }
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}
async function readLegacyBrowserData(): Promise<LocalAppData | null> {
  let indexed: unknown = null;
  const db = await openLegacyDatabase();
  if (db) {
    indexed = await new Promise<unknown>((resolve) => {
      const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get("primary");
      request.onsuccess = () => resolve(request.result?.data ?? null);
      request.onerror = () => resolve(null);
    });
    db.close();
  }
  let legacy: unknown = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    legacy = raw ? JSON.parse(raw) as unknown : null;
  } catch { /* Missing/blocked legacy storage does not prevent cloud-only use. */ }
  const value = indexed ?? legacy;
  return value ? normaliseData(value) : null;
}
function clearLegacyBrowserData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* The application no longer writes browser storage. */ }
  if (typeof indexedDB !== "undefined") {
    try {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onerror = () => undefined;
      request.onblocked = () => undefined;
    } catch { /* Best-effort cleanup after the cloud copy is confirmed. */ }
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

function recordsForCollection(data: LocalAppData, collection: WorkspaceCollectionKey): WorkspaceDeltaRow[] {
  if (collection === "deadlineTasks") {
    return data.deadlinePlans.flatMap((plan) => plan.tasks.map((task) => ({
      id: task.id,
      record: { ...task, planId: plan.id } as unknown as Record<string, unknown>
    })));
  }
  const source = data[collection as keyof LocalAppData];
  if (!Array.isArray(source)) return [];
  return source.map((item) => {
    const value = item as unknown as Record<string, unknown>;
    const id = rowKey(collection, value);
    const record = collection === "deadlinePlans"
      ? (({ tasks: _tasks, ...plan }) => plan)(value)
      : value;
    return id ? { id, record } : null;
  }).filter((row): row is WorkspaceDeltaRow => row !== null);
}

function buildWorkspaceChanges(previous: LocalAppData, next: LocalAppData) {
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

function scheduleCloudSync(data: LocalAppData) {
  pendingSnapshot = data;
  if (!hydrated) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setCloudSyncState("offline", "ইন্টারনেট সংযোগ নেই। পরিবর্তন অনলাইনে সংরক্ষিত হয়নি; সংযোগ ফিরলে আবার চেষ্টা হবে।");
    return;
  }
  cloudSyncTimer = setTimeout(() => { cloudSyncTimer = null; void pushCloudSnapshot(pendingSnapshot ?? snapshot); }, 220);
}

async function pushCloudSnapshot(data: LocalAppData): Promise<void> {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) {
    hasUnsavedChanges = true;
    setCloudSyncState("offline", "ইন্টারনেট সংযোগ নেই। পরিবর্তন স্থায়ীভাবে সংরক্ষিত হয়নি; Refresh কোরো না।");
    return;
  }
  if (cloudSavePromise) {
    if (snapshot.updatedAt !== data.updatedAt) cloudSyncAgain = true;
    await cloudSavePromise;
    if (hasUnsavedChanges) {
      cloudSyncAgain = false;
      await pushCloudSnapshot(snapshot);
    } else {
      cloudSyncAgain = false;
    }
    return;
  }

  const target = data;
  const changes = buildWorkspaceChanges(syncedSnapshot, target);
  if (!changes.collections && !changes.settings) {
    syncedSnapshot = target;
    hasUnsavedChanges = snapshot.updatedAt !== target.updatedAt;
    if (!hasUnsavedChanges) {
      pendingSnapshot = null;
      setCloudSyncState("synced", "সব পরিবর্তন সংরক্ষিত আছে।");
      clearLegacyBrowserData();
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
      syncedSnapshot = target;
      hasUnsavedChanges = snapshot.updatedAt !== target.updatedAt;
      if (!hasUnsavedChanges) {
        pendingSnapshot = null;
        setCloudSyncState("synced", "সর্বশেষ পরিবর্তন অনলাইনে সংরক্ষিত হয়েছে।");
        clearLegacyBrowserData();
      } else {
        setCloudSyncState("syncing", "নতুন পরিবর্তনগুলোও অনলাইনে সংরক্ষণ হচ্ছে…");
      }
    } catch (error) {
      hasUnsavedChanges = true;
      setCloudSyncState(navigator.onLine ? "error" : "offline", error instanceof Error ? error.message : "অনলাইন সংরক্ষণ ব্যর্থ হয়েছে। Refresh করলে অসম্প্রেরিত পরিবর্তন হারাতে পারে।");
    }
  })();
  await cloudSavePromise;
  cloudSavePromise = null;
  if (cloudSyncAgain || (hasUnsavedChanges && pendingSnapshot && pendingSnapshot.updatedAt !== target.updatedAt)) {
    cloudSyncAgain = false;
    await pushCloudSnapshot(snapshot);
  }
}
async function synchronizeCloudSnapshot() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) { setCloudSyncState("offline", "ইন্টারনেট সংযোগ নেই। অনলাইন তথ্য লোড করা যাচ্ছে না।"); return; }
  if (hasUnsavedChanges) { await pushCloudSnapshot(snapshot); return; }
  setCloudSyncState("syncing", "সর্বশেষ তথ্য যাচাই হচ্ছে…");
  try {
    const response = await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(response.status === 401 ? "সেশন যাচাই করা যায়নি। আবার লগইন করো।" : "অনলাইন তথ্য লোড করা যায়নি।");
    const result = await response.json() as { payload?: unknown | null; updatedAt?: string | null };
    if (result.payload) {
      const remote = normaliseData(result.payload);
      snapshot = remote;
      syncedSnapshot = remote;
      remoteUpdatedAt = typeof result.updatedAt === "string" ? result.updatedAt : null;
      hasUnsavedChanges = false;
      emitChange();
      setCloudSyncState("synced", "সর্বশেষ তথ্য লোড হয়েছে।");
    } else {
      remoteUpdatedAt = null;
      syncedSnapshot = normaliseData(EMPTY_DATA);
      hasUnsavedChanges = true;
      await pushCloudSnapshot(snapshot);
    }
  } catch (error) {
    setCloudSyncState(navigator.onLine ? "error" : "offline", error instanceof Error ? error.message : "অনলাইন তথ্য লোড করা যায়নি।");
  }
}
export async function syncCloudNow() {
  if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
  if (hasUnsavedChanges) await pushCloudSnapshot(snapshot);
  else await synchronizeCloudSnapshot();
}
function attachSaveLifecycle() {
  if (lifecycleListenerAttached || typeof window === "undefined") return;
  lifecycleListenerAttached = true;
  const flushWhenHidden = () => {
    if (document.visibilityState !== "hidden" || !hasUnsavedChanges) return;
    if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
    void pushCloudSnapshot(snapshot);
  };
  const flushWhenLeaving = () => {
    if (!hasUnsavedChanges) return;
    if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
    // Best effort only: browsers may stop requests during tab/process shutdown.
    void pushCloudSnapshot(snapshot);
  };
  document.addEventListener("visibilitychange", flushWhenHidden);
  window.addEventListener("pagehide", flushWhenLeaving);
  window.addEventListener("focus", () => {
    if (hasUnsavedChanges && navigator.onLine && !cloudSavePromise) scheduleCloudSync(snapshot);
  });
}
function attachOnlineListener() {
  if (typeof window === "undefined") return;
  attachSaveLifecycle();
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    if (hasUnsavedChanges) scheduleCloudSync(snapshot);
    else void synchronizeCloudSnapshot();
  });
  window.addEventListener("offline", () => setCloudSyncState("offline", "ইন্টারনেট সংযোগ নেই। নতুন পরিবর্তন অনলাইনে সংরক্ষিত হবে না।"));
}
export async function flushLocalData() {
  if (cloudSyncTimer) { clearTimeout(cloudSyncTimer); cloudSyncTimer = null; }
  if (hasUnsavedChanges) await pushCloudSnapshot(snapshot);
}
export async function hydrateLocalData() {
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
      if (result.payload) {
        const remote = normaliseData(result.payload);
        remoteUpdatedAt = typeof result.updatedAt === "string" ? result.updatedAt : null;
        syncedSnapshot = remote;
        const legacy = await readLegacyBrowserData();
        const localVersion = legacy ? (Date.parse(legacy.updatedAt) || 0) : 0;
        const remotePayloadVersion = Date.parse(remote.updatedAt) || 0;
        if (legacy && localVersion > remotePayloadVersion) {
          // Preserve a newer unsynced pre-cloud browser snapshot and commit it
          // against the server version read above before deleting old storage.
          snapshot = legacy;
          hydrated = true;
          hasUnsavedChanges = true;
          await pushCloudSnapshot(snapshot);
          if (!hasUnsavedChanges && cloudSyncState === "synced") {
            clearLegacyBrowserData();
            setCloudSyncState("synced", "আগের নতুন রেকর্ডগুলো অনলাইনে স্থানান্তর হয়েছে।");
          }
        } else {
          snapshot = remote;
          hasUnsavedChanges = false;
          hydrated = true;
          clearLegacyBrowserData();
          setCloudSyncState("synced", "তোমার সর্বশেষ তথ্য অনলাইন থেকে লোড হয়েছে।");
        }
      } else {
        const legacy = await readLegacyBrowserData();
        snapshot = legacy ?? { ...structuredClone(EMPTY_DATA), updatedAt: new Date().toISOString() };
        syncedSnapshot = normaliseData(EMPTY_DATA);
        remoteUpdatedAt = null;
        hydrated = true;
        hasUnsavedChanges = true;
        await pushCloudSnapshot(snapshot);
        if (!hasUnsavedChanges && cloudSyncState === "synced") {
          clearLegacyBrowserData();
          setCloudSyncState("synced", legacy ? "আগের রেকর্ডগুলো অনলাইনে স্থানান্তর হয়েছে; পুরোনো ডিভাইস কপি সরানো হয়েছে।" : "অনলাইন ব্যক্তিগত ওয়ার্কস্পেস তৈরি হয়েছে।");
        }
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
  await hydrateLocalData();
}
export function updateLocalData(updater: (current: LocalAppData) => LocalAppData) {
  const next = normaliseData(updater(snapshot));
  next.updatedAt = new Date().toISOString();
  snapshot = next;
  hasUnsavedChanges = true;
  if (typeof window !== "undefined") scheduleCloudSync(next);
  emitChange();
}
export function replaceLocalData(value: unknown) {
  const next = normaliseData(value);
  next.updatedAt = new Date().toISOString();
  snapshot = next;
  hydrated = true;
  hasUnsavedChanges = true;
  if (typeof window !== "undefined") scheduleCloudSync(next);
  emitChange();
}
export function resetLocalData() {
  replaceLocalData({ ...structuredClone(EMPTY_DATA), updatedAt: new Date().toISOString() });
}
export function createLocalId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
export function getLocalJournalDate(now = new Date(), timeZone = "Asia/Dhaka", maghribTime: string | null = null) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const civilDate = `${values.year}-${values.month}-${values.day}`;
  const cachedMaghrib = snapshot.prayerTimesCache.find((item) => item.date === civilDate
    && item.latitude === snapshot.prayerPreferences.latitude && item.longitude === snapshot.prayerPreferences.longitude)?.maghrib;
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
