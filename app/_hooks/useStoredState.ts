"use client";

import { useEffect, useState } from "react";

export function useStoredValue(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) {
      setValue(stored);
    } else {
      setValue(fallback);
    }
    setIsHydrated(true);
  }, [key, fallback]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(key, value);
  }, [key, value, isHydrated]);

  return [value, setValue] as const;
}

export function useStoredJson<T>(key: string, fallback: T) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    try {
      setValue(JSON.parse(stored) as T);
    } catch {
      // ignore malformed local storage
    }
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  }, [key, value]);

  return [value, setValue] as const;
}
