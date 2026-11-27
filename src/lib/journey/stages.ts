export const FIXED_JOURNEY_ID = "amar-nfser-journey-2026-2030";
export const FIXED_JOURNEY_START_DATE = "2026-11-23";
export const FIXED_JOURNEY_END_DATE = "2030-10-30";
export const FIXED_JOURNEY_STAGE_COUNT = 71;
export const FIXED_JOURNEY_TOTAL_DAYS = 1438;

export const FIXED_JOURNEY_STAGE_NAMES = [
  "নতুন শুরুর অঙ্গীকার",
  "সিদ্ধান্তে অটল থাকার শুরু",
  "প্রথম জয়ের স্বীকৃতি",
  "সময়ের প্রতি সচেতনতা",
  "মনোযোগ ফেরানোর অনুশীলন",
  "শৃঙ্খলার বীজ বোনা",
  "সুস্থ রুটিনের ভিত্তি",
  "প্রলোভন চিনে নেওয়ার দক্ষতা",
  "নিজেকে সামলানোর শক্তি",
  "একাগ্রতার প্রথম ধাপ",
  "ইতিবাচক পরিবেশ গড়া",
  "প্রতিদিনের ছোট জয়",
  "ধৈর্যের ভিত মজবুত করা",
  "অপ্রয়োজনীয়তা থেকে দূরত্ব",
  "কাজের প্রতি মনোযোগ",
  "আত্মবিশ্বাসের বিকাশ",
  "কঠিন সময়ে স্থির থাকা",
  "লক্ষ্যপথে ধারাবাহিকতা",
  "চিন্তার স্বচ্ছতা",
  "সময়কে কাজে লাগানো",
  "অভ্যাসে নতুন ছন্দ",
  "নিজের অগ্রগতি বুঝে নেওয়া",
  "সিদ্ধান্তের দৃঢ়তা",
  "বাধা পেরোনোর কৌশল",
  "অধ্যবসায়ের চর্চা",
  "আত্মসম্মান রক্ষার অঙ্গীকার",
  "কাজে গভীর মনোযোগ",
  "স্থিরতার নতুন অভ্যাস",
  "নিজের শক্তিকে কাজে লাগানো",
  "প্রতিদিন আরও এক ধাপ",
  "ধারাবাহিকতার পরীক্ষা",
  "পরিবর্তন ধরে রাখার প্রস্তুতি",
  "ভিত্তি থেকে দৃঢ়তায়",
  "শৃঙ্খলার উচ্চতর ধাপ",
  "আত্মনিয়ন্ত্রণের পরিণতি",
  "প্রতিকূলতার মুখে দৃঢ়তা",
  "অর্জনের শিখরে অগ্রযাত্রা",
  "দৃঢ়তার সর্বোচ্চ শিখর",
  "অর্জনকে স্থায়ী করার শুরু",
  "নতুন রুটিনে স্থিতি",
  "মনোযোগের ধারাবাহিকতা",
  "ব্যস্ততার মধ্যেও ভারসাম্য",
  "পুরোনো পথে না ফেরার অঙ্গীকার",
  "কাজের মান বাড়ানোর চর্চা",
  "আত্মবিশ্বাসে নতুন উচ্চতা",
  "দীর্ঘমেয়াদি শৃঙ্খলা",
  "সুস্থ অভ্যাসের বিস্তার",
  "সময় ও শক্তির সঠিক ব্যবহার",
  "সচেতন সিদ্ধান্তের অনুশীলন",
  "চাপের মধ্যেও স্থিরতা",
  "লক্ষ্যপূরণের দক্ষতা",
  "ভুল থেকে দ্রুত ফিরে আসা",
  "আত্মপ্রেরণার নবায়ন",
  "স্থায়ী পরিবর্তনের ভিত্তি",
  "দায়িত্ববোধের পরিপক্বতা",
  "মন ও কাজের সমন্বয়",
  "প্রতিদিনের অঙ্গীকার",
  "অর্জন ধরে রাখার শক্তি",
  "অধ্যবসায়ের গভীরতা",
  "পরিকল্পনা বাস্তবায়নের দক্ষতা",
  "স্বনির্ভর শৃঙ্খলা",
  "মানসিক স্থিতির বিকাশ",
  "অগ্রগতির নতুন অধ্যায়",
  "নিজের প্রতি আস্থা",
  "ধারাবাহিক সাফল্যের পথে",
  "সচেতন জীবনের বিস্তার",
  "দীর্ঘ যাত্রায় অবিচলতা",
  "লক্ষ্য ও জীবনের ভারসাম্য",
  "নিজের সেরা রূপের অনুশীলন",
  "পূর্ণতার পথে অগ্রযাত্রা",
  "নতুন জীবনের দৃঢ় অঙ্গীকার",
] as const;

export const JOURNEY_STAGE_NAMES = FIXED_JOURNEY_STAGE_NAMES;

export type FixedJourneyStage = {
  stageNumber: number;
  title: string;
  module: 1 | 2 | 3;
  durationDays: number;
  startOffset: number;
  endOffset: number;
  startDate: string;
  endDate: string;
};

function validDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  if (!validDateKey(dateKey) || !Number.isInteger(days)) return dateKey;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function differenceInDateKeys(fromDate: string, toDate: string): number {
  if (!validDateKey(fromDate) || !validDateKey(toDate)) return 0;
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export const FIXED_JOURNEY_STAGES: FixedJourneyStage[] = (() => {
  let offset = 0;
  return FIXED_JOURNEY_STAGE_NAMES.map((title, index) => {
    const stageNumber = index + 1;
    const durationDays = stageNumber <= 36 ? stageNumber + 2 : 74 - stageNumber;
    const startOffset = offset;
    const endOffset = offset + durationDays - 1;
    const moduleNumber: 1 | 2 | 3 = stageNumber <= 33 ? 1 : stageNumber <= 38 ? 2 : 3;
    offset += durationDays;
    return {
      stageNumber, title, module: moduleNumber, durationDays, startOffset, endOffset,
      startDate: addDaysToDateKey(FIXED_JOURNEY_START_DATE, startOffset),
      endDate: addDaysToDateKey(FIXED_JOURNEY_START_DATE, endOffset)
    };
  });
})();

export type FixedJourneyProgress = {
  status: "upcoming" | "active" | "completed";
  dayNumber: number;
  percent: number;
  remainingDays: number;
  currentStage: FixedJourneyStage | null;
  stageDay: number;
  stagePercent: number;
  stageRemainingDays: number;
};

export function getFixedJourneyProgress(dateKey: string): FixedJourneyProgress {
  if (!validDateKey(dateKey) || dateKey < FIXED_JOURNEY_START_DATE) {
    return { status: "upcoming", dayNumber: 0, percent: 0, remainingDays: FIXED_JOURNEY_TOTAL_DAYS, currentStage: null, stageDay: 0, stagePercent: 0, stageRemainingDays: 0 };
  }
  if (dateKey > FIXED_JOURNEY_END_DATE) {
    return { status: "completed", dayNumber: FIXED_JOURNEY_TOTAL_DAYS, percent: 100, remainingDays: 0, currentStage: null, stageDay: 0, stagePercent: 100, stageRemainingDays: 0 };
  }
  const dayNumber = differenceInDateKeys(FIXED_JOURNEY_START_DATE, dateKey) + 1;
  const currentStage = FIXED_JOURNEY_STAGES.find((stage) => dateKey >= stage.startDate && dateKey <= stage.endDate) ?? null;
  if (!currentStage) return { status: "active", dayNumber, percent: Math.round(dayNumber / FIXED_JOURNEY_TOTAL_DAYS * 100), remainingDays: FIXED_JOURNEY_TOTAL_DAYS - dayNumber, currentStage: null, stageDay: 0, stagePercent: 0, stageRemainingDays: 0 };
  const stageDay = differenceInDateKeys(currentStage.startDate, dateKey) + 1;
  return {
    status: "active",
    dayNumber,
    percent: Math.round(dayNumber / FIXED_JOURNEY_TOTAL_DAYS * 100),
    remainingDays: FIXED_JOURNEY_TOTAL_DAYS - dayNumber,
    currentStage,
    stageDay,
    stagePercent: Math.min(100, Math.round(stageDay / currentStage.durationDays * 100)),
    stageRemainingDays: Math.max(0, currentStage.durationDays - stageDay)
  };
}

export function getJourneyStageTitle(stageNumber: number): string {
  const safeStage = Math.max(1, Math.trunc(stageNumber || 1));
  if (safeStage <= FIXED_JOURNEY_STAGE_NAMES.length) return FIXED_JOURNEY_STAGE_NAMES[safeStage - 1];
  return `দৃঢ়তার নতুন অধ্যায় ${new Intl.NumberFormat("bn-BD").format(safeStage)}`;
}

/** Backward-compatible helper for historical entries created before the fixed 2026–2030 journey. */
const LEGACY_JOURNEY_STAGE_TITLE_OVERRIDES: Readonly<Record<number, string>> = {
  3: "প্রবৃত্তির বিরুদ্ধে অবস্থান"
};

export function getJourneyStage(dayCount: number) {
  let remaining = Math.max(1, Math.trunc(dayCount || 1));
  let stageNumber = 1;
  let durationDays = 3;
  while (remaining > durationDays) {
    remaining -= durationDays;
    stageNumber += 1;
    durationDays += 1;
  }
  return {
    stageNumber,
    title: LEGACY_JOURNEY_STAGE_TITLE_OVERRIDES[stageNumber] || getJourneyStageTitle(stageNumber),
    requiredDays: durationDays,
    dayInStage: remaining,
    daysRemaining: durationDays - remaining,
    percent: Math.min(100, Math.round(remaining / durationDays * 100))
  };
}

export function getCompletedJourneyStages(dayCount: number) {
  let remaining = Math.max(0, Math.trunc(dayCount || 0));
  let stageNumber = 0;
  let duration = 3;
  while (remaining >= duration && stageNumber < 10000) {
    remaining -= duration;
    stageNumber += 1;
    duration += 1;
  }
  return stageNumber;
}

export function getStageCompletionOffset(stageNumber: number) {
  const safeStage = Math.max(1, Math.trunc(stageNumber || 1));
  return safeStage * (safeStage + 5) / 2 - 1;
}
