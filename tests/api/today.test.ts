import { describe, expect, it, vi } from "vitest";

vi.mock("../../app/api/_supabase", () => ({
  createServerClient: () => ({}),
}));

vi.mock("../../app/api/_helpers", () => ({
  mapTask: (row: Record<string, unknown>) => row,
  requireUserContext: async () => ({ userId: "u1", accessToken: "token" }),
  todayFromRequest: () => "2026-01-30",
}));

vi.mock("../../app/api/_queries", () => ({
  fetchToday: async () => ({
    data: [{ id: "t1", title: "Task" }],
    error: null,
  }),
}));

import { GET } from "../../app/api/today/route";

describe("GET /api/today", () => {
  it("returns items", async () => {
    const res = await GET(new Request("http://localhost"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ items: [{ id: "t1", title: "Task" }] });
  });
});
