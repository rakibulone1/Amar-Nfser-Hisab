export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface DailyPrayerTimes {
  date: string;
  timeZone: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  source: string;
  fetchedAt: string;
}

export interface PrayerTimeRequest {
  localDate: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  asrSchool: "hanafi";
}

export interface PrayerTimeProvider {
  readonly providerId: string;
  getDailyTimes(input: PrayerTimeRequest): Promise<DailyPrayerTimes>;
}
