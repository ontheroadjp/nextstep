import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn(() => ({ mock: "client" }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

const ORIGINAL_ENV = { ...process.env };

function restoreSupabaseEnv() {
  if (ORIGINAL_ENV.SUPABASE_URL === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = ORIGINAL_ENV.SUPABASE_URL;
  }

  if (ORIGINAL_ENV.SUPABASE_ANON_KEY === undefined) {
    delete process.env.SUPABASE_ANON_KEY;
  } else {
    process.env.SUPABASE_ANON_KEY = ORIGINAL_ENV.SUPABASE_ANON_KEY;
  }
}

describe("app/api/_supabase createServerClient contract", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockClear();
  });

  afterEach(() => {
    restoreSupabaseEnv();
    vi.resetModules();
  });

  it("throws on import when required env is missing", async () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = "anon-key";

    await expect(import("../../app/api/_supabase")).rejects.toThrow(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY"
    );
  });

  it("sets Authorization header when token is provided", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";

    const { createServerClient } = await import("../../app/api/_supabase");
    createServerClient("token-123");

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      {
        global: {
          headers: {
            Authorization: "Bearer token-123",
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  });

  it("does not set Authorization header when token is omitted", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";

    const { createServerClient } = await import("../../app/api/_supabase");
    createServerClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      {
        global: {},
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  });
});
