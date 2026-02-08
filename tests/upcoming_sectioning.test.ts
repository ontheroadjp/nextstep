import { describe, expect, it } from "vitest";
import { buildUpcomingSections } from "../app/_lib/upcoming_sections";

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
    expect(sections[0]?.kind).toBe("day");
    const first = sections[0];
    if (!first || first.kind !== "day") throw new Error("first section must be day");
    expect(first.label).toBe("Tomorrow");
    expect(first.dayNumber).toBe(9);

    expect(sections[7]?.kind).toBe("range");
    const range = sections[7];
    if (!range || range.kind !== "range") throw new Error("8th section must be range");
    expect(range.title).toBe("February 16–28");
    expect(range.items.map((t) => t.id)).toEqual(["r1", "r2"]);

    expect(sections[8]?.kind).toBe("month");
    const month1 = sections[8];
    const month2 = sections[9];
    const month3 = sections[10];
    if (!month1 || month1.kind !== "month") throw new Error("9th section must be month");
    if (!month2 || month2.kind !== "month") throw new Error("10th section must be month");
    if (!month3 || month3.kind !== "month") throw new Error("11th section must be month");
    expect(month1.title).toBe("March");
    expect(month2.title).toBe("April");
    expect(month3.title).toBe("May");

    expect(sections[11]?.kind).toBe("year");
    const year1 = sections[11];
    const year2 = sections[12];
    const year3 = sections[13];
    if (!year1 || year1.kind !== "year") throw new Error("12th section must be year");
    if (!year2 || year2.kind !== "year") throw new Error("13th section must be year");
    if (!year3 || year3.kind !== "year") throw new Error("14th section must be year");
    expect(year1.title).toBe("2026");
    expect(year1.items.map((t) => t.id)).toEqual(["y0"]);
    expect(year2.title).toBe("2027");
    expect(year3.title).toBe("2028");
  });
});
