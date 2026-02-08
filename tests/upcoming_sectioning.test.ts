import { describe, expect, it } from "vitest";
import { buildUpcomingSections } from "../app/(views)/[view]/page";

type Task = {
  id: string;
  title: string;
  note: string;
  date: string | null;
  someday: boolean;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  areaId: string | null;
  projectId: string | null;
};

function task(id: string, date: string, createdAt: string): Task {
  return {
    id,
    title: `t-${id}`,
    note: "",
    date,
    someday: false,
    completedAt: null,
    archivedAt: null,
    createdAt,
    areaId: null,
    projectId: null,
  };
}

describe("upcoming sectioning", () => {
  it("splits upcoming into day/week, current-month range, next 3 months, then years", () => {
    const items: Task[] = [
      task("d1", "2026-02-09", "2026-02-01T10:00:00Z"),
      task("d2", "2026-02-10", "2026-02-01T09:00:00Z"),
      task("r1", "2026-02-16", "2026-02-01T08:00:00Z"),
      task("r2", "2026-02-28", "2026-02-01T07:00:00Z"),
      task("m1", "2026-03-10", "2026-02-01T06:00:00Z"),
      task("m2", "2026-04-01", "2026-02-01T05:00:00Z"),
      task("m3", "2026-05-20", "2026-02-01T04:00:00Z"),
      task("y0", "2026-06-02", "2026-02-01T03:00:00Z"),
      task("y1", "2027-01-05", "2026-02-01T02:00:00Z"),
      task("y2", "2028-04-10", "2026-02-01T01:00:00Z"),
    ];

    const sections = buildUpcomingSections(items, "2026-02-08");

    expect(sections).toHaveLength(14);
    expect(sections.slice(0, 7).every((s) => s.kind === "day")).toBe(true);
    expect(sections[0].kind).toBe("day");
    expect(sections[0].label).toBe("Tomorrow");
    expect(sections[0].dayNumber).toBe(9);

    expect(sections[7].kind).toBe("range");
    expect(sections[7].title).toBe("February 16–28");
    expect(sections[7].items.map((t) => t.id)).toEqual(["r1", "r2"]);

    expect(sections[8].kind).toBe("month");
    expect(sections[8].title).toBe("March");
    expect(sections[9].title).toBe("April");
    expect(sections[10].title).toBe("May");

    expect(sections[11].kind).toBe("year");
    expect(sections[11].title).toBe("2026");
    expect(sections[11].items.map((t) => t.id)).toEqual(["y0"]);
    expect(sections[12].title).toBe("2027");
    expect(sections[13].title).toBe("2028");
  });
});
