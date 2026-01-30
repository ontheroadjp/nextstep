import { describe, expect, it } from "vitest";
import { mapChecklist, mapTask } from "../app/api/_helpers";

describe("mapChecklist", () => {
  it("maps checklist fields and defaults", () => {
    const mapped = mapChecklist({
      id: "c1",
      title: "Check",
      completed: true,
      sort_key: null,
    });
    expect(mapped).toEqual({
      id: "c1",
      title: "Check",
      completed: true,
      sortKey: null,
    });
  });
});

describe("mapTask", () => {
  it("maps task fields and nested checklists", () => {
    const mapped = mapTask({
      id: "t1",
      title: "Task",
      note: "Note",
      date: "2026-01-30",
      someday: false,
      completed_at: null,
      area_id: "a1",
      project_id: "p1",
      sort_key: "a",
      checklists: [
        { id: "c1", title: "Check 1", completed: false, sort_key: "a" },
      ],
    });

    expect(mapped).toEqual({
      id: "t1",
      title: "Task",
      note: "Note",
      date: "2026-01-30",
      someday: false,
      completedAt: null,
      areaId: "a1",
      projectId: "p1",
      sortKey: "a",
      checklists: [
        { id: "c1", title: "Check 1", completed: false, sortKey: "a" },
      ],
    });
  });

  it("defaults missing checklists to empty array", () => {
    const mapped = mapTask({
      id: "t2",
      title: "Task",
      note: "Note",
      date: null,
      someday: true,
      completed_at: null,
      area_id: null,
      project_id: null,
      sort_key: null,
    });

    expect(mapped.checklists).toEqual([]);
  });
});
