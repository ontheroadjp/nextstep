"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  note: string;
  date: string | null;
  someday: boolean;
  completedAt: string | null;
  areaId: string | null;
  projectId: string | null;
};

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Task[] }
  | { status: "grouped"; groups: { date: string; items: Task[] }[] };

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

export default function HomePage() {
  const [token, setToken] = useStoredValue("ns-access-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ);
  const [today, setToday] = useState<ViewState>({ status: "idle" });
  const [upcoming, setUpcoming] = useState<ViewState>({ status: "idle" });
  const [anytime, setAnytime] = useState<ViewState>({ status: "idle" });
  const [someday, setSomeday] = useState<ViewState>({ status: "idle" });
  const [logbook, setLogbook] = useState<ViewState>({ status: "idle" });
  const [inbox, setInbox] = useState<ViewState>({ status: "idle" });

  const canFetch = token.trim().length > 0;

  const headers = useMemo(() => {
    const h = new Headers();
    if (token.trim()) h.set("x-access-token", token.trim());
    if (tzOffset.trim()) h.set("x-tz-offset-minutes", tzOffset.trim());
    return h;
  }, [token, tzOffset]);

  const fetchView = async (path: string, setter: (state: ViewState) => void, grouped = false) => {
    setter({ status: "loading" });
    try {
      const res = await fetch(path, { headers });
      const json = await res.json();
      if (!res.ok) {
        setter({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      if (grouped) {
        setter({ status: "grouped", groups: json.groups ?? [] });
      } else {
        setter({ status: "ready", items: json.items ?? [] });
      }
    } catch (err) {
      setter({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  };

  const refreshAll = () => {
    if (!canFetch) return;
    fetchView("/api/today", setToday);
    fetchView("/api/upcoming", setUpcoming, true);
    fetchView("/api/anytime", setAnytime);
    fetchView("/api/someday", setSomeday);
    fetchView("/api/logbook", setLogbook);
    fetchView("/api/inbox", setInbox);
  };

  useEffect(() => {
    if (canFetch) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch]);

  return (
    <main className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">Nextstep</p>
          <h1>Task views, live.</h1>
          <p className="lead">
            Today / Upcoming / Anytime / Someday / Logbook / Inbox を一画面で確認。
            テスト用アクセストークンを貼り付けて即確認できます。
          </p>
        </div>
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
      </div>

      <section className="grid">
        <ViewCard title="Today" state={today} />
        <ViewCard title="Upcoming" state={upcoming} grouped />
        <ViewCard title="Anytime" state={anytime} />
        <ViewCard title="Someday" state={someday} />
        <ViewCard title="Logbook" state={logbook} />
        <ViewCard title="Inbox" state={inbox} />
      </section>
    </main>
  );
}

function ViewCard({
  title,
  state,
  grouped = false,
}: {
  title: string;
  state: ViewState;
  grouped?: boolean;
}) {
  return (
    <div className="view-card">
      <div className="view-header">
        <h2>{title}</h2>
        <span className="badge">
          {state.status === "ready" ? state.items.length : ""}
          {state.status === "grouped"
            ? state.groups.reduce((sum, g) => sum + g.items.length, 0)
            : ""}
          {state.status === "loading" ? "…" : ""}
          {state.status === "idle" ? "-" : ""}
        </span>
      </div>
      {state.status === "error" && <p className="error">{state.message}</p>}
      {state.status === "loading" && <p className="muted">Loading...</p>}
      {state.status === "idle" && <p className="muted">No data yet.</p>}
      {grouped && state.status === "grouped" && (
        <div className="group-list">
          {state.groups.map((group) => (
            <div key={group.date} className="group">
              <div className="group-date">{group.date}</div>
              {group.items.length === 0 && <p className="muted">No tasks</p>}
              {group.items.map((item) => (
                <TaskRow key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      )}
      {!grouped && state.status === "ready" && (
        <div className="task-list">
          {state.items.length === 0 && <p className="muted">No tasks</p>}
          {state.items.map((item) => (
            <TaskRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: Task }) {
  return (
    <div className="task-row">
      <div>
        <div className="task-title">{item.title}</div>
        <div className="task-note">{item.note}</div>
      </div>
      <div className="task-meta">
        {item.someday && <span className="pill">Someday</span>}
        {item.date && <span className="pill">{item.date}</span>}
        {item.completedAt && <span className="pill">Done</span>}
      </div>
    </div>
  );
}
