import { describe, expect, it, vi } from "vitest";
import {
  ensureOwnedReference,
  getProjectAreaId,
  readJson,
  requireUserContext,
} from "../../app/api/_helpers";

type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

async function expectErrorResponse(
  response: Response,
  expected: { status: number; code: string; message: string }
) {
  expect(response).toBeInstanceOf(Response);
  expect(response.status).toBe(expected.status);
  const body = (await response.json()) as ErrorBody;
  expect(body.error.code).toBe(expected.code);
  expect(body.error.message).toBe(expected.message);
}

describe("app/api/_helpers boundary errors", () => {
  it("requireUserContext returns 401 when token is missing", async () => {
    const getUser = vi.fn();
    const supabase = {
      auth: {
        getUser,
      },
    };
    const req = new Request("http://localhost");

    const result = await requireUserContext(supabase as never, req);

    expect(getUser).not.toHaveBeenCalled();
    await expectErrorResponse(result as Response, {
      status: 401,
      code: "unauthorized",
      message: "Missing Authorization header",
    });
  });

  it("requireUserContext returns 401 when token is invalid", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
          error: null,
        })),
      },
    };
    const req = new Request("http://localhost", {
      headers: { "x-access-token": "invalid-token" },
    });

    const result = await requireUserContext(supabase as never, req);

    await expectErrorResponse(result as Response, {
      status: 401,
      code: "unauthorized",
      message: "Invalid access token",
    });
  });

  it("readJson returns 400 when JSON is invalid", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    const result = await readJson<Record<string, unknown>>(req);

    await expectErrorResponse(result as Response, {
      status: 400,
      code: "bad_request",
      message: "Invalid JSON body",
    });
  });

  it("ensureOwnedReference returns 400 when reference is not found", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })),
    };

    const result = await ensureOwnedReference(
      supabase as never,
      "u1",
      "areas",
      "a-missing",
      "areaId"
    );

    await expectErrorResponse(result as Response, {
      status: 400,
      code: "bad_request",
      message: "areaId is invalid",
    });
  });

  it("ensureOwnedReference returns 500 when DB fetch fails", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: null,
                error: { message: "db fetch failed" },
              })),
            })),
          })),
        })),
      })),
    };

    const result = await ensureOwnedReference(
      supabase as never,
      "u1",
      "projects",
      "p1",
      "projectId"
    );

    await expectErrorResponse(result as Response, {
      status: 500,
      code: "internal_error",
      message: "db fetch failed",
    });
  });

  it("getProjectAreaId returns 400 when project is not found", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })),
    };

    const result = await getProjectAreaId(supabase as never, "u1", "p-missing");

    await expectErrorResponse(result as Response, {
      status: 400,
      code: "bad_request",
      message: "projectId is invalid",
    });
  });

  it("getProjectAreaId returns 500 when DB fetch fails", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: null,
                error: { message: "db query failed" },
              })),
            })),
          })),
        })),
      })),
    };

    const result = await getProjectAreaId(supabase as never, "u1", "p1");

    await expectErrorResponse(result as Response, {
      status: 500,
      code: "internal_error",
      message: "db query failed",
    });
  });
});
