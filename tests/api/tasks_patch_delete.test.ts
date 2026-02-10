import { describe, expect, it, vi } from "vitest";

let areaExists = true;
let projectExists = true;
let projectAreaId: string | null = null;
let lastTaskUpdate: Record<string, unknown> | null = null;

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
          update: (payload: Record<string, unknown>) => {
            lastTaskUpdate = payload;
            return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: "t1",
                      title: "Task",
                      note: "Note",
                      date: null,
                      deadline: null,
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
            };
          },
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
  it("PATCH sets date/deadline to null when someday=true", async () => {
    lastTaskUpdate = null;
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Task",
        note: "Note",
        someday: true,
      }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
    expect(lastTaskUpdate).toMatchObject({
      title: "Task",
      note: "Note",
      someday: true,
      date: null,
      deadline: null,
    });
  });

  it("PATCH forces someday=false when date is provided", async () => {
    lastTaskUpdate = null;
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Task",
        note: "Note",
        date: "2026-02-12",
      }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
    expect(lastTaskUpdate).toMatchObject({
      date: "2026-02-12",
      someday: false,
    });
  });

  it("PATCH rejects empty title", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH rejects blank title", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: " " }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH validates sortKey when provided", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortKey: " " }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH rejects invalid areaId", async () => {
    areaExists = false;
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaId: "a1" }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
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
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
    projectAreaId = null;
  });

  it("PATCH rejects deadline when someday=true", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ someday: true, deadline: "2026-02-01" }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH updates item", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note" }),
    });
    const res = await tasksPATCH(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
  });

  it("DELETE removes item", async () => {
    const res = await tasksDELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
  });
});
