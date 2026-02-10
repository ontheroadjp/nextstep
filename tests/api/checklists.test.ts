import { describe, expect, it, vi } from "vitest";

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
    from: () => {
      let orderCount = 0;
      const query = {
        eq: () => query,
        order: () => {
          orderCount += 1;
          if (orderCount >= 2) {
            return Promise.resolve({
              data: [{ id: "c1", title: "Check", completed: false, sort_key: null }],
              error: null,
            });
          }
          return query;
        },
        select: () => query,
        single: async () => ({
          data: { id: "c1", title: "Check", completed: true, sort_key: null },
          error: null,
        }),
      };
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: { id: "c1", title: "Check", completed: false, sort_key: null },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "c1", title: "Check", completed: true, sort_key: null },
                error: null,
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
        select: () => query,
      };
    },
  }),
}));

import { GET as checklistGET, POST as checklistPOST } from "../../app/api/tasks/[id]/checklists/route";
import { PATCH as checklistPATCH, DELETE as checklistDELETE } from "../../app/api/checklists/[id]/route";

describe("Checklists CRUD", () => {
  it("GET /api/tasks/:id/checklists returns items", async () => {
    const res = await checklistGET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
  });

  it("POST /api/tasks/:id/checklists validates title", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await checklistPOST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("POST /api/tasks/:id/checklists validates sortKey", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Check", sortKey: " " }),
    });
    const res = await checklistPOST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(400);
  });

  it("POST /api/tasks/:id/checklists creates item", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Check" }),
    });
    const res = await checklistPOST(req, { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(201);
  });

  it("PATCH /api/checklists/:id validates sortKey", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortKey: " " }),
    });
    const res = await checklistPATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/checklists/:id updates item", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const res = await checklistPATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/checklists/:id deletes item", async () => {
    const res = await checklistDELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
  });
});
