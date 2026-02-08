import { sortDatedByDateAscThenCreatedDesc } from "./task_sort";

export type UpcomingTask = {
  id: string;
  date: string | null;
  createdAt: string | null;
};

export type UpcomingSection =
  | { key: string; kind: "day"; dayNumber: number; label: string; items: UpcomingTask[] }
  | {
      key: string;
      kind: "range";
      title: string;
      monthLabel: string;
      rangeLabel: string;
      items: UpcomingTask[];
    }
  | { key: string; kind: "month"; title: string; items: UpcomingTask[] }
  | { key: string; kind: "year"; title: string; items: UpcomingTask[] };

export function buildUpcomingSections<T extends UpcomingTask>(
  items: T[],
  today: string
): Array<UpcomingSection & { items: T[] }> {
  const todayParts = parseDateString(today);
  if (!todayParts) return [];

  const byDate = new Map<string, T[]>();
  for (const item of items) {
    if (!item.date) continue;
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date)?.push(item);
  }
  for (const [date, list] of byDate.entries()) {
    const sorted = sortDatedByDateAscThenCreatedDesc(list);
    byDate.set(date, sorted);
  }

  const sections: Array<UpcomingSection & { items: T[] }> = [];
  const todayNum = dateToNumber(today);

  for (let diff = 1; diff <= 7; diff += 1) {
    const date = numberToDateString(todayNum + diff);
    const parsed = parseDateString(date);
    if (!parsed) continue;
    sections.push({
      key: `day-${date}`,
      kind: "day",
      dayNumber: parsed.day,
      label: getUpcomingDayLabel(date, today),
      items: byDate.get(date) ?? [],
    });
  }

  const rangeStart = numberToDateString(todayNum + 8);
  const endOfCurrentMonth = formatDateString(
    todayParts.year,
    todayParts.month,
    new Date(Date.UTC(todayParts.year, todayParts.month + 1, 0)).getUTCDate()
  );
  const rangeStartNum = dateToNumber(rangeStart);
  const endOfCurrentMonthNum = dateToNumber(endOfCurrentMonth);
  if (rangeStartNum <= endOfCurrentMonthNum) {
    sections.push({
      key: `range-${rangeStart}-${endOfCurrentMonth}`,
      kind: "range",
      title: `${formatMonthLong(todayParts.year, todayParts.month)} ${dateRangeLabel(rangeStart, endOfCurrentMonth)}`,
      monthLabel: formatMonthLong(todayParts.year, todayParts.month),
      rangeLabel: dateRangeLabel(rangeStart, endOfCurrentMonth),
      items: collectItemsByRange(byDate, rangeStartNum, endOfCurrentMonthNum),
    });
  }

  for (let monthOffset = 1; monthOffset <= 3; monthOffset += 1) {
    const target = shiftMonth(todayParts.year, todayParts.month, monthOffset);
    const monthStart = formatDateString(target.year, target.month, 1);
    const monthEnd = formatDateString(
      target.year,
      target.month,
      new Date(Date.UTC(target.year, target.month + 1, 0)).getUTCDate()
    );
    sections.push({
      key: `month-${target.year}-${target.month}`,
      kind: "month",
      title: formatMonthLong(target.year, target.month),
      items: collectItemsByRange(byDate, dateToNumber(monthStart), dateToNumber(monthEnd)),
    });
  }

  const month4 = shiftMonth(todayParts.year, todayParts.month, 4);
  const month4StartNum = dateToNumber(formatDateString(month4.year, month4.month, 1));
  const yearGroups = new Map<number, T[]>();
  for (const [date, list] of byDate.entries()) {
    const num = dateToNumber(date);
    if (num < month4StartNum) continue;
    const parsed = parseDateString(date);
    if (!parsed) continue;
    if (!yearGroups.has(parsed.year)) yearGroups.set(parsed.year, []);
    yearGroups.get(parsed.year)?.push(...list);
  }
  const sortedYears = [...yearGroups.keys()].sort((a, b) => a - b);
  for (const year of sortedYears) {
    sections.push({
      key: `year-${year}`,
      kind: "year",
      title: String(year),
      items: sortDatedByDateAscThenCreatedDesc(yearGroups.get(year) ?? []),
    });
  }

  return sections;
}

function collectItemsByRange<T extends UpcomingTask>(
  byDate: Map<string, T[]>,
  startNum: number,
  endNum: number
) {
  const rows: T[] = [];
  for (const [date, list] of byDate.entries()) {
    const num = dateToNumber(date);
    if (num < startNum || num > endNum) continue;
    rows.push(...list);
  }
  return sortDatedByDateAscThenCreatedDesc(rows);
}

function numberToDateString(dayNum: number) {
  const date = new Date(dayNum * 86400000);
  return formatDateString(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getUpcomingDayLabel(date: string, today: string) {
  const diff = dateToNumber(date) - dateToNumber(today);
  if (diff === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

function formatMonthLong(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Date.UTC(year, month, 1)));
}

function dateRangeLabel(start: string, end: string) {
  const s = parseDateString(start);
  const e = parseDateString(end);
  if (!s || !e) return "";
  return `${s.day}\u2013${e.day}`;
}

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
  if (!parsed) return 0;
  return Math.floor(Date.UTC(parsed.year, parsed.month, parsed.day) / 86400000);
}

function formatDateString(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(Date.UTC(year, month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}
