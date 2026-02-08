"use client";

import { useCallback } from "react";
import { fetchWithAutoRefresh } from "../_lib/auth_fetch";

type TokenSetter = (value: string) => void;

export function useAuthedFetch(
  accessToken: string,
  refreshToken: string,
  setAccessToken: TokenSetter,
  setRefreshToken: TokenSetter
) {
  return useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      fetchWithAutoRefresh(input, init, {
        accessToken,
        refreshToken,
        setAccessToken,
        setRefreshToken,
      }),
    [accessToken, refreshToken, setAccessToken, setRefreshToken]
  );
}
