"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessSettingsFooter } from "../_components/AccessSettingsFooter";
import { CategoryCard } from "../_components/CategoryCard";
import { LocaleSwitcher } from "../_components/LocaleSwitcher";
import { PageHero } from "../_components/PageHero";
import { useClientAuth } from "../_hooks/useClientAuth";
import { useLocale } from "../_hooks/useLocale";
import { getTodayString } from "../_lib/date";
import { getOverdueReferenceDate } from "../_lib/deadline";
import { t } from "../_lib/i18n";

type Task = {
  id: string;
  title: string;
  note: string;
  date: string | null;
  deadline: string | null;
  someday: boolean;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  areaId: string | null;
  projectId: string | null;
};

type DataState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: T[] };

type Area = {
  id: string;
  name: string;
  sort_key?: string | null;
};

function splitOverdue(items: Task[], today: string) {
  let overdue = 0;
  let rest = 0;
  for (const item of items) {
    if (item.completedAt) continue;
    const refDate = getOverdueReferenceDate(item.date, item.deadline);
    if (refDate && refDate < today) {
      overdue += 1;
    } else {
      rest += 1;
    }
  }
  return { overdue, rest };
}

export default function HomePage() {
  const { locale, setLocale } = useLocale();
  const {
    accessToken,
    authProvider,
    setAuthProvider,
    isAuthenticated,
    isAuthLoading,
    authError,
    login,
    logout,
    tzOffset,
    setTzOffset,
    headers,
    authedFetch,
  } = useClientAuth();
  const [today, setToday] = useState<DataState<Task>>({ status: "idle" });
  const [inbox, setInbox] = useState<DataState<Task>>({ status: "idle" });
  const [areas, setAreas] = useState<DataState<Area>>({ status: "idle" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const accessReady = accessToken.trim().length > 0;
  const canFetch = accessReady;

  const fetchView = async <T,>(path: string, setter: (state: DataState<T>) => void) => {
    setter({ status: "loading" });
    try {
      const res = await authedFetch(path, { headers });
      const json = await res.json();
      if (!res.ok) {
        setter({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      setter({ status: "ready", items: (json.items ?? []) as T[] });
    } catch (err) {
      setter({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  };

  const refreshAll = () => {
    if (!canFetch) return;
    fetchView("/api/today", setToday);
    fetchView("/api/inbox", setInbox);
    fetchView("/api/areas", setAreas);
  };

  useEffect(() => {
    if (canFetch) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch]);

  const todayDate = useMemo(() => {
    const offset = Number(tzOffset);
    return getTodayString(Number.isFinite(offset) ? offset : 0);
  }, [tzOffset]);

  const todayCount =
    today.status === "ready" ? splitOverdue(today.items, todayDate) : { overdue: 0, rest: 0 };
  const inboxCount =
    inbox.status === "ready" ? splitOverdue(inbox.items, todayDate) : { overdue: 0, rest: 0 };

  const handleLogin = async () => {
    const ok = await login(loginEmail, loginPassword);
    if (ok) {
      setLoginPassword("");
      refreshAll();
    }
  };

  return (
    <main>
      <PageHero
        eyebrow="Nextstep"
        title={t(locale, "dashboard_title")}
        lead={t(locale, "dashboard_lead")}
        rightSlot={<LocaleSwitcher locale={locale} setLocale={setLocale} />}
      />

      <section className="grid">
        <CategoryCard
          locale={locale}
          title={t(locale, "view_today")}
          href="/today"
          status={today.status}
          detail={`${t(locale, "overdue")} ${todayCount.overdue} / ${t(locale, "today")} ${todayCount.rest}`}
          showDetail={today.status === "ready"}
          icon={<i className="fa-solid fa-star icon-today" aria-hidden />}
        />
        <CategoryCard
          locale={locale}
          title={t(locale, "view_upcoming")}
          href="/upcoming"
          status={today.status}
          icon={<i className="fa-solid fa-calendar icon-upcoming" aria-hidden />}
        />
        <CategoryCard
          locale={locale}
          title={t(locale, "view_anytime")}
          href="/anytime"
          status={today.status}
          icon={<i className="fa-brands fa-stack-overflow icon-anytime" aria-hidden />}
        />
        <CategoryCard
          locale={locale}
          title={t(locale, "view_someday")}
          href="/someday"
          status={today.status}
          icon={<i className="fa-solid fa-archive icon-someday" aria-hidden />}
        />
        <CategoryCard
          locale={locale}
          title={t(locale, "view_logbook")}
          href="/logbook"
          status={today.status}
          icon={<i className="fa-solid fa-book icon-logbook" aria-hidden />}
        />
        <CategoryCard
          locale={locale}
          title={t(locale, "view_inbox")}
          href="/inbox"
          status={inbox.status}
          detail={`${t(locale, "overdue")} ${inboxCount.overdue} / ${t(locale, "others")} ${inboxCount.rest}`}
          showDetail={inbox.status === "ready"}
          icon={<i className="fa-solid fa-inbox icon-inbox" aria-hidden />}
        />
        {areas.status === "loading" && <CategoryCard locale={locale} title={t(locale, "view_areas")} status="loading" />}
        {areas.status === "error" && (
          <CategoryCard locale={locale} title={t(locale, "view_areas")} status="error" detail={t(locale, "failed_to_load_areas")} showDetail />
        )}
        {areas.status === "ready" && areas.items.length === 0 && (
          <CategoryCard locale={locale} title={t(locale, "view_areas")} status="ready" detail={t(locale, "no_areas")} showDetail />
        )}
        {areas.status === "ready" &&
          areas.items.map((area) => (
            <CategoryCard locale={locale} key={area.id} title={area.name} href={`/areas/${area.id}`} />
          ))}
      </section>
      <AccessSettingsFooter
        locale={locale}
        authProvider={authProvider}
        setAuthProvider={setAuthProvider}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        onLogin={handleLogin}
        onLogout={logout}
        isAuthenticated={isAuthenticated}
        isAuthLoading={isAuthLoading}
        authError={authError}
        tzOffset={tzOffset}
        setTzOffset={setTzOffset}
        onRefresh={refreshAll}
        canFetch={canFetch}
      />
    </main>
  );
}
