"use client";

import { useMemo } from "react";
import { DEFAULT_TZ_OFFSET } from "../_lib/date";
import { useAuthedFetch } from "./useAuthedFetch";
import { useStoredValue } from "./useStoredState";

export function useClientAuth() {
  const [accessToken, setAccessToken] = useStoredValue("ns-access-token", "");
  const [refreshToken, setRefreshToken] = useStoredValue("ns-refresh-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ_OFFSET);

  const headers = useMemo(() => {
    const next = new Headers();
    const offset = tzOffset.trim();
    if (offset) {
      next.set("x-tz-offset-minutes", offset);
    }
    return next;
  }, [tzOffset]);

  const authedFetch = useAuthedFetch(accessToken, refreshToken, setAccessToken, setRefreshToken);

  return {
    accessToken,
    setAccessToken,
    refreshToken,
    setRefreshToken,
    tzOffset,
    setTzOffset,
    headers,
    authedFetch,
  };
}
