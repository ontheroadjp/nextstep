export type TaskSortInput = {
  id: string;
  date: string | null;
  createdAt: string | null;
};

type GroupedTasks = {
  dated: TaskSortInput[];
  undated: TaskSortInput[];
};

function safeTime(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function safeDateKey(value: string | null): string {
  return typeof value === "string" && value ? value : "";
}

export function splitByDate(items: TaskSortInput[]): GroupedTasks {
  const dated: TaskSortInput[] = [];
  const undated: TaskSortInput[] = [];
  for (const item of items) {
    if (item.date) {
      dated.push(item);
    } else {
      undated.push(item);
    }
  }
  return { dated, undated };
}

export function sortUndatedByCreatedDesc<T extends TaskSortInput>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = safeTime(a.createdAt);
    const bTime = safeTime(b.createdAt);
    return bTime - aTime;
  });
}

export function sortDatedByDateAscThenCreatedDesc<T extends TaskSortInput>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aKey = safeDateKey(a.date);
    const bKey = safeDateKey(b.date);
    const dateCompare = aKey.localeCompare(bKey);
    if (dateCompare !== 0) return dateCompare;
    const aTime = safeTime(a.createdAt);
    const bTime = safeTime(b.createdAt);
    return bTime - aTime;
  });
}

export function sortMixedByDateAndCreated<T extends TaskSortInput>(items: T[]): T[] {
  const { dated, undated } = splitByDate(items);
  const sortedUndated = sortUndatedByCreatedDesc(undated);
  const sortedDated = sortDatedByDateAscThenCreatedDesc(dated);
  return [...sortedUndated, ...sortedDated];
}

export function sortCreatedDesc<T extends TaskSortInput>(items: T[]): T[] {
  return sortUndatedByCreatedDesc(items);
}
