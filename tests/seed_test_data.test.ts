import { describe, expect, it } from "vitest";
import { BUCKET_COUNTS, TOTAL_TASKS, buildSeedPlan } from "../scripts/seed_test_data.mjs";

type Area = { id: string; name: string; sort_key: string };
type Project = { id: string; name: string; area_id: string | null; sort_key: string };

function diffDays(a: string, b: string) {
  const aa = new Date(`${a}T12:00:00`).getTime();
  const bb = new Date(`${b}T12:00:00`).getTime();
  return Math.round((aa - bb) / 86400000);
}

function fakeAreas(): Area[] {
  return Array.from({ length: 3 }, (_, i) => ({
    id: `area-${i + 1}`,
    name: `[SEED] area-${i + 1}`,
    sort_key: `a-${String(i + 1).padStart(2, "0")}`,
  }));
}

function fakeProjects(): Project[] {
  return Array.from({ length: 2 }, (_, i) => ({
    id: `project-${i + 1}`,
    name: `[SEED] project-${i + 1}`,
    area_id: `area-${i + 1}`,
    sort_key: `p-${String(i + 1).padStart(2, "0")}`,
  }));
}

describe("seed_test_data plan", () => {
  it("generates exactly 80 tasks and expected bucket counts", () => {
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

    expect(plan.summary.withoutDate).toBe(34);
    expect(plan.summary.someday).toBe(2);
    expect(plan.summary.todayDate).toBe(12);
    expect(plan.summary.past).toBe(18);
    expect(plan.summary.future).toBe(14);
    expect(plan.summary.archived).toBe(4);

    const hasMinPast18 = plan.taskSpecs.some((t) => typeof t.date === "string" && t.date.startsWith("2024-08-"));
    const hasMaxFuture18 = plan.taskSpecs.some(
      (t) => typeof t.date === "string" && t.date.startsWith("2027-08-")
    );
    expect(hasMinPast18).toBe(true);
    expect(hasMaxFuture18).toBe(true);

    const dated = plan.taskSpecs.filter((t) => typeof t.date === "string");
    const nearFuture = dated.filter((t) => {
      const d = diffDays(t.date as string, "2026-02-08");
      return d > 0 && d <= 31;
    }).length;
    const farFuture = dated.filter((t) => diffDays(t.date as string, "2026-02-08") > 180).length;
    const nearPast = dated.filter((t) => {
      const d = diffDays(t.date as string, "2026-02-08");
      return d < 0 && d >= -31;
    }).length;
    const farPast = dated.filter((t) => diffDays(t.date as string, "2026-02-08") < -180).length;
    expect(nearFuture).toBeGreaterThan(farFuture);
    expect(nearPast).toBeGreaterThan(farPast);
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

    expect(plan.checklistSpecs.length).toBe(147);
    expect(plan.checklistSpecs.every((c) => c.task_sort_key.startsWith("t-"))).toBe(true);
  });

  it("fixes area/project counts and increases scoped task volume", () => {
    const plan = buildSeedPlan({
      today: "2026-02-08",
      userId: "user-1",
      prefix: "[SEED] ",
      areaRows: fakeAreas(),
      projectRows: fakeProjects(),
    });

    expect(fakeAreas()).toHaveLength(3);
    expect(fakeProjects()).toHaveLength(2);

    const byArea = new Map<string, number>();
    const byProject = new Map<string, number>();
    let inboxCount = 0;

    for (const task of plan.taskSpecs) {
      if (task.area_id) {
        byArea.set(task.area_id, (byArea.get(task.area_id) ?? 0) + 1);
      } else {
        inboxCount += 1;
      }
      if (task.project_id) {
        byProject.set(task.project_id, (byProject.get(task.project_id) ?? 0) + 1);
      }
    }

    expect(byArea.size).toBe(3);
    expect(byProject.size).toBe(2);
    expect(inboxCount).toBe(2);
    expect(plan.taskSpecs.filter((t) => t.area_id !== null).length).toBeGreaterThanOrEqual(70);
    expect(plan.taskSpecs.filter((t) => t.project_id !== null).length).toBeGreaterThanOrEqual(35);
    expect(Math.min(...Array.from(byArea.values()))).toBeGreaterThanOrEqual(12);
    expect(Math.min(...Array.from(byProject.values()))).toBeGreaterThanOrEqual(8);
  });
});
