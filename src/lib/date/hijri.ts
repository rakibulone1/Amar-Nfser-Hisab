const HIJRI_MONTHS_BN = [
  "মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি",
  "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"
];

/**
 * Calculation-based Hijri label. Month names are explicitly Bengali so the
 * date never falls back to English month names on systems with sparse ICU data.
 * Local hilal announcements can differ by a day; this is a calendar estimate.
 */
export function formatHijriDate(dateKey: string, adjustmentDays = 0): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(adjustmentDays)) return dateKey;
  const [year, month, day] = dateKey.split("-").map(Number);
  const adjusted = new Date(Date.UTC(year, month - 1, day + adjustmentDays, 12));
  if (!Number.isFinite(adjusted.getTime())) return dateKey;
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", {
      timeZone: "UTC", day: "numeric", month: "numeric", year: "numeric"
    }).formatToParts(adjusted);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const hijriDay = Number(values.day);
    const hijriMonth = Number(values.month);
    const hijriYear = Number(values.year);
    if (!Number.isInteger(hijriDay) || hijriMonth < 1 || hijriMonth > 12 || !Number.isInteger(hijriYear)) return "";
    const bn = new Intl.NumberFormat("bn-BD");
    return `${bn.format(hijriDay)} ${HIJRI_MONTHS_BN[hijriMonth - 1]} ${bn.format(hijriYear)} হিজরি`;
  } catch {
    return "";
  }
}
