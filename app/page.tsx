"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessSettingsFooter } from "./_components/AccessSettingsFooter";
import { CategoryCard } from "./_components/CategoryCard";
import { PageHero } from "./_components/PageHero";
import { useStoredValue } from "./_hooks/useStoredState";
import { DEFAULT_TZ_OFFSET, getTodayString } from "./_lib/date";

type Task = {
  id: string;
  title: string;
  note: string;
  date: string | null;
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
    if (item.date && item.date < today) {
      overdue += 1;
    } else {
      rest += 1;
    }
  }
  return { overdue, rest };
}

export default function HomePage() {
  const [token, setToken] = useStoredValue("ns-access-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ_OFFSET);
  const [today, setToday] = useState<DataState<Task>>({ status: "idle" });
  const [inbox, setInbox] = useState<DataState<Task>>({ status: "idle" });
  const [areas, setAreas] = useState<DataState<Area>>({ status: "idle" });

  const canFetch = token.trim().length > 0;

  const headers = useMemo(() => {
    const h = new Headers();
    if (token.trim()) h.set("x-access-token", token.trim());
    if (tzOffset.trim()) h.set("x-tz-offset-minutes", tzOffset.trim());
    return h;
  }, [token, tzOffset]);

  const fetchView = async <T,>(path: string, setter: (state: DataState<T>) => void) => {
    setter({ status: "loading" });
    try {
      const res = await fetch(path, { headers });
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

  return (
    <main>
      <PageHero
        eyebrow="Nextstep"
        title="Daily dashboard"
        lead="Today と Inbox の件数だけを表示。エリアは同列に並べて確認できます。"
      />

      <section className="grid">
        <CategoryCard
          title="Today"
          href="/today"
          status={today.status}
          detail={`Overdue ${todayCount.overdue} / Today ${todayCount.rest}`}
          showDetail={today.status === "ready"}
          icon={<i className="fa-solid fa-star icon-today" aria-hidden />}
        />
        <CategoryCard
          title="Upcoming"
          href="/upcoming"
          status={today.status}
          icon={<i className="fa-solid fa-calendar icon-upcoming" aria-hidden />}
        />
        <CategoryCard
          title="Anytime"
          href="/anytime"
          status={today.status}
          icon={<i className="fa-brands fa-stack-overflow icon-anytime" aria-hidden />}
        />
        <CategoryCard
          title="Someday"
          href="/someday"
          status={today.status}
          icon={<i className="fa-solid fa-archive icon-someday" aria-hidden />}
        />
        <CategoryCard
          title="Logbook"
          href="/logbook"
          status={today.status}
          icon={<i className="fa-solid fa-book icon-logbook" aria-hidden />}
        />
        <CategoryCard
          title="Inbox"
          href="/inbox"
          status={inbox.status}
          detail={`Overdue ${inboxCount.overdue} / Others ${inboxCount.rest}`}
          showDetail={inbox.status === "ready"}
          icon={<i className="fa-solid fa-inbox icon-inbox" aria-hidden />}
        />
        {areas.status === "loading" && <CategoryCard title="Areas" status="loading" />}
        {areas.status === "error" && (
          <CategoryCard title="Areas" status="error" detail="Failed to load areas" showDetail />
        )}
        {areas.status === "ready" && areas.items.length === 0 && (
          <CategoryCard title="Areas" status="ready" detail="No areas" showDetail />
        )}
        {areas.status === "ready" &&
          areas.items.map((area) => (
            <CategoryCard key={area.id} title={area.name} href={`/areas/${area.id}`} />
          ))}
      </section>
      <AccessSettingsFooter
        token={token}
        setToken={setToken}
        tzOffset={tzOffset}
        setTzOffset={setTzOffset}
        onRefresh={refreshAll}
        canFetch={canFetch}
      />
    </main>
  );
}
