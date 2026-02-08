"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_TZ_OFFSET } from "../_lib/date";
import { useAuthedFetch } from "./useAuthedFetch";
import { useStoredValue } from "./useStoredState";

export type AuthProvider = "password";

export function useClientAuth() {
  const [accessToken, setAccessToken] = useStoredValue("ns-access-token", "");
  const [refreshToken, setRefreshToken] = useStoredValue("ns-refresh-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ_OFFSET);
  const [authProvider, setAuthProvider] = useState<AuthProvider>("password");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const headers = useMemo(() => {
    const next = new Headers();
    const offset = tzOffset.trim();
    if (offset) {
      next.set("x-tz-offset-minutes", offset);
    }
    return next;
  }, [tzOffset]);

  const authedFetch = useAuthedFetch(accessToken, refreshToken, setAccessToken, setRefreshToken);
  const isAuthenticated = accessToken.trim().length > 0;

  const login = useCallback(
    async (email: string, password: string) => {
      setIsAuthLoading(true);
      setAuthError(null);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: authProvider, email, password }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.item?.accessToken || !body?.item?.refreshToken) {
          setAuthError(body?.error?.message ?? "Failed to login");
          return false;
        }
        setAccessToken(String(body.item.accessToken));
        setRefreshToken(String(body.item.refreshToken));
        setAuthError(null);
        return true;
      } catch {
        setAuthError("Failed to login");
        return false;
      } finally {
        setIsAuthLoading(false);
      }
    },
    [authProvider, setAccessToken, setRefreshToken]
  );

  const logout = useCallback(() => {
    setAccessToken("");
    setRefreshToken("");
    setAuthError(null);
  }, [setAccessToken, setRefreshToken]);

  return {
    accessToken,
    setAccessToken,
    refreshToken,
    setRefreshToken,
    tzOffset,
    setTzOffset,
    headers,
    authedFetch,
    authProvider,
    setAuthProvider,
    isAuthenticated,
    isAuthLoading,
    authError,
    login,
    logout,
  };
}
