type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthState = AuthTokens & {
  setAccessToken: (value: string) => void;
  setRefreshToken: (value: string) => void;
};

type RefreshedSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};

const ACCESS_TOKEN_KEY = "ns-access-token";
const REFRESH_TOKEN_KEY = "ns-refresh-token";

let refreshInFlight: Promise<RefreshedSession | null> | null = null;

function withBearer(headers: Headers, accessToken: string) {
  const token = accessToken.trim();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function sendWithBearer(
  input: RequestInfo | URL,
  init: RequestInit,
  accessToken: string
) {
  const headers = new Headers(init.headers ?? {});
  withBearer(headers, accessToken);
  return fetch(input, { ...init, headers });
}

async function refreshSession(refreshToken: string): Promise<RefreshedSession | null> {
  const token = refreshToken.trim();
  if (!token) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: token }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.item?.accessToken || !body?.item?.refreshToken) {
          return null;
        }
        return {
          accessToken: String(body.item.accessToken),
          refreshToken: String(body.item.refreshToken),
          expiresAt:
            typeof body.item.expiresAt === "number" ? body.item.expiresAt : null,
        };
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

function applyRefreshedSession(auth: AuthState, refreshed: RefreshedSession) {
  auth.setAccessToken(refreshed.accessToken);
  auth.setRefreshToken(refreshed.refreshToken);

  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, refreshed.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken);
}

export async function fetchWithAutoRefresh(
  input: RequestInfo | URL,
  init: RequestInit = {},
  auth: AuthState
) {
  const first = await sendWithBearer(input, init, auth.accessToken);
  if (first.status !== 401) return first;

  const refreshed = await refreshSession(auth.refreshToken);
  if (!refreshed) return first;

  applyRefreshedSession(auth, refreshed);

  return sendWithBearer(input, init, refreshed.accessToken);
}
