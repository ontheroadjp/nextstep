"use client";

import { useEffect, useMemo, useState } from "react";

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

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Task[] };

type Area = {
  id: string;
  name: string;
  sort_key?: string | null;
};

const DEFAULT_TZ = "540";

function useStoredValue(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) setValue(stored);
  }, [key]);
  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

function getTodayString(offsetMinutes: number) {
  const offsetMs = offsetMinutes * 60 * 1000;
  const now = new Date(Date.now() + offsetMs);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ);
  const [today, setToday] = useState<ViewState>({ status: "idle" });
  const [inbox, setInbox] = useState<ViewState>({ status: "idle" });
  const [areas, setAreas] = useState<ViewState>({ status: "idle" });

  const canFetch = token.trim().length > 0;

  const headers = useMemo(() => {
    const h = new Headers();
    if (token.trim()) h.set("x-access-token", token.trim());
    if (tzOffset.trim()) h.set("x-tz-offset-minutes", tzOffset.trim());
    return h;
  }, [token, tzOffset]);

  const fetchView = async (path: string, setter: (state: ViewState) => void) => {
    setter({ status: "loading" });
    try {
      const res = await fetch(path, { headers });
      const json = await res.json();
      if (!res.ok) {
        setter({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      setter({ status: "ready", items: json.items ?? [] });
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
      <div className="hero page">
        <div>
          <p className="eyebrow">Nextstep</p>
          <h1>Daily dashboard</h1>
          <p className="lead">
            Today と Inbox の件数だけを表示。エリアは同列に並べて確認できます。
          </p>
        </div>
      </div>

      <section className="grid">
        <CategoryCard
          title="Today"
          href="/today"
          status={today.status}
          detail={`Overdue ${todayCount.overdue} / Today ${todayCount.rest}`}
          showDetail={today.status === "ready"}
          icon={<SunIcon className="icon-today" />}
        />
        <CategoryCard
          title="Upcoming"
          href="/upcoming"
          status={today.status}
          icon={<CalendarIcon className="icon-upcoming" />}
        />
        <CategoryCard
          title="Anytime"
          href="/anytime"
          status={today.status}
          icon={<InfinityIcon className="icon-anytime" />}
        />
        <CategoryCard
          title="Someday"
          href="/someday"
          status={today.status}
          icon={<SparkIcon className="icon-someday" />}
        />
        <CategoryCard
          title="Logbook"
          href="/logbook"
          status={today.status}
          icon={<ArchiveIcon className="icon-logbook" />}
        />
        <CategoryCard
          title="Inbox"
          href="/inbox"
          status={inbox.status}
          detail={`Overdue ${inboxCount.overdue} / Others ${inboxCount.rest}`}
          showDetail={inbox.status === "ready"}
          icon={<InboxIcon className="icon-inbox" />}
        />
        {areas.status === "loading" && <CategoryCard title="Areas" status="loading" />}
        {areas.status === "error" && (
          <CategoryCard title="Areas" status="error" detail="Failed to load areas" showDetail />
        )}
        {areas.status === "ready" && areas.items.length === 0 && (
          <CategoryCard title="Areas" status="ready" detail="No areas" showDetail />
        )}
        {areas.status === "ready" &&
          (areas.items as Area[]).map((area) => (
            <CategoryCard key={area.id} title={area.name} href={`/areas/${area.id}`} />
          ))}
      </section>
      <footer className="footer-panel">
        <div className="panel">
          <label>
            Access Token
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="x-access-token を貼り付け"
              rows={3}
            />
          </label>
          <label>
            TZ Offset (minutes)
            <input
              value={tzOffset}
              onChange={(e) => setTzOffset(e.target.value)}
              placeholder="540"
            />
          </label>
          <div className="actions">
            <button onClick={refreshAll} disabled={!canFetch}>
              Refresh
            </button>
            {!canFetch && <span className="hint">token を入れると取得できます</span>}
          </div>
        </div>
      </footer>
    </main>
  );
}

function CategoryCard({
  title,
  href,
  status = "ready",
  detail,
  showDetail = false,
  icon,
}: {
  title: string;
  href?: string;
  status?: ViewState["status"];
  detail?: string;
  showDetail?: boolean;
  icon?: React.ReactNode;
}) {
  const body = (
    <div className="view-card">
      <div className="view-header">
        <h2 className="with-icon">
          {icon && <span className="title-icon">{icon}</span>}
          {title}
        </h2>
        <span className="badge">{status === "loading" ? "…" : "-"}</span>
      </div>
      {status === "error" && <p className="error">{detail ?? "Failed to load"}</p>}
      {status === "loading" && <p className="muted">Loading...</p>}
      {status === "idle" && <p className="muted">No data yet.</p>}
      {showDetail && status === "ready" && <p className="detail">{detail}</p>}
    </div>
  );
  return href ? (
    <a className="card-link" href={href}>
      {body}
    </a>
  ) : (
    body
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.95 6.95-1.41-1.41M8.46 8.46 7.05 7.05m10.49 0-1.41 1.41M8.46 15.54l-1.41 1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6 4 4M19 5l-4 4m-6 6-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M3 7h18M5 7l1-3h12l1 3M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M9 11h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4 5h16l2 8v6H2v-6l2-8Zm0 8h5l2 3h2l2-3h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfinityIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M7.5 9.5c-2 0-3.5 1.6-3.5 3.5S5.5 16.5 7.5 16.5c1.4 0 2.6-.7 4.5-2.5 1.9-1.8 3.1-2.5 4.5-2.5 2 0 3.5 1.6 3.5 3.5s-1.5 3.5-3.5 3.5c-1.4 0-2.6-.7-4.5-2.5-1.9-1.8-3.1-2.5-4.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
