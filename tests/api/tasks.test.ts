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
          insert: () => ({
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
                  sort_key: null,
                  checklists: [],
                },
                error: null,
              }),
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
                data: exists ? [{ id: "ref1", area_id: projectAreaId }] : [],
                error: null,
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

import { POST } from "../../app/api/tasks/route";

describe("POST /api/tasks", () => {
  it("accepts missing title", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Note" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("accepts empty note", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("creates task and returns item", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.item).toMatchObject({
      id: "t1",
      title: "Task",
      note: "Note",
      someday: false,
    });
  });

  it("rejects empty areaId", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note", areaId: " " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects missing areaId reference", async () => {
    areaExists = false;
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note", areaId: "a1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    areaExists = true;
  });

  it("rejects missing projectId reference", async () => {
    projectExists = false;
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note", projectId: "p1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    projectExists = true;
  });

  it("rejects mismatched areaId and projectId", async () => {
    projectAreaId = "a1";
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task", note: "Note", projectId: "p1", areaId: "a2" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    projectAreaId = null;
  });
});
