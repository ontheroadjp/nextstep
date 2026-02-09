"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AccessSettingsFooter } from "../../_components/AccessSettingsFooter";
import { PageHero } from "../../_components/PageHero";
import { PageMidHeader } from "../../_components/PageMidHeader";
import { useClientAuth } from "../../_hooks/useClientAuth";
import { useStoredJson } from "../../_hooks/useStoredState";
import { getScheduleLabel, getTodayString } from "../../_lib/date";
import {
  getOverdueReferenceDate,
  isDateAfterDeadline,
  shouldWarnSomedayWithDeadline,
} from "../../_lib/deadline";
import { formatOverdueDaysAgo } from "../../_lib/overdue";
import { sortMixedByDateAndCreated } from "../../_lib/task_sort";

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
};

type EditFields = {
  title: string;
  note: string;
  date: string;
  deadline: string;
  someday: boolean;
  evening: boolean;
};

type Editing = EditFields & {
  id: string;
};

type ProjectState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      item: { id: string; name: string; note: string | null; areaId: string | null };
      tasks: Task[];
    };

export default function ProjectPage() {
  const params = useParams();
  const projectId = String(params.projectId ?? "");
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
  const [eveningMap, setEveningMap] = useStoredJson<Record<string, boolean>>(
    "ns-evening-map",
    {}
  );
  const [state, setState] = useState<ProjectState>({ status: "idle" });
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"date" | "deadline">("date");
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isEditReady, setIsEditReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const editRowRef = useRef<HTMLDivElement | null>(null);
  const createSavingRef = useRef(false);
  const savingEditRef = useRef(false);
  const editTouchedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const accessReady = accessToken.trim().length > 0;
  const canFetch = accessReady && projectId.length > 0;
  const isLocked = Boolean(editing);

  const today = useMemo(() => {
    const offset = Number(tzOffset);
    return getTodayString(Number.isFinite(offset) ? offset : 0);
  }, [tzOffset]);

  const fetchProject = async (opts?: { silent?: boolean }) => {
    if (!canFetch) return;
    if (!opts?.silent) {
      setState({ status: "loading" });
    }
    try {
      const res = await authedFetch(`/api/projects/${projectId}`, { headers });
      const json = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Request failed" });
        return;
      }
      setState({
        status: "ready",
        item: json.item,
        tasks: json.tasks ?? [],
      });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  };

  const createTaskAndEdit = async () => {
    if (!accessToken.trim() || createSavingRef.current || isLocked) return;
    createSavingRef.current = true;
    setCreateMessage(null);
    const defaultTitle = "新規タスク";
    if (!defaultTitle.trim()) {
      setCreateMessage("タイトルを入力してください");
      createSavingRef.current = false;
      return;
    }
    const payload: Record<string, unknown> = {
      title: defaultTitle,
      note: "",
      date: null,
      someday: false,
      projectId,
    };
    try {
      const res = await authedFetch(
        "/api/tasks",
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setCreateMessage(json?.error?.message ?? "Failed to create");
        createSavingRef.current = false;
        return;
      }
      const item = json?.item as Task | undefined;
      if (!item?.id) {
        setCreateMessage("Failed to create");
        createSavingRef.current = false;
        return;
      }
      setEveningMap((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setState((prev) => {
        if (prev.status !== "ready") {
          return {
            status: "ready",
            item: { id: projectId, name: "", note: null, areaId: null },
            tasks: [item],
          };
        }
        const exists = prev.tasks.some((t) => t.id === item.id);
        return exists ? prev : { ...prev, tasks: [item, ...prev.tasks] };
      });
      startEdit(item);
      fetchProject({ silent: true });
    } catch (err) {
      setCreateMessage(err instanceof Error ? err.message : "Failed to create");
    } finally {
      createSavingRef.current = false;
    }
  };

  const startEdit = (task: Task) => {
    if (editing?.id === task.id) return;
    editTouchedRef.current = false;
    setIsClosing(false);
    setIsOpening(true);
    setIsEditReady(false);
    setIsEditScheduleOpen(false);
    setScheduleMode("date");
    setEditing({
      id: task.id,
      title: task.title ?? "",
      note: task.note ?? "",
      date: task.date ?? "",
      deadline: task.deadline ?? "",
      someday: Boolean(task.someday),
      evening: Boolean(task.date === today && eveningMap[task.id]),
    });
    setEditMessage(null);
  };

  const saveEdit = async (): Promise<boolean> => {
    if (!editing || savingEditRef.current || !accessToken.trim()) return false;
    if (!editTouchedRef.current) return false;
    if (!editing.title.trim()) {
      setEditMessage("タイトルを入力してください");
      return false;
    }
    savingEditRef.current = true;
    setEditMessage(null);
    const payload: Record<string, unknown> = {
      title: editing.title,
      note: editing.note,
      date: editing.someday ? null : editing.date || null,
      deadline: editing.someday ? null : editing.deadline || null,
      someday: editing.someday,
    };
    try {
      const res = await authedFetch(
        `/api/tasks/${editing.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        }
      );
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
      fetchProject({ silent: true });
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

  const handleScheduleChange = (next: Partial<Editing>) => {
    if (!editing) return;
    let candidate: Editing = { ...editing, ...next };

    if (candidate.someday) {
      if (shouldWarnSomedayWithDeadline(editing.deadline, true)) {
        const proceed = window.confirm(
          "This task has a deadline. Move to Someday and clear deadline?"
        );
        if (!proceed) {
          setEditMessage("Someday化を中止しました。deadlineを維持する場合は日付設定を続けてください。");
          return;
        }
      }
      candidate = { ...candidate, date: "", deadline: "", someday: true, evening: false };
    }

    if (!candidate.someday && isDateAfterDeadline(candidate.date, candidate.deadline)) {
      const clearDeadline = window.confirm(
        "date is after deadline. OK to clear deadline and continue, Cancel to keep deadline and re-set."
      );
      if (!clearDeadline) {
        setEditMessage("date と deadline の前後関係を見直してください。");
        return;
      }
      candidate = { ...candidate, deadline: "" };
    }

    setEditMessage(null);
    handleEditChange(candidate);
  };

  const commitEditAndClose = async () => {
    if (!editing) return;
    setIsClosing(true);
    if (!editTouchedRef.current) {
      window.setTimeout(() => {
        setEditing(null);
        setIsEditScheduleOpen(false);
        setScheduleMode("date");
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
        setScheduleMode("date");
        setIsClosing(false);
        setIsEditReady(false);
      }, 400);
    }
  };

  const toggleDateSchedulePanel = () => {
    setScheduleMode("date");
    setIsEditScheduleOpen((prev) => (scheduleMode === "date" ? !prev : true));
  };

  const toggleDeadlineSchedulePanel = () => {
    setScheduleMode("deadline");
    setIsEditScheduleOpen((prev) => (scheduleMode === "deadline" ? !prev : true));
  };

  
  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const safeBottom = window.innerHeight - 80;
    if (rect.bottom > safeBottom) {
      window.scrollBy({ top: rect.bottom - safeBottom, behavior: "smooth" });
    }
  };

  const getScrollContainer = (node: HTMLElement | null): HTMLElement | Window => {
    let current = node?.parentElement ?? null;
    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        current.scrollHeight > current.clientHeight
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return window;
  };

  const ensureCardVisible = (extraPadding = 24) => {
    const row = editRowRef.current;
    if (!row) return;
    const container = getScrollContainer(row);
    const rect = row.getBoundingClientRect();
    const containerBottom =
      container === window ? window.innerHeight : (container as HTMLElement).getBoundingClientRect().bottom;
    const safeBottom = containerBottom - extraPadding;
    if (rect.bottom <= safeBottom) return;
    const delta = rect.bottom - safeBottom;
    if (container === window) {
      window.scrollBy({ top: delta, behavior: "smooth" });
    } else {
      (container as HTMLElement).scrollBy({ top: delta, behavior: "smooth" });
    }
  };

  const scheduleEnsureCardVisible = (extraPadding = 24, duration = 420) => {
    if (!editing) return;
    const start = performance.now();
    const tick = (now: number) => {
      ensureCardVisible(extraPadding);
      if (now - start < duration) {
        window.requestAnimationFrame(tick);
      }
    };
    window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!editing) return;
    scheduleEnsureCardVisible(24, 420);
  }, [editing?.id]);

  useEffect(() => {
    if (!isEditScheduleOpen || !editing) return;
    scheduleEnsureCardVisible(32, 520);
  }, [isEditScheduleOpen, editing?.id]);

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
    if (!accessToken.trim()) return;
    const nextCompletedAt = task.completedAt ? null : new Date().toISOString();
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((item) =>
          item.id === task.id ? { ...item, completedAt: nextCompletedAt } : item
        ),
      };
    });
    try {
      await authedFetch(
        `/api/tasks/${task.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ completedAt: nextCompletedAt }),
        }
      );
      fetchProject({ silent: true });
    } catch {
      fetchProject({ silent: true });
    }
  };

  const archiveCompleted = async () => {
    if (!accessToken.trim() || state.status !== "ready") return;
    const targets = state.tasks.filter((t) => t.completedAt && !t.archivedAt);
    if (targets.length === 0) return;
    for (const task of targets) {
      await authedFetch(
        `/api/tasks/${task.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ archivedAt: new Date().toISOString() }),
        }
      );
    }
    fetchProject();
  };

  const handleDelete = async (task: Task) => {
    if (!accessToken.trim()) return;
    try {
      await authedFetch(
        `/api/tasks/${task.id}`,
        { method: "DELETE", headers }
      );
      fetchProject();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (canFetch) fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, projectId]);

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

  const completedCount =
    state.status === "ready"
      ? state.tasks.filter((t) => t.completedAt && !t.archivedAt).length
      : 0;
  const pageTitle = state.status === "ready" ? state.item.name : "Project";

  const handleLogin = async () => {
    const ok = await login(loginEmail, loginPassword);
    if (ok) {
      setLoginPassword("");
      fetchProject();
    }
  };

  return (
    <main>
      <PageHero
        eyebrow="Project"
        title={pageTitle}
        lead="詳細UIは後で調整します。今は一覧だけ確認できます。"
      />

      <PageMidHeader title={pageTitle} />

      <section className="grid">
        {completedCount > 0 && (
          <button className="logbook-stack-button" onClick={archiveCompleted}>
            Logbook へ整理
          </button>
        )}
        <div className="view-card full">
          <div className="toolbar" />
          {createMessage && <p className="error">{createMessage}</p>}
          {state.status === "error" && <p className="error">{state.message}</p>}
          {state.status === "loading" && <p className="muted">Loading...</p>}
          {state.status === "idle" && <p className="muted">No data yet.</p>}
          {state.status === "ready" && (
            <TaskList
              items={sortMixedByDateAndCreated(state.tasks)}
              editing={editing}
              isLocked={isLocked}
              today={today}
              scheduleMode={scheduleMode}
              eveningMap={eveningMap}
              isEditScheduleOpen={isEditScheduleOpen}
              setIsEditScheduleOpen={setIsEditScheduleOpen}
              editRowRef={editRowRef}
              isClosing={isClosing}
              isOpening={isOpening}
              isEditReady={isEditReady}
              setIsEditReady={setIsEditReady}
              onInputFocus={handleFocus}
              onEdit={handleTaskClick}
              onEditChange={handleEditChange}
              onScheduleChange={handleScheduleChange}
              onToggleDateSchedulePanel={toggleDateSchedulePanel}
              onToggleDeadlineSchedulePanel={toggleDeadlineSchedulePanel}
              onToggleComplete={toggleComplete}
              onDelete={handleDelete}
              editMessage={editMessage}
            />
          )}
        </div>
        <button
          className="fab-add"
          onClick={createTaskAndEdit}
          aria-label="Add task"
          disabled={!canFetch || isLocked}
        >
          +
        </button>
      </section>
      <AccessSettingsFooter
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
        onRefresh={fetchProject}
        canFetch={canFetch}
      />
    </main>
  );
}

type TaskListProps = {
  items: Task[];
  editing: Editing | null;
  isLocked: boolean;
  today: string;
  scheduleMode: "date" | "deadline";
  eveningMap: Record<string, boolean>;
  isEditScheduleOpen: boolean;
  setIsEditScheduleOpen: (open: boolean) => void;
  editRowRef: React.RefObject<HTMLDivElement | null>;
  isClosing: boolean;
  isOpening: boolean;
  isEditReady: boolean;
  setIsEditReady: (ready: boolean) => void;
  onInputFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onEdit: (task: Task) => void;
  onEditChange: (editing: Editing | null) => void;
  onScheduleChange: (next: Partial<Editing>) => void;
  onToggleDateSchedulePanel: () => void;
  onToggleDeadlineSchedulePanel: () => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  editMessage: string | null;
};

function TaskList({
  items,
  editing,
  isLocked,
  today,
  scheduleMode,
  eveningMap,
  isEditScheduleOpen,
  setIsEditScheduleOpen,
  editRowRef,
  isClosing,
  isOpening,
  isEditReady,
  setIsEditReady,
  onInputFocus,
  onEdit,
  onEditChange,
  onScheduleChange,
  onToggleDateSchedulePanel,
  onToggleDeadlineSchedulePanel,
  onToggleComplete,
  onDelete,
  editMessage,
}: TaskListProps) {
  if (items.length === 0) return <p className="muted">No tasks</p>;
  return (
    <div className="task-list">
      {items.map((item) => {
        const isEditing = editing?.id === item.id;
        const isDisabled = isLocked && !isEditing;
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
                      />
                    </label>
                    {isEditReady ? (
                      <input
                        className="title-input"
                        value={editing.title}
                        onChange={(e) => onEditChange({ ...editing, title: e.target.value })}
                        placeholder="Title"
                        onFocus={onInputFocus}
                      />
                    ) : (
                      <div className="task-title">{editing.title || "Title"}</div>
                    )}
                  </div>
                  {item.note && <div className="task-note placeholder">{item.note}</div>}
                </div>
                <div className="task-meta" />
              </div>
              <div className="task-details">
                <div className="task-details-inner">
                  {isEditReady ? (
                      <textarea
                        className="note-input draft-offset"
                        value={editing.note}
                        onChange={(e) => onEditChange({ ...editing, note: e.target.value })}
                        placeholder="Note (optional)"
                        rows={3}
                        onFocus={onInputFocus}
                      />
                  ) : (
                    <div className="task-note draft-offset">
                      {editing.note || "Note (optional)"}
                    </div>
                  )}
                  <div className="schedule draft-offset">
                    {getScheduleLabel(editing, today) ? (
                      <button
                        className="schedule-label-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleDateSchedulePanel();
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <DateBadge
                          label={getScheduleLabel(editing, today)}
                          today={today}
                        />
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="icon-row">
                      {!getScheduleLabel(editing, today) && (
                        <button
                          className="icon-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleDateSchedulePanel();
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <i className="fa-solid fa-calendar icon-upcoming" aria-hidden />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleDeadlineSchedulePanel();
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        disabled={editing.someday}
                      >
                        <i className="fa-solid fa-flag icon-upcoming" aria-hidden />
                      </button>
                      <button className="icon-button" type="button">
                        <i className="fa-solid fa-list-check" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {editing.deadline && !editing.someday ? (
                    <div className="deadline-meta draft-offset">
                      <span className="date-badge">
                        <i className="fa-solid fa-flag icon-upcoming" aria-hidden />
                        Deadline {editing.deadline}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={`schedule-panel draft-offset ${isEditScheduleOpen ? "is-open" : ""}`}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {scheduleMode === "date" ? (
                      <>
                        <button
                          className="pill ghost"
                          onClick={() => {
                            onScheduleChange({
                              date: today,
                              someday: false,
                              evening: false,
                            });
                            setIsEditScheduleOpen(false);
                          }}
                        >
                          Today
                        </button>
                        <button
                          className="pill ghost"
                          onClick={() => {
                            onScheduleChange({
                              date: today,
                              someday: false,
                              evening: true,
                            });
                            setIsEditScheduleOpen(false);
                          }}
                        >
                          <i className="fa-solid fa-moon" aria-hidden />
                          This Evening
                        </button>
                        <InlineCalendar
                          selectedDate={editing.someday ? "" : editing.date}
                          today={today}
                          onSelect={(date) => {
                            onScheduleChange({
                              date,
                              someday: false,
                              evening: false,
                            });
                            setIsEditScheduleOpen(false);
                          }}
                        />
                        <button
                          className="pill ghost full-width"
                          onClick={() => {
                            onScheduleChange({ date: "", someday: true, evening: false });
                            setIsEditScheduleOpen(false);
                          }}
                        >
                          <i className="fa-solid fa-archive icon-someday" aria-hidden />
                          Someday
                        </button>
                        <button
                          className="pill ghost clear-date"
                          onClick={() => {
                            onScheduleChange({ date: "", someday: false, evening: false });
                            setIsEditScheduleOpen(false);
                          }}
                        >
                          Clear
                        </button>
                      </>
                    ) : (
                      <>
                        <InlineCalendar
                          selectedDate={editing.deadline}
                          today={today}
                          onSelect={(deadline) => {
                            onScheduleChange({
                              deadline,
                              someday: false,
                              evening: false,
                            });
                            setIsEditScheduleOpen(false);
                          }}
                        />
                        <button
                          className="pill ghost clear-date"
                          onClick={() => {
                            onScheduleChange({ deadline: "" });
                            setIsEditScheduleOpen(false);
                          }}
                        >
                          Clear
                        </button>
                      </>
                    )}
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
            className={`task-row clickable ${item.completedAt ? "completed" : ""}${isDisabled ? " is-disabled" : ""}`}
            aria-disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;
              onEdit(item);
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
                      disabled={isDisabled}
                    />
                  </label>
                <div>
                  <div className="task-title">{item.title}</div>
                </div>
                </div>
              </div>
              <div className="task-meta">
                {(() => {
                  const refDate = getOverdueReferenceDate(item.date, item.deadline);
                  if (!refDate || !isDateBefore(refDate, today)) return null;
                  return (
                    <TaskDateBadge
                      task={item}
                      today={today}
                      eveningMap={eveningMap}
                      referenceDate={refDate}
                    />
                  );
                })()}
                <div className="row-actions" />
              </div>
            </div>
            <div className="task-details">
              <div className="task-details-inner" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTaskDateLabel(
  task: Task,
  today: string,
  eveningMap: Record<string, boolean>,
  referenceDate?: string
) {
  if (referenceDate) return referenceDate;
  if (task.someday) return "Someday";
  if (!task.date) return "";
  if (task.date === today) return eveningMap[task.id] ? "This Evening" : "Today";
  return task.date;
}

function TaskDateBadge({
  task,
  today,
  eveningMap,
  referenceDate,
}: {
  task: Task;
  today: string;
  eveningMap: Record<string, boolean>;
  referenceDate?: string;
}) {
  const label = getTaskDateLabel(task, today, eveningMap, referenceDate);
  if (!label) return null;
  return <DateBadge label={label} today={today} />;
}

function DateBadge({ label, today }: { label: string; today: string }) {
  if (label === "Today") {
    return (
      <span className="date-badge date-today">
        <i className="fa-solid fa-star icon-today" aria-hidden />
        Today
      </span>
    );
  }
  if (label === "This Evening") {
    return (
      <span className="date-badge date-evening">
        <i className="fa-solid fa-moon date-evening" aria-hidden />
        This Evening
      </span>
    );
  }
  if (label === "Someday") {
    return (
      <span className="date-badge date-someday">
        <i className="fa-solid fa-archive icon-someday" aria-hidden />
        Someday
      </span>
    );
  }
  const formatted = formatRelativeDateLabel(label, today);
  if (!formatted) return null;
  const isOverdue = formatted.isPast;
  return (
    <span className={`date-badge${isOverdue ? " date-overdue" : ""}`}>
      <i
        className={`fa-solid ${isOverdue ? "fa-flag" : "fa-calendar"} ${isOverdue ? "date-overdue" : "icon-upcoming"}`}
        aria-hidden
      />
      {formatted.text}
    </span>
  );
}

type InlineCalendarProps = {
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
};

function InlineCalendar({ selectedDate, today, onSelect }: InlineCalendarProps) {
  const initial = useMemo(() => {
    const parsed = parseDateString(today);
    return parsed ?? getUtcDateParts(new Date());
  }, [today]);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(initial);

  useEffect(() => {
    const parsed = parseDateString(today);
    if (parsed) setCursor({ year: parsed.year, month: parsed.month });
  }, [today]);

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
          const isPast = isDateBefore(date, today);
          if (isPast) return <span key={date} />;
          return (
            <button
              key={date}
              type="button"
              className={`calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${isPast ? " is-disabled" : ""}`}
              onClick={() => {
                if (isPast) return;
                onSelect(date);
              }}
            >
              {isToday ? (
                <span className="today-icon">
                  <i className="fa-solid fa-star icon-today" aria-hidden />
                </span>
              ) : (
                cell
              )}
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

function formatRelativeDateLabel(date: string, today: string) {
  const target = parseDateString(date);
  const base = parseDateString(today);
  if (!target || !base) return null;
  const diff = dateToNumber(date) - dateToNumber(today);
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const weekday = formatter.format(new Date(Date.UTC(target.year, target.month, target.day)));
  if (diff === 1) return { text: "Tomorrow", isPast: false };
  if (diff >= 2 && diff <= 5) return { text: weekday, isPast: false };
  if (diff >= 6) {
    const month = target.month + 1;
    return { text: `${month}/${target.day}(${weekday})`, isPast: false };
  }
  const overdueText = formatOverdueDaysAgo(date, today);
  return { text: overdueText ?? `${target.month + 1}/${target.day}(${weekday})`, isPast: true };
}

function dateToNumber(value: string) {
  const parsed = parseDateString(value);
  if (!parsed) return 0;
  return Math.floor(Date.UTC(parsed.year, parsed.month, parsed.day) / 86400000);
}

function isDateBefore(value: string, today: string) {
  return dateToNumber(value) < dateToNumber(today);
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
