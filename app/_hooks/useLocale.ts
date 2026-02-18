"use client";

import { useEffect } from "react";
import { resolveLocale, toIntlLocale, type AppLocale } from "../_lib/i18n";
import { useStoredValue } from "./useStoredState";

export function useLocale() {
  const [rawLocale, setRawLocale] = useStoredValue("ns-locale", "ja");
  const locale = resolveLocale(rawLocale);

  useEffect(() => {
    if (rawLocale !== locale) {
      setRawLocale(locale);
    }
    document.documentElement.lang = toIntlLocale(locale);
  }, [locale, rawLocale, setRawLocale]);

  const setLocale = (next: AppLocale) => {
    setRawLocale(next);
  };

  return { locale, setLocale };
}
