import { describe, expect, it } from "vitest";
import {
  sortCreatedDesc,
  sortDatedByDateAscThenCreatedDesc,
  sortMixedByDateAndCreated,
} from "../app/_lib/task_sort";

type Task = { id: string; date: string | null; createdAt: string | null };

const task = (id: string, date: string | null, createdAt: string | null): Task => ({
  id,
  date,
  createdAt,
});

describe("task_sort", () => {
  it("sortCreatedDesc orders by createdAt desc", () => {
    const items = [
      task("a", null, "2024-01-01T00:00:00Z"),
      task("b", null, "2024-01-03T00:00:00Z"),
      task("c", null, "2024-01-02T00:00:00Z"),
    ];
    const result = sortCreatedDesc(items).map((t) => t.id);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("sortDatedByDateAscThenCreatedDesc orders by date asc then createdAt desc", () => {
    const items = [
      task("a", "2024-01-02", "2024-01-03T00:00:00Z"),
      task("b", "2024-01-01", "2024-01-02T00:00:00Z"),
      task("c", "2024-01-01", "2024-01-03T00:00:00Z"),
    ];
    const result = sortDatedByDateAscThenCreatedDesc(items).map((t) => t.id);
    expect(result).toEqual(["c", "b", "a"]);
  });

  it("sortMixedByDateAndCreated orders undated first then dated", () => {
    const items = [
      task("a", "2024-01-02", "2024-01-03T00:00:00Z"),
      task("b", null, "2024-01-05T00:00:00Z"),
      task("c", null, "2024-01-04T00:00:00Z"),
      task("d", "2024-01-01", "2024-01-02T00:00:00Z"),
    ];
    const result = sortMixedByDateAndCreated(items).map((t) => t.id);
    expect(result).toEqual(["b", "c", "d", "a"]);
  });
});
