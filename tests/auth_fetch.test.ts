import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithAutoRefresh } from "../app/_lib/auth_fetch";

type AuthState = {
  accessToken: string;
  refreshToken: string;
  setAccessToken: (value: string) => void;
  setRefreshToken: (value: string) => void;
};

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function createAuthState(accessToken: string, refreshToken: string) {
  const setAccessToken = vi.fn();
  const setRefreshToken = vi.fn();
  const auth: AuthState = {
    accessToken,
    refreshToken,
    setAccessToken,
    setRefreshToken,
  };
  return { auth, setAccessToken, setRefreshToken };
}

describe("fetchWithAutoRefresh", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("sends bearer token and returns response when status is not 401", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response("ok", { status: 200 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { auth } = createAuthState("token-a", "refresh-a");
    const response = await fetchWithAutoRefresh("/api/today", { headers: { "x-test": "1" } }, auth);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer token-a");
    expect(headers.get("x-test")).toBe("1");
  });

  it("refreshes on 401, persists tokens, and retries with refreshed access token", async () => {
    const storage = createStorageMock();
    (globalThis as { window?: unknown }).window = {
      localStorage: storage,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        return new Response(
          JSON.stringify({
            item: {
              accessToken: "next-access",
              refreshToken: "next-refresh",
              expiresAt: 123456,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const authorization = new Headers(init?.headers ?? {}).get("Authorization");
      if (authorization === "Bearer old-access") return new Response("unauthorized", { status: 401 });
      if (authorization === "Bearer next-access") return new Response("ok", { status: 200 });
      return new Response("unexpected", { status: 500 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { auth, setAccessToken, setRefreshToken } = createAuthState("old-access", "old-refresh");
    const response = await fetchWithAutoRefresh("/api/today", {}, auth);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setAccessToken).toHaveBeenCalledWith("next-access");
    expect(setRefreshToken).toHaveBeenCalledWith("next-refresh");
    expect(storage.getItem("ns-access-token")).toBe("next-access");
    expect(storage.getItem("ns-refresh-token")).toBe("next-refresh");
  });

  it("returns original 401 response when refresh fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        return new Response("failed", { status: 401 });
      }
      const authorization = new Headers(init?.headers ?? {}).get("Authorization");
      if (authorization === "Bearer old-access") return new Response("unauthorized", { status: 401 });
      return new Response("unexpected", { status: 500 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { auth, setAccessToken, setRefreshToken } = createAuthState("old-access", "old-refresh");
    const response = await fetchWithAutoRefresh("/api/today", {}, auth);

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setAccessToken).not.toHaveBeenCalled();
    expect(setRefreshToken).not.toHaveBeenCalled();
  });

  it("coalesces concurrent refresh requests into a single refresh call", async () => {
    const storage = createStorageMock();
    (globalThis as { window?: unknown }).window = {
      localStorage: storage,
    };

    let resolveRefreshResponse: ((value: Response) => void) | null = null;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefreshResponse = resolve;
    });

    let refreshCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        return refreshResponse;
      }
      const authorization = new Headers(init?.headers ?? {}).get("Authorization");
      if (authorization === "Bearer old-access") return new Response("unauthorized", { status: 401 });
      if (authorization === "Bearer next-access") return new Response("ok", { status: 200 });
      return new Response("unexpected", { status: 500 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const authA = createAuthState("old-access", "old-refresh").auth;
    const authB = createAuthState("old-access", "old-refresh").auth;

    const reqA = fetchWithAutoRefresh("/api/today", {}, authA);
    const reqB = fetchWithAutoRefresh("/api/inbox", {}, authB);

    expect(resolveRefreshResponse).not.toBeNull();
    resolveRefreshResponse!(
      new Response(
        JSON.stringify({
          item: {
            accessToken: "next-access",
            refreshToken: "next-refresh",
            expiresAt: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const [resA, resB] = await Promise.all([reqA, reqB]);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
