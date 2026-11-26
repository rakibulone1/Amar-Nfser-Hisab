export const FIXED_JOURNEY_ID = "amar-nfser-journey-2026-2030";
export const FIXED_JOURNEY_START_DATE = "2026-11-23";
export const FIXED_JOURNEY_END_DATE = "2030-10-30";
export const FIXED_JOURNEY_STAGE_COUNT = 71;
export const FIXED_JOURNEY_TOTAL_DAYS = 1438;

export const FIXED_JOURNEY_STAGE_NAMES = [
  "জাগরণের সূচনা",
  "দৃঢ় সংকল্প",
  "প্রবৃত্তির বিরুদ্ধে অবস্থান",
  "সচেতনতার বিকাশ",
  "আত্মপর্যবেক্ষণের শুরু",
  "অভ্যাসের শৃঙ্খল ভাঙা",
  "নিয়মিততার ভিত্তি",
  "ধৈর্যের অনুশীলন",
  "মনোযোগের পুনর্গঠন",
  "সীমারেখা রক্ষা",
  "সময়ের সদ্ব্যবহার",
  "আত্মবিশ্বাসের পুনর্গঠন",
  "প্রলোভন চিনে নেওয়া",
  "বিকল্প পথে অগ্রসর হওয়া",
  "স্থিতিশীলতার অনুশীলন",
  "সিদ্ধান্তে অটল থাকা",
  "অন্তরের পরিচ্ছন্নতা",
  "চিন্তার শৃঙ্খলা",
  "ব্যস্ততার মাঝে সচেতনতা",
  "একাগ্রতার পথ",
  "ছোট জয়ের স্বীকৃতি",
  "ধারাবাহিকতার শক্তি",
  "সংকট সামলানোর দক্ষতা",
  "আত্মসম্মান রক্ষা",
  "ভুল থেকে শিক্ষা",
  "ইতিবাচক পরিবেশ গড়া",
  "লক্ষ্যপথে মনোযোগ",
  "অনুশীলনে পরিণতি",
  "আত্মনিয়ন্ত্রণের উন্নতি",
  "মানসিক স্থিরতা",
  "বিশ্বাসের দৃঢ়তা",
  "শৃঙ্খলার পরিপক্বতা",
  "প্রথম অর্জনের স্বীকৃতি",
  "নতুন উচ্চতার প্রস্তুতি",
  "প্রতিকূলতা জয়ের সাহস",
  "স্থিতি ও সংযম",
  "দৃঢ়তার বিস্তার",
  "আত্মসংযমের শিখর",
  "অর্জন ধরে রাখার অঙ্গীকার",
  "নতুন অভ্যাসের স্থায়িত্ব",
  "অনুশীলনের গভীরতা",
  "সচেতন জীবনের প্রসার",
  "সিদ্ধান্তের পরিপক্বতা",
  "প্রতিদিনের সংযম",
  "আত্মশক্তির বিকাশ",
  "প্রজ্ঞার পথে অগ্রসর",
  "ইতিবাচক পরিবর্তন দৃঢ় করা",
  "ধারাবাহিকতার নবায়ন",
  "নিজেকে নতুনভাবে চেনা",
  "আত্মবিশ্বাসের স্থায়ী ভিত্তি",
  "শান্ত মন ও সুস্থ রুটিন",
  "সময়ের প্রতি দায়বদ্ধতা",
  "লক্ষ্যপূরণে দৃঢ়তা",
  "পরীক্ষায় স্থির থাকা",
  "পরিবর্তনকে ধরে রাখা",
  "আত্মপর্যালোচনার গভীরতা",
  "সচেতন সিদ্ধান্তের অভ্যাস",
  "আত্মশাসনের ভারসাম্য",
  "অধ্যবসায়ের পরিণতি",
  "সুস্থ অভ্যাসের বিস্তার",
  "পুরোনো ভুল থেকে দূরত্ব",
  "স্থিতিশীলতার নতুন অধ্যায়",
  "উন্নতির ধারাবাহিকতা",
  "দায়িত্বশীল জীবনের চর্চা",
  "দৃঢ়তার পরিণত রূপ",
  "অর্জনের মূল্যায়ন",
  "আত্মনিয়ন্ত্রণের স্থায়িত্ব",
  "নতুন জীবনের প্রস্তুতি",
  "দীর্ঘ যাত্রার দৃঢ়তা",
  "পূর্ণতার পথে",
  "নতুন অধ্যায়ের সূচনা"
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
    const module: 1 | 2 | 3 = stageNumber <= 33 ? 1 : stageNumber <= 38 ? 2 : 3;
    offset += durationDays;
    return {
      stageNumber, title, module, durationDays, startOffset, endOffset,
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
    title: getJourneyStageTitle(stageNumber),
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
