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
    }),
  }),
}));

import { POST } from "../../app/api/tasks/route";

describe("POST /api/tasks", () => {
  it("returns 400 when title is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Note" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("bad_request");
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
});
