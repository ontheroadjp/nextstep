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
            order: async () => ({ data: [{ id: "a1", name: "Area", sort_key: null }], error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: "a1", name: "Area", sort_key: null }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: "a1", name: "Area2", sort_key: null }, error: null }),
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

import { GET as areasGET, POST as areasPOST } from "../../app/api/areas/route";
import { PATCH as areaPATCH, DELETE as areaDELETE } from "../../app/api/areas/[areaId]/route";

describe("Areas CRUD", () => {
  it("GET /api/areas returns items", async () => {
    const res = await areasGET(new Request("http://localhost"));
    expect(res.status).toBe(200);
  });

  it("POST /api/areas validates name", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await areasPOST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/areas validates sortKey", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Area", sortKey: " " }),
    });
    const res = await areasPOST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/areas creates item", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Area" }),
    });
    const res = await areasPOST(req);
    expect(res.status).toBe(201);
  });

  it("PATCH /api/areas/:id validates sortKey", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sortKey: " " }),
    });
    const res = await areaPATCH(req, { params: Promise.resolve({ areaId: "a1" }) });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/areas/:id updates item", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Area2" }),
    });
    const res = await areaPATCH(req, { params: Promise.resolve({ areaId: "a1" }) });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/areas/:id deletes item", async () => {
    const res = await areaDELETE(new Request("http://localhost"), { params: Promise.resolve({ areaId: "a1" }) });
    expect(res.status).toBe(200);
  });
});
