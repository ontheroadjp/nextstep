import { describe, expect, it, vi } from "vitest";

let shouldFail = false;

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
      if (table !== "tasks") {
        throw new Error(`unexpected table: ${table}`);
      }
      return {
        update: () => ({
          eq: () => ({
            not: () => ({
              is: () => ({
                select: async () =>
                  shouldFail
                    ? {
                        data: null,
                        error: { message: "failed" },
                      }
                    : {
                        data: [{ id: "t1" }, { id: "t2" }],
                        error: null,
                      },
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

import { POST } from "../../app/api/tasks/archive-completed/route";

describe("POST /api/tasks/archive-completed", () => {
  it("archives completed tasks in batch", async () => {
    shouldFail = false;
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.item.archivedCount).toBe(2);
    expect(typeof json.item.archivedAt).toBe("string");
  });

  it("returns 500 when update fails", async () => {
    shouldFail = true;
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(500);
  });
});
