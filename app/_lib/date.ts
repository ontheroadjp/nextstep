export const DEFAULT_TZ_OFFSET = "540";

export function getTodayString(offsetMinutes: number) {
  const offsetMs = offsetMinutes * 60 * 1000;
  const now = new Date(Date.now() + offsetMs);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getScheduleLabel(
  fields: { someday: boolean; date: string; evening: boolean },
  today: string
) {
  if (fields.someday) return "Someday";
  if (!fields.date) return "";
  if (fields.date === today) return fields.evening ? "This Evening" : "Today";
  return fields.date;
}
