export function formatHijriDate(dateKey: string, adjustmentDays = 0): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const adjusted = new Date(Date.UTC(year, month - 1, day + adjustmentDays, 12));
  return new Intl.DateTimeFormat("bn-BD-u-ca-islamic", {
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric"
  }).format(adjusted);
}
