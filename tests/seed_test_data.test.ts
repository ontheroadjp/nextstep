import { describe, expect, it } from "vitest";
import { BUCKET_COUNTS, TOTAL_TASKS, buildSeedPlan } from "../scripts/seed_test_data.mjs";

type Area = { id: string; name: string; sort_key: string };
type Project = { id: string; name: string; area_id: string | null; sort_key: string };

function fakeAreas(): Area[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `area-${i + 1}`,
    name: `[SEED] area-${i + 1}`,
    sort_key: `a-${String(i + 1).padStart(2, "0")}`,
  }));
}

function fakeProjects(): Project[] {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `project-${i + 1}`,
    name: `[SEED] project-${i + 1}`,
    area_id: i % 6 === 0 ? null : `area-${(i % 10) + 1}`,
    sort_key: `p-${String(i + 1).padStart(2, "0")}`,
  }));
}

describe("seed_test_data plan", () => {
  it("generates exactly 500 tasks and expected bucket counts", () => {
    const plan = buildSeedPlan({
      today: "2026-02-08",
      userId: "user-1",
      prefix: "[SEED] ",
      areaRows: fakeAreas(),
      projectRows: fakeProjects(),
    });

    expect(plan.taskSpecs).toHaveLength(TOTAL_TASKS);
    expect(plan.summary.total).toBe(TOTAL_TASKS);
    expect(plan.summary.bucket).toEqual(BUCKET_COUNTS);
  });

  it("covers date patterns: no date, today, past, future, someday, archived", () => {
    const plan = buildSeedPlan({
      today: "2026-02-08",
      userId: "user-1",
      prefix: "[SEED] ",
      areaRows: fakeAreas(),
      projectRows: fakeProjects(),
    });

    expect(plan.summary.withoutDate).toBe(160);
    expect(plan.summary.someday).toBe(60);
    expect(plan.summary.todayDate).toBe(90);
    expect(plan.summary.past).toBe(110);
    expect(plan.summary.future).toBe(80);
    expect(plan.summary.archived).toBe(30);

    const hasMinPast18 = plan.taskSpecs.some((t) => typeof t.date === "string" && t.date.startsWith("2024-08-"));
    const hasMaxFuture18 = plan.taskSpecs.some(
      (t) => typeof t.date === "string" && t.date.startsWith("2027-08-")
    );
    expect(hasMinPast18).toBe(true);
    expect(hasMaxFuture18).toBe(true);
  });

  it("keeps realistic task titles and avoids placeholder-only names", () => {
    const plan = buildSeedPlan({
      today: "2026-02-08",
      userId: "user-1",
      prefix: "[SEED] ",
      areaRows: fakeAreas(),
      projectRows: fakeProjects(),
    });

    expect(plan.taskSpecs.some((t) => t.title.includes("ミルクを買う"))).toBe(true);

    for (const task of plan.taskSpecs) {
      expect(task.title).not.toMatch(/テスト\d+/);
      expect(task.title.length).toBeGreaterThan(8);
      if (task.someday) {
        expect(task.date).toBeNull();
      }
      if (task.archived_at) {
        expect(task.completed_at).toBeTruthy();
      }
    }
  });

  it("generates checklist rows for multiple tasks", () => {
    const plan = buildSeedPlan({
      today: "2026-02-08",
      userId: "user-1",
      prefix: "[SEED] ",
      areaRows: fakeAreas(),
      projectRows: fakeProjects(),
    });

    expect(plan.checklistSpecs.length).toBe(360);
    expect(plan.checklistSpecs.every((c) => c.task_sort_key.startsWith("t-"))).toBe(true);
  });
});
