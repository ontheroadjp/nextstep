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
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: async () => ({ data: [{ id: "p1", name: "P", note: "N", area_id: null, sort_key: null }], error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: "p1", name: "P", note: "N", area_id: null, sort_key: null },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "p1", name: "P2", note: "N2", area_id: null, sort_key: null },
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
    }),
  }),
}));

import { GET as projectsGET, POST as projectsPOST } from "../../app/api/projects/route";
import { PATCH as projectPATCH, DELETE as projectDELETE } from "../../app/api/projects/[projectId]/route";

describe("Projects CRUD", () => {
  it("GET /api/projects returns items", async () => {
    const res = await projectsGET(new Request("http://localhost"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items.length).toBe(1);
  });

  it("POST /api/projects validates name", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "N" }),
    });
    const res = await projectsPOST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/projects validates sortKey", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "P", note: "N", sortKey: " " }),
    });
    const res = await projectsPOST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/projects creates item", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "P", note: "N" }),
    });
    const res = await projectsPOST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.item.id).toBe("p1");
  });

  it("PATCH /api/projects/:id validates sortKey", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortKey: " " }),
    });
    const res = await projectPATCH(req, { params: { projectId: "p1" } });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/projects/:id updates item", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "P2", note: "N2" }),
    });
    const res = await projectPATCH(req, { params: { projectId: "p1" } });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/projects/:id deletes item", async () => {
    const res = await projectDELETE(new Request("http://localhost"), { params: { projectId: "p1" } });
    expect(res.status).toBe(200);
  });
});
