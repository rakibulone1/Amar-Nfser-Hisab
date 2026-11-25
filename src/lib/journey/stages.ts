export const JOURNEY_STAGE_NAMES = [
  "জাগরণের সূচনা", "দৃঢ় সংকল্প", "প্রবৃত্তির বিরুদ্ধে অবস্থান", "আত্মসংযমের সাধনা", "পরিবর্তনের পথে",
  "আত্মনিয়ন্ত্রণের শক্তি", "দৃঢ়তার অঙ্গীকার", "শুদ্ধতার অভিযাত্রা", "অবিচলতার অনুশীলন", "নতুন অভ্যাসের ভিত্তি",
  "সচেতনতার বিস্তার", "দৃঢ়তার নতুন অধ্যায়", "নিজেকে জয় করার সাহস", "সুস্থ ধারার প্রতিষ্ঠা", "আত্মবিশ্বাসের বিকাশ",
  "সংকল্পের পরিপক্বতা", "স্থিতির অনুশীলন", "উন্নতির ধারাবাহিকতা", "অটল পথচলা", "আত্মশক্তির উন্মেষ",
  "সচেতন জীবনের অঙ্গীকার", "স্বনিয়ন্ত্রণের বিস্তার", "পরিবর্তনের গভীরতা", "দৃঢ়তার আলো", "নতুন সত্তার নির্মাণ",
  "শান্ত শক্তির বিকাশ", "সুস্থ সিদ্ধান্তের চর্চা", "ইচ্ছাশক্তির পরিণতি", "ধৈর্যের দৃঢ় ভিত্তি", "আত্মমর্যাদার পুনর্গঠন",
  "সচেতনতার নতুন দিগন্ত", "নিজের প্রতি অঙ্গীকার", "স্থিরতার চর্চা", "কল্যাণের পথে অগ্রযাত্রা", "অভ্যাসের নব নির্মাণ"
] as const;

export function getJourneyStageTitle(stageNumber: number) {
  const safeStage = Math.max(1, Math.floor(stageNumber));
  const index = safeStage - 1;
  const name = JOURNEY_STAGE_NAMES[index % JOURNEY_STAGE_NAMES.length];
  const cycle = Math.floor(index / JOURNEY_STAGE_NAMES.length);
  return cycle === 0 ? name : `${name} · অধ্যায় ${cycle + 1}`;
}

export function getJourneyStage(dayCount: number) {
  let stage = 1;
  let remaining = Math.max(1, Math.floor(dayCount));
  let length = 3;
  while (remaining > length) {
    remaining -= length;
    stage += 1;
    length += 1;
  }
  return { stage, dayInStage: remaining, length, title: getJourneyStageTitle(stage) };
}

/** A milestone is unlocked when the following religious day begins. */
export function getCompletedJourneyStages(dayCount: number) {
  let completed = 0;
  let remaining = Math.max(0, Math.floor(dayCount));
  let length = 3;
  while (remaining > length) {
    remaining -= length;
    completed += 1;
    length += 1;
  }
  return completed;
}

/** 3, then 4, then 5... religious days; returns the zero-based date offset. */
export function getStageCompletionOffset(stageNumber: number) {
  const stage = Math.max(1, Math.floor(stageNumber));
  return (stage * (stage + 5)) / 2 - 1;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(days)) return dateKey;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
