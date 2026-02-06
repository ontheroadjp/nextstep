function parseDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function dateToNumber(value: string) {
  const parsed = parseDateString(value);
  if (!parsed) return null;
  return Math.floor(Date.UTC(parsed.year, parsed.month, parsed.day) / 86400000);
}

export function formatOverdueDaysAgo(date: string, today: string) {
  const dateNum = dateToNumber(date);
  const todayNum = dateToNumber(today);
  if (dateNum === null || todayNum === null) return null;
  const diff = todayNum - dateNum;
  if (diff <= 0) return null;
  return `${diff}d ago`;
}

