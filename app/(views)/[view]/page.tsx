"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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
  | { status: "ready"; items: Task[] };

const DEFAULT_TZ = "540";
const ALLOWED_VIEWS = new Set(["today", "upcoming", "anytime", "someday", "logbook", "inbox"]);

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

export default function ViewPage() {
  const params = useParams();
  const view = String(params.view ?? "");
  const [token, setToken] = useStoredValue("ns-access-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ);
  const [state, setState] = useState<ViewState>({ status: "idle" });

  const canFetch = token.trim().length > 0 && ALLOWED_VIEWS.has(view);

  const headers = useMemo(() => {
    const h = new Headers();
    if (token.trim()) h.set("x-access-token", token.trim());
    if (tzOffset.trim()) h.set("x-tz-offset-minutes", tzOffset.trim());
    return h;
  }, [token, tzOffset]);

  const fetchView = async () => {
    if (!canFetch) return;
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/${view}`, { headers });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      const items: Task[] = Array.isArray(json.items)
        ? json.items
        : Array.isArray(json.groups)
          ? json.groups.flatMap((g: { items?: Task[] }) => g.items ?? [])
          : [];
      setState({ status: "ready", items });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  };

  useEffect(() => {
    if (canFetch) fetchView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, view]);

  if (!ALLOWED_VIEWS.has(view)) {
    return (
      <main className="page">
        <div className="panel">
          <h1>Not Found</h1>
          <p className="muted">このカテゴリは存在しません。</p>
          <a className="pill-link" href="/">
            Back
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">Category</p>
          <h1>{view.toUpperCase()}</h1>
          <p className="lead">詳細UIは後で調整します。今は一覧だけ確認できます。</p>
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
            <button onClick={fetchView} disabled={!canFetch}>
              Refresh
            </button>
            {!canFetch && <span className="hint">token を入れると取得できます</span>}
          </div>
        </div>
      </div>

      <section className="grid">
        <div className="view-card full">
          <div className="view-header">
            <h2>Tasks</h2>
            <span className="badge">
              {state.status === "ready" ? state.items.length : state.status === "loading" ? "…" : "-"}
            </span>
          </div>
          {state.status === "error" && <p className="error">{state.message}</p>}
          {state.status === "loading" && <p className="muted">Loading...</p>}
          {state.status === "idle" && <p className="muted">No data yet.</p>}
          {state.status === "ready" && (
            <div className="task-list">
              {state.items.length === 0 && <p className="muted">No tasks</p>}
              {state.items.map((item) => (
                <div key={item.id} className="task-row">
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
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
