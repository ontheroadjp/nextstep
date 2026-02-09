const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null | undefined): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

export function isDateAfterDeadline(
  date: string | null | undefined,
  deadline: string | null | undefined
) {
  if (!isIsoDate(date) || !isIsoDate(deadline)) return false;
  return date > deadline;
}

export function shouldWarnSomedayWithDeadline(
  deadline: string | null | undefined,
  nextSomeday: boolean
) {
  return nextSomeday && isIsoDate(deadline);
}

export function getOverdueReferenceDate(
  date: string | null | undefined,
  deadline: string | null | undefined
) {
  if (isIsoDate(deadline)) return deadline;
  if (isIsoDate(date)) return date;
  return null;
}
