import { describe, expect, it, vi } from "vitest";

let areaExists = true;
let projectExists = true;
let projectAreaId: string | null = null;

vi.mock("../../app/api/_helpers", async () => {
  const actual = await vi.importActual<typeof import("../../app/api/_helpers")>(
    "../../app/api/_helpers"
  );
  return {
    ...actual,
    requireUserContext: async () => ({ userId: "u1", accessToken: "token" }),
  };
});

vi.mock("../../app/api/_supabase", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "tasks") {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: "t1",
                      title: "Task",
                      note: "Note",
                      date: null,
                      someday: false,
                      completed_at: null,
                      area_id: null,
                      project_id: null,
                      sort_key: "a",
                      checklists: [],
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      const exists = table === "areas" ? areaExists : projectExists;
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: async () => ({
                data: exists ? [{ id: "a1", area_id: projectAreaId }] : [],
                error: null,
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

import { PATCH as tasksPATCH, DELETE as tasksDELETE } from "../../app/api/tasks/[id]/route";

describe("Tasks PATCH/DELETE", () => {
  it("PATCH accepts empty title", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const res = await tasksPATCH(req, { params: { id: "t1" } });
    expect(res.status).toBe(200);
  });

  it("PATCH validates sortKey when provided", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortKey: " " }),
    });
    const res = await tasksPATCH(req, { params: { id: "t1" } });
    expect(res.status).toBe(400);
  });

  it("PATCH rejects invalid areaId", async () => {
    areaExists = false;
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaId: "a1" }),
    });
    const res = await tasksPATCH(req, { params: { id: "t1" } });
    expect(res.status).toBe(400);
    areaExists = true;
  });

  it("PATCH rejects mismatched areaId and projectId", async () => {
    projectAreaId = "a1";
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "p1", areaId: "a2" }),
    });
    const res = await tasksPATCH(req, { params: { id: "t1" } });
    expect(res.status).toBe(400);
    projectAreaId = null;
  });

  it("PATCH updates item", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note" }),
    });
    const res = await tasksPATCH(req, { params: { id: "t1" } });
    expect(res.status).toBe(200);
  });

  it("DELETE removes item", async () => {
    const res = await tasksDELETE(new Request("http://localhost"), { params: { id: "t1" } });
    expect(res.status).toBe(200);
  });
});
