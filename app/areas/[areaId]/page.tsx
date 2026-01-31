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
  archivedAt: string | null;
};

type Draft = {
  title: string;
  note: string;
  date: string;
  someday: boolean;
  projectId: string;
};

type AreaState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; item: { id: string; name: string }; tasks: Task[]; projects: any[] };

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

export default function AreaPage() {
  const params = useParams();
  const areaId = String(params.areaId ?? "");
  const [token, setToken] = useStoredValue("ns-access-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ);
  const [state, setState] = useState<AreaState>({ status: "idle" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const canFetch = token.trim().length > 0 && areaId.length > 0;

  const headers = useMemo(() => {
    const h = new Headers();
    if (token.trim()) h.set("x-access-token", token.trim());
    if (tzOffset.trim()) h.set("x-tz-offset-minutes", tzOffset.trim());
    return h;
  }, [token, tzOffset]);

  const today = useMemo(() => {
    const offset = Number(tzOffset);
    return getTodayString(Number.isFinite(offset) ? offset : 0);
  }, [tzOffset]);

  const fetchArea = async () => {
    if (!canFetch) return;
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/areas/${areaId}`, { headers });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      setState({
        status: "ready",
        item: json.item,
        tasks: json.tasks ?? [],
        projects: json.projects ?? [],
      });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  };

  const openDraft = () => {
    if (draft) return;
    setDraft({ title: "", note: "", date: "", someday: false, projectId: "" });
    setFormMessage(null);
  };

  const saveDraft = async () => {
    if (!draft || !token.trim()) return;
    if (!draft.title.trim()) {
      setFormMessage("title is required");
      return;
    }
    setFormMessage(null);
    const payload: Record<string, unknown> = {
      title: draft.title,
      note: draft.note,
      date: draft.someday ? null : draft.date || null,
      someday: draft.someday,
      areaId,
    };
    if (draft.projectId.trim()) payload.projectId = draft.projectId.trim();
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormMessage(json?.error?.message ?? "Failed to create");
        return;
      }
      setDraft(null);
      fetchArea();
    } catch (err) {
      setFormMessage(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const toggleComplete = async (task: Task) => {
    if (!token.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completedAt: task.completedAt ? null : new Date().toISOString() }),
      });
      fetchArea();
    } catch {
      // ignore
    }
  };

  const archiveCompleted = async () => {
    if (!token.trim() || state.status !== "ready") return;
    const targets = state.tasks.filter((t) => t.completedAt && !t.archivedAt);
    if (targets.length === 0) return;
    for (const task of targets) {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ archivedAt: new Date().toISOString() }),
      });
    }
    fetchArea();
  };

  const handleDelete = async (task: Task) => {
    if (!token.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE", headers });
      fetchArea();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (canFetch) fetchArea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, areaId]);

  const completedCount =
    state.status === "ready"
      ? state.tasks.filter((t) => t.completedAt && !t.archivedAt).length
      : 0;

  return (
    <main className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">Area</p>
          <h1>{state.status === "ready" ? state.item.name : "Area"}</h1>
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
            <button onClick={fetchArea} disabled={!canFetch}>
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
              {state.status === "ready" ? state.tasks.length : state.status === "loading" ? "…" : "-"}
            </span>
          </div>
          <div className="toolbar">
            <button className="tiny" onClick={openDraft}>
              Add task
            </button>
            {completedCount > 0 && (
              <button className="tiny ghost" onClick={archiveCompleted}>
                Logbook へ整理
              </button>
            )}
          </div>
          {draft && (
            <div className="task-row editing">
              <div className="task-main">
                <div className="task-title-row">
                  <span className="checkbox-shell" aria-hidden />
                  <input
                    className="title-input"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Title"
                  />
                </div>
                <textarea
                  className="note-input"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="Note (optional)"
                  rows={3}
                />
                <div className="icon-row">
                  <button className="icon-button" onClick={() => setCalendarOpen(true)}>
                    <CalendarIcon />
                  </button>
                  <button className="icon-button" disabled>
                    <ChecklistIcon />
                  </button>
                </div>
                <div className="form-row">
                  <input
                    value={draft.projectId}
                    onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}
                    placeholder="Project ID (optional)"
                  />
                </div>
                <div className="row-actions">
                  <button className="tiny" onClick={saveDraft}>
                    Save
                  </button>
                  <button className="tiny ghost" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                  {formMessage && <span className="error">{formMessage}</span>}
                </div>
              </div>
            </div>
          )}
          {state.status === "error" && <p className="error">{state.message}</p>}
          {state.status === "loading" && <p className="muted">Loading...</p>}
          {state.status === "idle" && <p className="muted">No data yet.</p>}
          {state.status === "ready" && (
            <div className="task-list">
              {state.tasks.length === 0 && <p className="muted">No tasks</p>}
              {state.tasks.map((item) => (
                <div key={item.id} className={`task-row ${item.completedAt ? "completed" : ""}`}>
                  <div className="task-main">
                    <div className="task-title-row">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(item.completedAt)}
                          onChange={() => toggleComplete(item)}
                        />
                      </label>
                      <div>
                        <div className="task-title">{item.title}</div>
                        {item.note && <div className="task-note">{item.note}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="task-meta">
                    {item.someday && <span className="pill">Someday</span>}
                    {item.date && <span className="pill">{item.date}</span>}
                    {item.completedAt && <span className="pill">Done</span>}
                    <div className="row-actions">
                      <button className="tiny ghost" onClick={() => handleDelete(item)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {calendarOpen && draft && (
        <div className="modal-backdrop" onClick={() => setCalendarOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule</h3>
              <button className="tiny ghost" onClick={() => setCalendarOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <button
                className="modal-button"
                onClick={() => {
                  setDraft({ ...draft, date: today, someday: false });
                  setCalendarOpen(false);
                }}
              >
                <CalendarIcon />
                Today
              </button>
              <button
                className="modal-button"
                onClick={() => {
                  setDraft({ ...draft, date: today, someday: false });
                  setCalendarOpen(false);
                }}
              >
                <MoonIcon />
                This Evening
              </button>
              <label className="modal-input">
                <span>Date</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value, someday: false })}
                />
              </label>
              <button
                className="modal-button ghost"
                onClick={() => {
                  setDraft({ ...draft, date: "", someday: true });
                  setCalendarOpen(false);
                }}
              >
                <SparkIcon />
                Someday
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function ChecklistIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m4 7 2 2 4-4M4 15 6 17 10 13M14 7h6M14 15h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 1 0 11.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
