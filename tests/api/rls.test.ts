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
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { message: "Results contain 0 rows" },
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { PATCH as tasksPATCH } from "../../app/api/tasks/[id]/route";

describe("RLS-style no-row update", () => {
  it("returns 404 when update affects no rows", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New" }),
    });
    const res = await tasksPATCH(req, { params: { id: "t1" } });
    expect(res.status).toBe(404);
  });
});
