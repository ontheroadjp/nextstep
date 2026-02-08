import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshSessionMock = vi.fn();

vi.mock("../../app/api/_supabase", () => ({
  createServerClient: () => ({
    auth: {
      refreshSession: refreshSessionMock,
    },
  }),
}));

import { POST as refreshPOST } from "../../app/api/auth/refresh/route";

describe("auth refresh route", () => {
  beforeEach(() => {
    refreshSessionMock.mockReset();
  });

  it("returns 400 when refreshToken is missing", async () => {
    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await refreshPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
  });

  it("returns 401 when refreshSession fails", async () => {
    refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh failed" },
    });

    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "bad" }),
    });

    const res = await refreshPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns refreshed tokens on success", async () => {
    refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "next-access",
          refresh_token: "next-refresh",
          expires_at: 1700000000,
        },
      },
      error: null,
    });

    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "old-refresh" }),
    });

    const res = await refreshPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item.accessToken).toBe("next-access");
    expect(body.item.refreshToken).toBe("next-refresh");
    expect(body.item.expiresAt).toBe(1700000000);
  });
});
