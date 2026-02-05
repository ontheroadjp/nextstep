"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

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

type Draft = {
  title: string;
  note: string;
  date: string;
  someday: boolean;
  evening: boolean;
};

type Editing = Draft & {
  id: string;
};

type AreaRef = { id: string; name: string };
type ProjectRef = { id: string; name: string; areaId: string | null };

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Task[]; groups?: Array<{ date: string; items: Task[] }> };

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

function useStoredJson<T>(key: string, fallback: T) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return;
    try {
      setValue(JSON.parse(stored) as T);
    } catch {
      // ignore
    }
  }, [key]);
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
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

function getDateLabel(draft: Draft, today: string) {
  if (draft.someday) return "Someday";
  if (!draft.date) return "";
  if (draft.date === today) return "Today";
  return draft.date;
}

function getDraftLabel(draft: Draft, today: string) {
  if (draft.someday) return "Someday";
  if (!draft.date) return "";
  if (draft.date === today) return draft.evening ? "This Evening" : "Today";
  return draft.date;
}

export default function ViewPage() {
  const params = useParams();
  const view = String(params.view ?? "");
  const [token, setToken] = useStoredValue("ns-access-token", "");
  const [tzOffset, setTzOffset] = useStoredValue("ns-tz-offset", DEFAULT_TZ);
  const [eveningMap, setEveningMap] = useStoredJson<Record<string, boolean>>(
    "ns-evening-map",
    {}
  );
  const [state, setState] = useState<ViewState>({ status: "idle" });
  const [areas, setAreas] = useState<AreaRef[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isEditReady, setIsEditReady] = useState(false);
  const [isDraftClosing, setIsDraftClosing] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const draftRowRef = useRef<HTMLDivElement | null>(null);
  const editRowRef = useRef<HTMLDivElement | null>(null);
  const editTitleRef = useRef<HTMLInputElement | null>(null);
  const savingRef = useRef(false);
  const savingEditRef = useRef(false);
  const editTouchedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const canFetch = token.trim().length > 0 && ALLOWED_VIEWS.has(view);
  const isLogbook = view === "logbook";
  const needsGrouping = view === "today" || view === "anytime" || view === "someday";
  const showThisEvening = view === "today";

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

  const fetchView = async (opts?: { silent?: boolean }) => {
    if (!canFetch) return;
    if (!opts?.silent) {
      setState({ status: "loading" });
    }
    try {
      const res = await fetch(`/api/${view}`, { headers });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      const groups = Array.isArray(json.groups) ? json.groups : undefined;
      const items: Task[] = Array.isArray(json.items)
        ? json.items
        : Array.isArray(groups)
          ? groups.flatMap((g: { items?: Task[] }) => g.items ?? [])
          : [];
      setState({ status: "ready", items, groups });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  };

  const fetchMeta = async () => {
    if (!canFetch || !needsGrouping) return;
    try {
      const [areasRes, projectsRes] = await Promise.all([
        fetch("/api/areas", { headers }),
        fetch("/api/projects", { headers }),
      ]);
      const areasJson = await areasRes.json();
      const projectsJson = await projectsRes.json();
      if (areasRes.ok) {
        setAreas(
          Array.isArray(areasJson.items)
            ? areasJson.items.map((item: AreaRef) => ({ id: item.id, name: item.name }))
            : []
        );
      }
      if (projectsRes.ok) {
        setProjects(
          Array.isArray(projectsJson.items)
            ? projectsJson.items.map((item: any) => ({
                id: item.id,
                name: item.name,
                areaId: item.area_id ?? null,
              }))
            : []
        );
      }
    } catch {
      // ignore
    }
  };

  const openDraft = () => {
    if (draft) return;
    setEditing(null);
    setEditMessage(null);
    setIsScheduleOpen(false);
    setIsEditScheduleOpen(false);
    setIsDraftClosing(false);
    let initialDate = "";
    let initialSomeday = false;
    if (view === "today") initialDate = today;
    if (view === "someday") initialSomeday = true;
    setDraft({
      title: "",
      note: "",
      date: initialDate,
      someday: initialSomeday,
      evening: false,
    });
    setFormMessage(null);
  };

  const saveDraft = async () => {
    if (!draft || savingRef.current || !token.trim()) return;
    if (!draft.title.trim()) {
      setFormMessage("title is required");
      return;
    }
    savingRef.current = true;
    setFormMessage(null);
    const payload: Record<string, unknown> = {
      title: draft.title,
      note: draft.note,
      date: draft.someday ? null : draft.date || null,
      someday: draft.someday,
    };
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormMessage(json?.error?.message ?? "Failed to create");
        savingRef.current = false;
        return;
      }
      const newId = json?.item?.id as string | undefined;
      if (newId) {
        setEveningMap((prev) => {
          const next = { ...prev };
          if (draft.evening && draft.date === today && !draft.someday) {
            next[newId] = true;
          } else {
            delete next[newId];
          }
          return next;
        });
      }
      setIsDraftClosing(true);
      window.setTimeout(() => {
        setDraft(null);
        setIsScheduleOpen(false);
        setIsDraftClosing(false);
        savingRef.current = false;
        fetchView({ silent: true });
      }, 280);
    } catch (err) {
      savingRef.current = false;
      setFormMessage(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const startEdit = (task: Task) => {
    if (editing?.id === task.id) return;
    setDraft(null);
    setFormMessage(null);
    editTouchedRef.current = false;
    setIsClosing(false);
    setIsOpening(true);
    setIsEditReady(false);
    setIsScheduleOpen(false);
    setIsEditScheduleOpen(false);
    setEditing({
      id: task.id,
      title: task.title ?? "",
      note: task.note ?? "",
      date: task.date ?? "",
      someday: Boolean(task.someday),
      evening: Boolean(task.date === today && eveningMap[task.id]),
    });
    setEditMessage(null);
  };

  const saveEdit = async (): Promise<boolean> => {
    if (!editing || savingEditRef.current || !token.trim()) return false;
    if (!editTouchedRef.current) return false;
    if (!editing.title.trim()) {
      setEditMessage("title is required");
      return false;
    }
    savingEditRef.current = true;
    setEditMessage(null);
    const payload: Record<string, unknown> = {
      title: editing.title,
      note: editing.note,
      date: editing.someday ? null : editing.date || null,
      someday: editing.someday,
    };
    try {
      const res = await fetch(`/api/tasks/${editing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditMessage(json?.error?.message ?? "Failed to update");
        savingEditRef.current = false;
        return false;
      }
      setEveningMap((prev) => {
        const next = { ...prev };
        if (editing.evening && editing.date === today && !editing.someday) {
          next[editing.id] = true;
        } else {
          delete next[editing.id];
        }
        return next;
      });
      editTouchedRef.current = false;
      savingEditRef.current = false;
      setIsEditScheduleOpen(false);
      fetchView({ silent: true });
      return true;
    } catch (err) {
      savingEditRef.current = false;
      setEditMessage(err instanceof Error ? err.message : "Failed to update");
      return false;
    }
  };

  const handleEditChange = (next: Editing | null) => {
    editTouchedRef.current = true;
    setEditing(next);
  };

  const handleBlurSave = async () => {
    if (!isEditReady) return;
    await saveEdit();
  };

  useEffect(() => {
    if (!isEditReady) return;
    const input = editTitleRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [isEditReady, editing?.id]);

  const commitEditAndClose = async () => {
    if (!editing) return;
    setIsClosing(true);
    if (!editTouchedRef.current) {
      window.setTimeout(() => {
        setEditing(null);
        setIsEditScheduleOpen(false);
        setIsClosing(false);
        setIsEditReady(false);
      }, 400);
      return;
    }
    const ok = await saveEdit();
    if (ok) {
      window.setTimeout(() => {
        setEditing(null);
        setIsEditScheduleOpen(false);
        setIsClosing(false);
        setIsEditReady(false);
      }, 400);
    }
  };


  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const safeBottom = window.innerHeight - 80;
    if (rect.bottom > safeBottom) {
      window.scrollBy({ top: rect.bottom - safeBottom, behavior: "smooth" });
    }
  };

const handleTaskClick = async (task: Task) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (editing) {
      await commitEditAndClose();
      return;
    }
    startEdit(task);
    window.setTimeout(() => {
      setIsOpening(false);
    }, 0);
  };

  const toggleComplete = async (task: Task) => {
    if (!token.trim() || isLogbook) return;
    const nextCompletedAt = task.completedAt ? null : new Date().toISOString();
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === task.id ? { ...item, completedAt: nextCompletedAt } : item
        ),
      };
    });
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completedAt: nextCompletedAt }),
      });
      fetchView({ silent: true });
    } catch {
      fetchView({ silent: true });
    }
  };

  const archiveCompleted = async () => {
    if (!token.trim() || state.status !== "ready") return;
    const targets = state.items.filter((t) => t.completedAt && !t.archivedAt);
    if (targets.length === 0) return;
    for (const task of targets) {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ archivedAt: new Date().toISOString() }),
      });
    }
    fetchView({ silent: true });
  };

  const handleDelete = async (task: Task) => {
    if (!token.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE", headers });
      fetchView({ silent: true });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (canFetch) fetchView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, view]);

  useEffect(() => {
    if (canFetch) fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, view]);

  useEffect(() => {
    if (!draft) return;
    const handleClick = (event: MouseEvent) => {
      if (!draftRowRef.current) return;
      if (draftRowRef.current.contains(event.target as Node)) return;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      void saveDraft();
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [draft, saveDraft]);

  useEffect(() => {
    if (!editing) return;
    const handleClick = (event: MouseEvent) => {
      if (!editRowRef.current) return;
      if (editRowRef.current.contains(event.target as Node)) return;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      void commitEditAndClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editTouchedRef.current]);

  if (!ALLOWED_VIEWS.has(view)) {
    return (
      <main>
        <div className="hero page">
          <div className="panel">
            <h1>Not Found</h1>
            <p className="muted">このカテゴリは存在しません。</p>
            <a className="pill-link" href="/">
              Back
            </a>
          </div>
        </div>
      </main>
    );
  }

  const completedCount =
    state.status === "ready"
      ? state.items.filter((t) => t.completedAt && !t.archivedAt).length
      : 0;

  const groupedCards = useMemo(() => {
    if (state.status !== "ready" || !needsGrouping) return { groups: [], evening: [] as Task[] };
    if (view === "today") {
      const eveningItems = state.items.filter(
        (item) => item.date === today && eveningMap[item.id]
      );
      const rest = state.items.filter((item) => !eveningMap[item.id] || item.date !== today);
      return { groups: buildTaskGroups(rest, projects, areas), evening: eveningItems };
    }
    return { groups: buildTaskGroups(state.items, projects, areas), evening: [] as Task[] };
  }, [state, needsGrouping, projects, areas, view, today, eveningMap]);

  const upcomingGroups = useMemo(() => {
    if (state.status !== "ready") return [];
    if (Array.isArray(state.groups)) return state.groups;
    return groupByDate(state.items);
  }, [state]);

  const logbookGroups = useMemo(() => {
    if (state.status !== "ready") return [];
    const offset = Number(tzOffset);
    return buildLogbookGroups(state.items, today, Number.isFinite(offset) ? offset : 0);
  }, [state, today, tzOffset]);

  return (
    <main>
      <div className="hero page">
        <div>
          <p className="eyebrow">Category</p>
          <h1>{view.toUpperCase()}</h1>
          <p className="lead">詳細UIは後で調整します。今は一覧だけ確認できます。</p>
        </div>
      </div>

      <section className="grid">
        {!isLogbook && completedCount > 0 && (
          <button className="logbook-stack-button" onClick={archiveCompleted}>
            Logbook へ整理
          </button>
        )}
        <div className="view-card full">
          <div className="toolbar" />
          {draft && (
            <div
              className={`task-row editing${isDraftClosing ? " closing" : ""}`}
              ref={draftRowRef}
            >
              <div className="task-main">
                <div className="task-title-row">
                  <span className="checkbox-shell" aria-hidden />
                  <input
                    className="title-input"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Title"
                  onFocus={handleFocus}
                  />
                </div>
                <textarea
                  className="note-input draft-offset"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="Note (optional)"
                  rows={3}
                onFocus={handleFocus}
                />
                <div className="schedule draft-offset">
                    {getDraftLabel(draft, today) ? (
                      <button
                        className="schedule-label-button"
                        onClick={() => setIsScheduleOpen((open) => !open)}
                      >
                      <DateBadge label={getDraftLabel(draft, today)} />
                      </button>
                    ) : (
                      <span />
                    )}
                  <div className="icon-row">
                    {!getDraftLabel(draft, today) && (
                      <button
                        className="icon-button"
                        onClick={() => setIsScheduleOpen((open) => !open)}
                      >
                        <CalendarIcon />
                      </button>
                    )}
                    <button className="icon-button" type="button">
                      <ChecklistIcon />
                    </button>
                  </div>
                </div>
                <div className={`schedule-panel draft-offset ${isScheduleOpen ? "is-open" : ""}`}>
                    <button
                      className="pill ghost"
                      onClick={() => {
                        setDraft({ ...draft, date: today, someday: false, evening: false });
                        setIsScheduleOpen(false);
                      }}
                    >
                      Today
                    </button>
                    <button
                      className="pill ghost"
                      onClick={() => {
                        setDraft({ ...draft, date: today, someday: false, evening: true });
                        setIsScheduleOpen(false);
                      }}
                    >
                      <MoonIcon />
                      This Evening
                    </button>
                    <InlineCalendar
                      selectedDate={draft.someday ? "" : draft.date}
                      today={today}
                      onSelect={(date) => {
                        setDraft({ ...draft, date, someday: false, evening: false });
                        setIsScheduleOpen(false);
                      }}
                    />
                    <button
                      className="pill ghost"
                      onClick={() => {
                        setDraft({ ...draft, date: "", someday: true, evening: false });
                        setIsScheduleOpen(false);
                      }}
                    >
                      <SparkIcon />
                      Someday
                    </button>
                  </div>
                {formMessage && <span className="error">{formMessage}</span>}
              </div>
            </div>
          )}
          {state.status === "error" && <p className="error">{state.message}</p>}
          {state.status === "loading" && <p className="muted">Loading...</p>}
          {state.status === "idle" && <p className="muted">No data yet.</p>}
          {state.status === "ready" && (
            <>
              {needsGrouping && (
                <div className="grouped-grid">
                  {groupedCards.groups.map((group) => (
                    <div key={group.key} className="group-card">
                      {group.title && (
                        <div className="group-header">
                          <div className="group-title">
                            {group.kind === "project" && <ProjectIcon />}
                            {group.kind === "area" && <AreaIcon />}
                            {group.title}
                          </div>
                          {group.href && (
                            <a className="chevron-link" href={group.href} aria-label="Open">
                              <ChevronIcon />
                            </a>
                          )}
                        </div>
                      )}
                      <TaskList
                        items={group.items}
                        editing={editing}
                        isLogbook={isLogbook}
                        today={today}
                        eveningMap={eveningMap}
                        isEditScheduleOpen={isEditScheduleOpen}
                        setIsEditScheduleOpen={setIsEditScheduleOpen}
                        editRowRef={editRowRef}
                        isClosing={isClosing}
                        isOpening={isOpening}
                        isEditReady={isEditReady}
                        setIsEditReady={setIsEditReady}
                        editTitleRef={editTitleRef}
                        onInputFocus={handleFocus}
                        onBlurSave={handleBlurSave}
                        onEdit={handleTaskClick}
                        onEditChange={handleEditChange}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                      />
                    </div>
                  ))}
                  {showThisEvening && (
                    <div className="group-card">
                      <div className="group-header"><div className="group-title">This Evening</div></div>
                      <TaskList
                        items={groupedCards.evening}
                        editing={editing}
                        isLogbook={isLogbook}
                        today={today}
                        eveningMap={eveningMap}
                        isEditScheduleOpen={isEditScheduleOpen}
                        setIsEditScheduleOpen={setIsEditScheduleOpen}
                        editRowRef={editRowRef}
                        isClosing={isClosing}
                        isOpening={isOpening}
                        isEditReady={isEditReady}
                        setIsEditReady={setIsEditReady}
                        editTitleRef={editTitleRef}
                        onInputFocus={handleFocus}
                        onBlurSave={handleBlurSave}
                        onEdit={handleTaskClick}
                        onEditChange={handleEditChange}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                      />
                    </div>
                  )}
                </div>
              )}

              {!needsGrouping && view === "upcoming" && (
                <div className="group-list">
                  {upcomingGroups.length === 0 && <p className="muted">No tasks</p>}
                  {upcomingGroups.map((group) => (
                    <div key={group.date} className="date-group">
                      <div className="date-line">
                        <span>{group.date}</span>
                      </div>
                      <TaskList
                        items={group.items}
                        editing={editing}
                        isLogbook={isLogbook}
                        today={today}
                        eveningMap={eveningMap}
                        isEditScheduleOpen={isEditScheduleOpen}
                        setIsEditScheduleOpen={setIsEditScheduleOpen}
                        editRowRef={editRowRef}
                        isClosing={isClosing}
                        isOpening={isOpening}
                        isEditReady={isEditReady}
                        setIsEditReady={setIsEditReady}
                        editTitleRef={editTitleRef}
                        onInputFocus={handleFocus}
                        onBlurSave={handleBlurSave}
                        onEdit={handleTaskClick}
                        onEditChange={handleEditChange}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!needsGrouping && view === "logbook" && (
                <div className="group-list">
                  {logbookGroups.length === 0 && <p className="muted">No tasks</p>}
                  {logbookGroups.map((group) => (
                    <div key={group.key} className="date-group">
                      <div className="date-line">
                        <span>{group.title}</span>
                      </div>
                      <TaskList
                        items={group.items}
                        editing={editing}
                        isLogbook={isLogbook}
                        today={today}
                        eveningMap={eveningMap}
                        isEditScheduleOpen={isEditScheduleOpen}
                        setIsEditScheduleOpen={setIsEditScheduleOpen}
                        editRowRef={editRowRef}
                        isClosing={isClosing}
                        isOpening={isOpening}
                        isEditReady={isEditReady}
                        setIsEditReady={setIsEditReady}
                        editTitleRef={editTitleRef}
                        onInputFocus={handleFocus}
                        onBlurSave={handleBlurSave}
                        onEdit={startEdit}
                        onEditChange={handleEditChange}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!needsGrouping && view !== "upcoming" && view !== "logbook" && (
                <TaskList
                  items={state.items}
                  editing={editing}
                  isLogbook={isLogbook}
                  today={today}
                  eveningMap={eveningMap}
                  isEditScheduleOpen={isEditScheduleOpen}
                  setIsEditScheduleOpen={setIsEditScheduleOpen}
                  editRowRef={editRowRef}
                  isClosing={isClosing}
                  isOpening={isOpening}
                  isEditReady={isEditReady}
                  setIsEditReady={setIsEditReady}
                  editTitleRef={editTitleRef}
                  onInputFocus={handleFocus}
                  onBlurSave={handleBlurSave}
                  onEdit={handleTaskClick}
                  onEditChange={handleEditChange}
                  onToggleComplete={toggleComplete}
                  onDelete={handleDelete}
                  editMessage={editMessage}
                />
              )}
            </>
          )}
        </div>
        {!isLogbook && (
          <button className="fab-add" onClick={openDraft} aria-label="Add task">
            +
          </button>
        )}
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
            <button onClick={fetchView} disabled={!canFetch}>
              Refresh
            </button>
            {!canFetch && <span className="hint">token を入れると取得できます</span>}
          </div>
        </div>
      </footer>
    </main>
  );
}

type TaskListProps = {
  items: Task[];
  editing: Editing | null;
  isLogbook: boolean;
  today: string;
  eveningMap: Record<string, boolean>;
  isEditScheduleOpen: boolean;
  setIsEditScheduleOpen: (open: boolean) => void;
  editRowRef: React.RefObject<HTMLDivElement>;
  isClosing: boolean;
  isOpening: boolean;
  isEditReady: boolean;
  setIsEditReady: (ready: boolean) => void;
  editTitleRef: React.RefObject<HTMLInputElement>;
  onInputFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlurSave: () => void;
  onEdit: (task: Task) => void;
  onEditChange: (editing: Editing | null) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  editMessage: string | null;
};

function TaskList({
  items,
  editing,
  isLogbook,
  today,
  eveningMap,
  isEditScheduleOpen,
  setIsEditScheduleOpen,
  editRowRef,
  isClosing,
  isOpening,
  isEditReady,
  setIsEditReady,
  editTitleRef,
  onInputFocus,
  onBlurSave,
  onEdit,
  onEditChange,
  onToggleComplete,
  onDelete,
  editMessage,
}: TaskListProps) {
  if (items.length === 0) return <p className="muted">No tasks</p>;
  return (
    <div className="task-list">
      {items.map((item) => {
        const isEditing = editing?.id === item.id;
        if (isEditing && editing) {
          return (
            <div
              key={item.id}
              className={`task-row editing${isOpening ? " opening" : ""}${isClosing ? " closing" : ""}`}
              ref={editRowRef}
              onClick={() => {
                if (!isEditReady && !isClosing) setIsEditReady(true);
              }}
            >
              <div className="task-header">
                <div className="task-main">
                  <div className="task-title-row">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(item.completedAt)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleComplete(item);
                        }}
                        disabled={isLogbook}
                      />
                    </label>
                    <div className="task-title-cell">
                      <input
                        className="title-input"
                        value={editing.title}
                        onChange={(e) => onEditChange({ ...editing, title: e.target.value })}
                        placeholder="Title"
                        onFocus={onInputFocus}
                        onBlur={onBlurSave}
                        readOnly={!isEditReady}
                        data-readonly={!isEditReady ? "true" : undefined}
                        ref={editTitleRef}
                        tabIndex={isEditReady ? 0 : -1}
                      />
                    </div>
                  </div>
                </div>
                <div className="task-meta" />
              </div>
              <div className="task-details">
                <div className="task-details-inner">
                    <textarea
                      className="note-input draft-offset"
                      value={editing.note}
                      onChange={(e) => onEditChange({ ...editing, note: e.target.value })}
                      placeholder="Note (optional)"
                      rows={3}
                      onFocus={onInputFocus}
                      onBlur={onBlurSave}
                      readOnly={!isEditReady}
                      data-readonly={!isEditReady ? "true" : undefined}
                      tabIndex={isEditReady ? 0 : -1}
                    />
                  <div className="schedule draft-offset">
                    {getDraftLabel(editing, today) ? (
                      <button
                        className="schedule-label-button"
                        onClick={() => setIsEditScheduleOpen(!isEditScheduleOpen)}
                      >
                        <DateBadge label={getDraftLabel(editing, today)} />
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="icon-row">
                      {!getDraftLabel(editing, today) && (
                        <button
                          className="icon-button"
                          onClick={() => setIsEditScheduleOpen(!isEditScheduleOpen)}
                        >
                          <CalendarIcon />
                        </button>
                      )}
                      <button className="icon-button" type="button">
                        <ChecklistIcon />
                      </button>
                    </div>
                  </div>
                  <div className={`schedule-panel draft-offset ${isEditScheduleOpen ? "is-open" : ""}`}>
                    <button
                      className="pill ghost"
                      onClick={() => {
                        onEditChange({ ...editing, date: today, someday: false, evening: false });
                        setIsEditScheduleOpen(false);
                      }}
                    >
                      Today
                    </button>
                    <button
                      className="pill ghost"
                      onClick={() => {
                        onEditChange({ ...editing, date: today, someday: false, evening: true });
                        setIsEditScheduleOpen(false);
                      }}
                    >
                      <MoonIcon />
                      This Evening
                    </button>
                    <InlineCalendar
                      selectedDate={editing.someday ? "" : editing.date}
                      today={today}
                      onSelect={(date) => {
                        onEditChange({ ...editing, date, someday: false, evening: false });
                        setIsEditScheduleOpen(false);
                      }}
                    />
                    <button
                      className="pill ghost"
                      onClick={() => {
                        onEditChange({ ...editing, date: "", someday: true, evening: false });
                        setIsEditScheduleOpen(false);
                      }}
                    >
                      <SparkIcon />
                      Someday
                    </button>
                  </div>
                  {editMessage && <span className="error">{editMessage}</span>}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div
            key={item.id}
            className={`task-row clickable ${item.completedAt ? "completed" : ""}`}
            onClick={() => onEdit(item)}
          >
            <div className="task-header">
              <div className="task-main">
                <div className="task-title-row">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(item.completedAt)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleComplete(item);
                      }}
                      disabled={isLogbook}
                    />
                  </label>
                <div>
                  <div className="task-title-cell">
                    <input
                      className="title-input"
                      value={item.title}
                      readOnly
                      data-readonly="true"
                      tabIndex={-1}
                    />
                  </div>
                </div>
                </div>
              </div>
              <div className="task-meta">
                <div className="row-actions" />
              </div>
            </div>
            <div className="task-details">
              <div className="task-details-inner">
                <textarea
                  className="note-input draft-offset"
                  value={item.note ?? ""}
                  placeholder="Note (optional)"
                  rows={3}
                  readOnly
                  data-readonly="true"
                  tabIndex={-1}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTaskDateLabel(task: Task, today: string, eveningMap: Record<string, boolean>) {
  if (task.someday) return "Someday";
  if (!task.date) return "";
  if (task.date === today) return eveningMap[task.id] ? "This Evening" : "Today";
  return task.date;
}

function TaskDateBadge({
  task,
  today,
  eveningMap,
}: {
  task: Task;
  today: string;
  eveningMap: Record<string, boolean>;
}) {
  const label = getTaskDateLabel(task, today, eveningMap);
  if (!label) return null;
  return <DateBadge label={label} />;
}

function buildTaskGroups(items: Task[], projects: ProjectRef[], areas: AreaRef[]) {
  const projectOrder = new Map(projects.map((p, index) => [p.id, index]));
  const areaOrder = new Map(areas.map((a, index) => [a.id, index]));
  const projectGroups = new Map<string, { title: string; items: Task[] }>();
  const areaGroups = new Map<string, { title: string; items: Task[] }>();
  const noGroup: Task[] = [];

  for (const item of items) {
    if (item.projectId) {
      const title = projects.find((p) => p.id === item.projectId)?.name ?? "Project";
      if (!projectGroups.has(item.projectId)) {
        projectGroups.set(item.projectId, { title, items: [] });
      }
      projectGroups.get(item.projectId)?.items.push(item);
      continue;
    }
    if (item.areaId) {
      const title = areas.find((a) => a.id === item.areaId)?.name ?? "Area";
      if (!areaGroups.has(item.areaId)) {
        areaGroups.set(item.areaId, { title, items: [] });
      }
      areaGroups.get(item.areaId)?.items.push(item);
      continue;
    }
    noGroup.push(item);
  }

  const sections: Array<{
    key: string;
    title: string | null;
    items: Task[];
    kind?: "project" | "area";
    href?: string;
  }> = [];
  if (noGroup.length > 0) {
    const sortedNoGroup = [...noGroup].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
    sections.push({ key: "nogroup", title: null, items: sortedNoGroup });
  }

  const sortedProjects = [...projectGroups.entries()].sort(([a], [b]) => {
    const aOrder = projectOrder.get(a);
    const bOrder = projectOrder.get(b);
    if (aOrder === undefined && bOrder === undefined) return 0;
    if (aOrder === undefined) return 1;
    if (bOrder === undefined) return -1;
    return aOrder - bOrder;
  });
  for (const [id, group] of sortedProjects) {
    sections.push({ key: `project-${id}`, title: group.title, items: group.items, kind: "project", href: `/projects/${id}` });
  }

  const sortedAreas = [...areaGroups.entries()].sort(([a], [b]) => {
    const aOrder = areaOrder.get(a);
    const bOrder = areaOrder.get(b);
    if (aOrder === undefined && bOrder === undefined) return 0;
    if (aOrder === undefined) return 1;
    if (bOrder === undefined) return -1;
    return aOrder - bOrder;
  });
  for (const [id, group] of sortedAreas) {
    sections.push({ key: `area-${id}`, title: group.title, items: group.items, kind: "area", href: `/areas/${id}` });
  }

  return sections;
}

function groupByDate(items: Task[]) {
  const byDate = new Map<string, Task[]>();
  for (const item of items) {
    if (!item.date) continue;
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date)?.push(item);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, items: list }));
}

function buildLogbookGroups(items: Task[], today: string, tzOffsetMinutes: number) {
  const todayNum = dateToNumber(today);
  const yesterdayNum = todayNum - 1;
  const weekStartNum = startOfWeekNumber(today);
  const todayParts = parseDateString(today);

  const yesterdayItems: Task[] = [];
  const thisWeekItems: Task[] = [];
  const thisMonthItems: Task[] = [];
  const monthGroups = new Map<number, Task[]>();

  for (const item of items) {
    if (!item.archivedAt) continue;
    const localDate = isoToLocalDate(item.archivedAt, tzOffsetMinutes);
    if (!localDate) continue;
    const num = dateToNumber(localDate);
    const parts = parseDateString(localDate);
    if (!parts) continue;

    if (num === yesterdayNum) {
      yesterdayItems.push(item);
      continue;
    }
    if (num >= weekStartNum && num <= todayNum) {
      thisWeekItems.push(item);
      continue;
    }
    if (todayParts && parts.year === todayParts.year && parts.month === todayParts.month) {
      thisMonthItems.push(item);
      continue;
    }
    const monthKey = parts.year * 12 + parts.month;
    if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
    monthGroups.get(monthKey)?.push(item);
  }

  const result: Array<{ key: string; title: string; items: Task[] }> = [];
  if (yesterdayItems.length > 0) {
    result.push({ key: "yesterday", title: "昨日", items: yesterdayItems });
  }
  if (thisWeekItems.length > 0) {
    result.push({ key: "this-week", title: "今週", items: thisWeekItems });
  }
  if (thisMonthItems.length > 0 && todayParts) {
    result.push({ key: "this-month", title: `${todayParts.month + 1}月`, items: thisMonthItems });
  }

  const sortedMonths = [...monthGroups.entries()].sort(([a], [b]) => b - a);
  for (const [monthKey, list] of sortedMonths) {
    const monthIndex = monthKey % 12;
    result.push({
      key: `month-${monthKey}`,
      title: `${monthIndex + 1}月`,
      items: list,
    });
  }

  return result;
}

function isoToLocalDate(value: string, tzOffsetMinutes: number) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "";
  const local = new Date(ms + tzOffsetMinutes * 60 * 1000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateToNumber(value: string) {
  const parsed = parseDateString(value);
  if (!parsed) return 0;
  return Math.floor(Date.UTC(parsed.year, parsed.month, parsed.day) / 86400000);
}

function startOfWeekNumber(value: string) {
  const parsed = parseDateString(value);
  if (!parsed) return 0;
  const date = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return Math.floor(date.getTime() / 86400000);
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

function DateBadge({ label }: { label: string }) {
  if (label === "Today") {
    return (
      <span className="date-badge date-today">
        <SunIcon />
        Today
      </span>
    );
  }
  if (label === "This Evening") {
    return (
      <span className="date-badge date-evening">
        <MoonIcon />
        This Evening
      </span>
    );
  }
  if (label === "Someday") {
    return (
      <span className="date-badge date-someday">
        <SparkIcon />
        Someday
      </span>
    );
  }
  return <span className="date-badge">{label}</span>;
}

function AreaIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10l8-6 8 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProjectIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h6l2 2h8v8a2 2 0 0 1-2 2H4V7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

type InlineCalendarProps = {
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
};

function InlineCalendar({ selectedDate, today, onSelect }: InlineCalendarProps) {
  const initial = useMemo(() => {
    const base = selectedDate || today;
    const parsed = parseDateString(base);
    return parsed ?? getUtcDateParts(new Date());
  }, [selectedDate, today]);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(initial);

  useEffect(() => {
    const base = selectedDate || today;
    const parsed = parseDateString(base);
    if (parsed) setCursor({ year: parsed.year, month: parsed.month });
  }, [selectedDate, today]);

  const monthLabel = formatMonthLabel(cursor.year, cursor.month);
  const cells = buildMonthGrid(cursor.year, cursor.month);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          className="calendar-nav"
          type="button"
          onClick={() =>
            setCursor((prev) => shiftMonth(prev.year, prev.month, -1))
          }
        >
          ‹
        </button>
        <span className="calendar-title">{monthLabel}</span>
        <button
          className="calendar-nav"
          type="button"
          onClick={() =>
            setCursor((prev) => shiftMonth(prev.year, prev.month, 1))
          }
        >
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell, idx) => {
          if (!cell) return <span key={`empty-${idx}`} />;
          const date = formatDateString(cursor.year, cursor.month, cell);
          const isSelected = selectedDate === date;
          const isToday = today === date;
          return (
            <button
              key={date}
              type="button"
              className={`calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
              onClick={() => onSelect(date)}
            >
              {cell}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parseDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function getUtcDateParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function formatDateString(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function formatMonthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(Date.UTC(year, month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startDay = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
