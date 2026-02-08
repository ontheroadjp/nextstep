import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPasswordMock = vi.fn();

vi.mock("../../app/api/_supabase", () => ({
  createServerClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
    },
  }),
}));

import { POST as loginPOST } from "../../app/api/auth/login/route";

describe("auth login route", () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset();
  });

  it("returns 400 when email/password is missing", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "password" }),
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
  });

  it("returns 400 for unsupported provider", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "magic_link", email: "a@example.com", password: "x" }),
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
  });

  it("returns 401 when sign-in fails", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: null },
      error: { message: "login failed" },
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "password", email: "a@example.com", password: "bad" }),
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns tokens on success", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: {
        session: {
          access_token: "next-access",
          refresh_token: "next-refresh",
          expires_at: 1700000000,
        },
      },
      error: null,
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "password", email: "a@example.com", password: "good" }),
    });

    const res = await loginPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.item.accessToken).toBe("next-access");
    expect(body.item.refreshToken).toBe("next-refresh");
    expect(body.item.expiresAt).toBe(1700000000);
  });
});
