import { describe, expect, it, vi } from "vitest";

vi.mock("../../app/api/_supabase", () => ({
  createServerClient: () => ({}),
}));

vi.mock("../../app/api/_helpers", () => ({
  requireUserContext: async () =>
    Response.json(
      { error: { code: "unauthorized", message: "Missing Authorization header" } },
      { status: 401 }
    ),
  mapTask: (row: Record<string, unknown>) => row,
  todayFromRequest: () => "2026-01-30",
}));

vi.mock("../../app/api/_queries", () => ({
  fetchToday: async () => ({ data: [], error: null }),
}));

import { GET as todayGET } from "../../app/api/today/route";

describe("Auth", () => {
  it("returns 401 when auth is missing", async () => {
    const res = await todayGET(new Request("http://localhost"));
    expect(res.status).toBe(401);
  });
});
