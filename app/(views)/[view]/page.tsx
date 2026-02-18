"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AccessSettingsFooter } from "../../_components/AccessSettingsFooter";
import { CategoryCard } from "../../_components/CategoryCard";
import { LocaleSwitcher } from "../../_components/LocaleSwitcher";
import { PageHero } from "../../_components/PageHero";
import { PageMidHeader } from "../../_components/PageMidHeader";
import { useClientAuth } from "../../_hooks/useClientAuth";
import { useLocale } from "../../_hooks/useLocale";
import { useStoredJson } from "../../_hooks/useStoredState";
import { getScheduleLabel, getTodayString } from "../../_lib/date";
import {
  getOverdueReferenceDate,
  isDateAfterDeadline,
  shouldWarnSomedayWithDeadline,
} from "../../_lib/deadline";
import { formatOverdueDaysAgo } from "../../_lib/overdue";
import { sortDatedByDateAscThenCreatedDesc, sortMixedByDateAndCreated } from "../../_lib/task_sort";
import { buildUpcomingSections, type UpcomingSection } from "../../_lib/upcoming_sections";
import { t, viewName, type AppLocale } from "../../_lib/i18n";

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

type AreaRef = { id: string; name: string };
type ProjectRef = { id: string; name: string; areaId: string | null };
type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Task[]; groups?: Array<{ date: string; items: Task[] }> };

const ALLOWED_VIEWS = new Set(["today", "upcoming", "anytime", "someday", "logbook", "inbox"]);

export default function ViewPage() {
  const { locale, setLocale } = useLocale();
  const params = useParams();
  const view = String(params.view ?? "");
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
  const [state, setState] = useState<ViewState>({ status: "idle" });
  const [areas, setAreas] = useState<AreaRef[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"date" | "deadline">("date");
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isEditReady, setIsEditReady] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const editRowRef = useRef<HTMLDivElement | null>(null);
  const editTitleRef = useRef<HTMLInputElement | null>(null);
  const editNoteRef = useRef<HTMLTextAreaElement | null>(null);
  const metaCacheRef = useRef<{ token: string; loaded: boolean }>({ token: "", loaded: false });
  const lastFocusRef = useRef<"title" | "note">("title");
  const createSavingRef = useRef(false);
  const savingEditRef = useRef(false);
  const editTouchedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const editingRef = useRef<Editing | null>(null);
  const queuedEditRef = useRef<Editing | null>(null);
  const debounceSaveTimerRef = useRef<number | null>(null);

  const accessReady = accessToken.trim().length > 0;
  const canFetch = accessReady && ALLOWED_VIEWS.has(view);
  const isLogbook = view === "logbook";
  const needsGrouping = view === "today" || view === "anytime" || view === "someday";
  const showThisEvening = view === "today";
  const isLocked = Boolean(editing);

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
      const res = await authedFetch(`/api/${view}`, { headers });
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

  const fetchMeta = async (opts?: { force?: boolean }) => {
    if (!canFetch || !needsGrouping) return;
    const currentToken = accessToken.trim();
    if (
      !opts?.force &&
      metaCacheRef.current.loaded &&
      metaCacheRef.current.token === currentToken
    ) {
      return;
    }
    try {
      const [areasRes, projectsRes] = await Promise.all([
        authedFetch("/api/areas", { headers }),
        authedFetch("/api/projects", { headers }),
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
      if (areasRes.ok && projectsRes.ok) {
        metaCacheRef.current = { token: currentToken, loaded: true };
      }
    } catch {
      // ignore
    }
  };

  const createTaskAndEdit = async () => {
    if (!accessToken.trim() || createSavingRef.current || isLocked) return;
    createSavingRef.current = true;
    setCreateMessage(null);
    let initialDate = "";
    let initialSomeday = false;
    if (view === "today") initialDate = today;
    if (view === "someday") initialSomeday = true;
    const defaultTitle = t(locale, "new_task");
    if (!defaultTitle.trim()) {
      setCreateMessage(t(locale, "input_title_required"));
      createSavingRef.current = false;
      return;
    }
    const payload: Record<string, unknown> = {
      title: defaultTitle,
      note: "",
      date: initialSomeday ? null : initialDate || null,
      someday: initialSomeday,
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
        if (initialDate === today && !initialSomeday) {
          next[item.id] = false;
        } else {
          delete next[item.id];
        }
        return next;
      });
      setState((prev) => {
        if (prev.status !== "ready") {
          return { status: "ready", items: [item] };
        }
        const exists = prev.items.some((t) => t.id === item.id);
        return exists ? prev : { ...prev, items: [item, ...prev.items] };
      });
      startEdit(item);
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

  const sameEditing = (a: Editing, b: Editing) =>
    a.id === b.id &&
    a.title === b.title &&
    a.note === b.note &&
    a.date === b.date &&
    a.deadline === b.deadline &&
    a.someday === b.someday &&
    a.evening === b.evening;

  const saveEdit = async (candidate?: Editing): Promise<boolean> => {
    const target = candidate ?? editingRef.current;
    if (!target || !accessToken.trim()) return false;
    if (!candidate && !editTouchedRef.current) return false;
    if (savingEditRef.current) {
      queuedEditRef.current = target;
      return false;
    }
    if (!target.title.trim()) {
      setEditMessage(t(locale, "input_title_required"));
      return false;
    }
    savingEditRef.current = true;
    setEditMessage(null);
    const payload: Record<string, unknown> = {
      title: target.title,
      note: target.note,
      date: target.someday ? null : target.date || null,
      deadline: target.someday ? null : target.deadline || null,
      someday: target.someday,
    };
    try {
      const res = await authedFetch(
        `/api/tasks/${target.id}`,
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
      const updated = json?.item as Task | undefined;
      setEveningMap((prev) => {
        const next = { ...prev };
        if (target.evening && target.date === today && !target.someday) {
          next[target.id] = true;
        } else {
          delete next[target.id];
        }
        return next;
      });
      if (updated?.id) {
        setState((prev) => {
          if (prev.status !== "ready") return prev;
          return {
            ...prev,
            items: prev.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
          };
        });
      }
      const latest = editingRef.current;
      if (!latest || sameEditing(target, latest)) {
        editTouchedRef.current = false;
      } else {
        queuedEditRef.current = latest;
      }
      savingEditRef.current = false;
      setIsEditScheduleOpen(false);
      const queued = queuedEditRef.current;
      queuedEditRef.current = null;
      if (queued && (!latest || !sameEditing(queued, latest) || editTouchedRef.current)) {
        void saveEdit(queued);
      }
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
          t(locale, "confirm_someday_with_deadline")
        );
        if (!proceed) {
          setEditMessage(t(locale, "cancel_someday_with_deadline"));
          return;
        }
      }
      candidate = { ...candidate, date: "", deadline: "", someday: true, evening: false };
    }

    if (!candidate.someday && isDateAfterDeadline(candidate.date, candidate.deadline)) {
      const clearDeadline = window.confirm(
        t(locale, "confirm_date_after_deadline")
      );
      if (!clearDeadline) {
        setEditMessage(t(locale, "date_deadline_invalid"));
        return;
      }
      candidate = { ...candidate, deadline: "" };
    }

    setEditMessage(null);
    handleEditChange(candidate);
  };

  const handleFocusTarget = (target: "title" | "note") => {
    lastFocusRef.current = target;
  };

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    if (!editing || !isEditReady || !editTouchedRef.current) return;
    if (debounceSaveTimerRef.current) {
      window.clearTimeout(debounceSaveTimerRef.current);
    }
    debounceSaveTimerRef.current = window.setTimeout(() => {
      const latest = editingRef.current;
      if (!latest || !editTouchedRef.current) return;
      void saveEdit(latest);
    }, 500);
    return () => {
      if (debounceSaveTimerRef.current) {
        window.clearTimeout(debounceSaveTimerRef.current);
        debounceSaveTimerRef.current = null;
      }
    };
  }, [editing, isEditReady]);

  const toggleDateSchedulePanel = () => {
    setScheduleMode("date");
    setIsEditScheduleOpen((prev) => (scheduleMode === "date" ? !prev : true));
  };

  const toggleDeadlineSchedulePanel = () => {
    setScheduleMode("deadline");
    setIsEditScheduleOpen((prev) => (scheduleMode === "deadline" ? !prev : true));
  };

  useEffect(() => {
    if (!isEditReady) return;
    const target =
      lastFocusRef.current === "note" ? editNoteRef.current : editTitleRef.current;
    if (!target) return;
    target.focus();
  }, [isEditReady, editing?.id]);

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
    if (!accessToken.trim() || isLogbook) return;
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
      await authedFetch(
        `/api/tasks/${task.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ completedAt: nextCompletedAt }),
        }
      );
      fetchView({ silent: true });
    } catch {
      fetchView({ silent: true });
    }
  };

  const archiveCompleted = async () => {
    if (!accessToken.trim() || state.status !== "ready") return;
    const targets = state.items.filter((t) => t.completedAt && !t.archivedAt);
    if (targets.length === 0) return;
    try {
      const res = await authedFetch(
        "/api/tasks/archive-completed",
        {
          method: "POST",
          headers,
        }
      );
      if (!res.ok) {
        fetchView({ silent: true });
        return;
      }
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => !(item.completedAt && !item.archivedAt)),
        };
      });
    } catch {
      fetchView({ silent: true });
    }
  };

  const handleDelete = async (task: Task) => {
    if (!accessToken.trim()) return;
    try {
      await authedFetch(
        `/api/tasks/${task.id}`,
        { method: "DELETE", headers }
      );
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
    metaCacheRef.current = { token: accessToken.trim(), loaded: false };
    setAreas([]);
    setProjects([]);
  }, [accessToken]);

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
            <h1>{t(locale, "not_found")}</h1>
            <p className="muted">{t(locale, "category_not_found")}</p>
            <Link className="pill-link" href="/top">
              {t(locale, "back")}
            </Link>
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
      return {
        groups: buildTaskGroups(rest, projects, areas, locale),
        evening: sortDatedByDateAscThenCreatedDesc(eveningItems),
      };
    }
  return { groups: buildTaskGroups(state.items, projects, areas, locale), evening: [] as Task[] };
  }, [state, needsGrouping, projects, areas, view, today, eveningMap, locale]);

  const mixedSortedItems = useMemo(() => {
    if (state.status !== "ready" || needsGrouping || view === "upcoming" || view === "logbook") return [];
    return sortMixedByDateAndCreated(state.items);
  }, [state, needsGrouping, view]);

  const upcomingSections = useMemo(() => {
    if (state.status !== "ready") return [];
    return buildUpcomingSections(state.items, today, locale);
  }, [state, today, locale]);

  const logbookGroups = useMemo(() => {
    if (state.status !== "ready") return [];
    const offset = Number(tzOffset);
    return buildLogbookGroups(
      state.items,
      today,
      Number.isFinite(offset) ? offset : 0,
      locale
    );
  }, [state, today, tzOffset, locale]);
  const headerCounts = state.status === "ready" ? splitOverdue(state.items, today) : { overdue: 0, rest: 0 };
  const headerCard = useMemo(() => {
    if (view === "today") {
      return {
        title: t(locale, "today"),
        status: state.status,
        detail: `${t(locale, "overdue")} ${headerCounts.overdue} / ${t(locale, "today")} ${headerCounts.rest}`,
        showDetail: state.status === "ready",
        icon: <i className="fa-solid fa-star icon-today" aria-hidden />,
      };
    }
    if (view === "upcoming") {
      return {
        title: t(locale, "view_upcoming"),
        status: state.status,
        icon: <i className="fa-solid fa-calendar icon-upcoming" aria-hidden />,
      };
    }
    if (view === "anytime") {
      return {
        title: t(locale, "view_anytime"),
        status: state.status,
        icon: <i className="fa-brands fa-stack-overflow icon-anytime" aria-hidden />,
      };
    }
    if (view === "someday") {
      return {
        title: t(locale, "someday"),
        status: state.status,
        icon: <i className="fa-solid fa-archive icon-someday" aria-hidden />,
      };
    }
    if (view === "logbook") {
      return {
        title: t(locale, "view_logbook"),
        status: state.status,
        icon: <i className="fa-solid fa-book icon-logbook" aria-hidden />,
      };
    }
    return {
      title: t(locale, "view_inbox"),
      status: state.status,
      detail: `${t(locale, "overdue")} ${headerCounts.overdue} / ${t(locale, "others")} ${headerCounts.rest}`,
      showDetail: state.status === "ready",
      icon: <i className="fa-solid fa-inbox icon-inbox" aria-hidden />,
    };
  }, [locale, view, state.status, headerCounts.overdue, headerCounts.rest]);
  const pageTitle = viewName(locale, view);

  const handleLogin = async () => {
    const ok = await login(loginEmail, loginPassword);
    if (ok) {
      setLoginPassword("");
      fetchView();
      fetchMeta({ force: true });
    }
  };

  return (
    <main>
      <PageHero
        eyebrow={t(locale, "view_category")}
        title={pageTitle}
        lead={t(locale, "view_detail_lead")}
        rightSlot={<LocaleSwitcher locale={locale} setLocale={setLocale} />}
      />

      <PageMidHeader title={pageTitle} />

      <section className="grid view-switcher-grid">
        <CategoryCard
          locale={locale}
          title={headerCard.title}
          status={headerCard.status}
          detail={headerCard.detail}
          showDetail={headerCard.showDetail}
          icon={headerCard.icon}
        />
      </section>

      <section className="grid">
        {!isLogbook && completedCount > 0 && (
          <button className="logbook-stack-button" onClick={archiveCompleted}>
            {t(locale, "sort_to_logbook")}
          </button>
        )}
        <div className="view-card full">
          <div className="toolbar" />
          {createMessage && <p className="error">{createMessage}</p>}
          {state.status === "error" && <p className="error">{state.message}</p>}
          {state.status === "loading" && <p className="muted">{t(locale, "loading")}</p>}
          {state.status === "idle" && <p className="muted">{t(locale, "no_data_yet")}</p>}
          {state.status === "ready" && (
            <>
              {needsGrouping && (
                <div className="grouped-grid">
                  {groupedCards.groups.map((group) => (
                    <div
                      key={group.key}
                      className={`group-card${group.key === "nogroup" ? " no-group-card" : ""}`}
                    >
                      {group.title && (
                        <div className={`group-header${isLocked ? " is-disabled" : ""}`}>
                          {group.href ? (
                            isLocked ? (
                              <span className="group-header-link" aria-disabled="true">
                                <div className="group-title">
                                  {group.kind === "project" && (
                                    <i className="fa-solid fa-tachometer icon-project" aria-hidden />
                                  )}
                                  {group.kind === "area" && (
                                    <i className="fa-solid fa-cube icon-area" aria-hidden />
                                  )}
                                  {group.title}
                                </div>
                                <span className="chevron-link" aria-hidden="true">
                                  <i className="fa-solid fa-chevron-right" aria-hidden />
                                </span>
                              </span>
                            ) : (
                              <Link className="group-header-link" href={group.href}>
                                <div className="group-title">
                                  {group.kind === "project" && (
                                    <i className="fa-solid fa-tachometer icon-project" aria-hidden />
                                  )}
                                  {group.kind === "area" && (
                                    <i className="fa-solid fa-cube icon-area" aria-hidden />
                                  )}
                                  {group.title}
                                </div>
                                <span className="chevron-link" aria-hidden="true">
                                  <i className="fa-solid fa-chevron-right" aria-hidden />
                                </span>
                              </Link>
                            )
                          ) : (
                            <div className="group-title">
                              {group.kind === "project" && (
                                <i className="fa-solid fa-tachometer icon-project" aria-hidden />
                              )}
                              {group.kind === "area" && (
                                <i className="fa-solid fa-cube icon-area" aria-hidden />
                              )}
                              {group.title}
                            </div>
                          )}
                        </div>
                      )}
                      <TaskList
                        items={group.items}
                        editing={editing}
                        isLocked={isLocked}
                        isLogbook={isLogbook}
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
                        editTitleRef={editTitleRef}
                        editNoteRef={editNoteRef}
                        onFocusTarget={handleFocusTarget}
                        onInputFocus={handleFocus}
                        onEdit={startEdit}
                        onEditChange={handleEditChange}
                        onScheduleChange={handleScheduleChange}
                        onToggleDateSchedulePanel={toggleDateSchedulePanel}
                        onToggleDeadlineSchedulePanel={toggleDeadlineSchedulePanel}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                        locale={locale}
                      />
                    </div>
                  ))}
                  {showThisEvening && (
                    <div className="group-card">
                      <div className="group-header"><div className="group-title">{t(locale, "this_evening")}</div></div>
                      <TaskList
                        items={groupedCards.evening}
                        editing={editing}
                        isLocked={isLocked}
                        isLogbook={isLogbook}
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
                        editTitleRef={editTitleRef}
                        editNoteRef={editNoteRef}
                        onFocusTarget={handleFocusTarget}
                        onInputFocus={handleFocus}
                        onEdit={handleTaskClick}
                        onEditChange={handleEditChange}
                        onScheduleChange={handleScheduleChange}
                        onToggleDateSchedulePanel={toggleDateSchedulePanel}
                        onToggleDeadlineSchedulePanel={toggleDeadlineSchedulePanel}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                        locale={locale}
                      />
                    </div>
                  )}
                </div>
              )}

              {!needsGrouping && view === "upcoming" && (
                <div className="group-list">
                  {upcomingSections.length === 0 && <p className="muted">{t(locale, "no_tasks")}</p>}
                  {upcomingSections.map((section) => (
                    <div key={section.key} className="upcoming-section">
                      {section.kind === "day" ? (
                        <div className="upcoming-day-header">
                          <span className="upcoming-day-number">{section.dayNumber}</span>
                          <span className="upcoming-day-label">{section.label}</span>
                        </div>
                      ) : section.kind === "range" ? (
                        <div className="upcoming-period-header">
                          <span className="upcoming-range-month">{section.monthLabel}</span>
                          <span className="upcoming-range-tail">{section.rangeLabel}</span>
                        </div>
                      ) : (
                        <div className="upcoming-period-header">{section.title}</div>
                      )}
                      {section.items.length > 0 && (
                        <TaskList
                          items={section.items}
                          editing={editing}
                          isLocked={isLocked}
                          isLogbook={isLogbook}
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
                          editTitleRef={editTitleRef}
                          editNoteRef={editNoteRef}
                          onFocusTarget={handleFocusTarget}
                          onInputFocus={handleFocus}
                          onEdit={handleTaskClick}
                          onEditChange={handleEditChange}
                          onScheduleChange={handleScheduleChange}
                          onToggleDateSchedulePanel={toggleDateSchedulePanel}
                          onToggleDeadlineSchedulePanel={toggleDeadlineSchedulePanel}
                          onToggleComplete={toggleComplete}
                          onDelete={handleDelete}
                          editMessage={editMessage}
                          locale={locale}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!needsGrouping && view === "logbook" && (
                <div className="group-list">
                  {logbookGroups.length === 0 && <p className="muted">{t(locale, "no_tasks")}</p>}
                  {logbookGroups.map((group) => (
                    <div key={group.key} className="date-group">
                      <div className="date-line">
                        <span>{group.title}</span>
                      </div>
                      <TaskList
                        items={group.items}
                        editing={editing}
                        isLocked={isLocked}
                        isLogbook={isLogbook}
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
                        editTitleRef={editTitleRef}
                        editNoteRef={editNoteRef}
                        onFocusTarget={handleFocusTarget}
                        onInputFocus={handleFocus}
                        onEdit={handleTaskClick}
                        onEditChange={handleEditChange}
                        onScheduleChange={handleScheduleChange}
                        onToggleDateSchedulePanel={toggleDateSchedulePanel}
                        onToggleDeadlineSchedulePanel={toggleDeadlineSchedulePanel}
                        onToggleComplete={toggleComplete}
                        onDelete={handleDelete}
                        editMessage={editMessage}
                        locale={locale}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!needsGrouping && view !== "upcoming" && view !== "logbook" && (
                <TaskList
                  items={mixedSortedItems}
                  editing={editing}
                  isLocked={isLocked}
                  isLogbook={isLogbook}
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
                  editTitleRef={editTitleRef}
                  editNoteRef={editNoteRef}
                  onFocusTarget={handleFocusTarget}
                  onInputFocus={handleFocus}
                  onEdit={handleTaskClick}
                  onEditChange={handleEditChange}
                  onScheduleChange={handleScheduleChange}
                  onToggleDateSchedulePanel={toggleDateSchedulePanel}
                  onToggleDeadlineSchedulePanel={toggleDeadlineSchedulePanel}
                  onToggleComplete={toggleComplete}
                  onDelete={handleDelete}
                  editMessage={editMessage}
                  locale={locale}
                />
              )}
            </>
          )}
        </div>
        {!isLogbook && (
          <button
            className="fab-add"
            onClick={createTaskAndEdit}
            aria-label={t(locale, "add_task")}
            disabled={!canFetch || isLocked}
          >
            +
          </button>
        )}
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
        onRefresh={() => {
          fetchView();
          fetchMeta({ force: true });
        }}
        canFetch={canFetch}
      />
    </main>
  );
}

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

type TaskListProps = {
  locale: AppLocale;
  items: Task[];
  editing: Editing | null;
  isLocked: boolean;
  isLogbook: boolean;
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
  editTitleRef: React.RefObject<HTMLInputElement | null>;
  editNoteRef: React.RefObject<HTMLTextAreaElement | null>;
  onFocusTarget: (target: "title" | "note") => void;
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
  locale,
  items,
  editing,
  isLocked,
  isLogbook,
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
  editTitleRef,
  editNoteRef,
  onFocusTarget,
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
  if (items.length === 0) return <p className="muted">{t(locale, "no_tasks")}</p>;
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
                        disabled={isLogbook}
                      />
                    </label>
                    <div
                      className="task-title-cell"
                      onPointerDown={() => {
                        onFocusTarget("title");
                      }}
                    >
                      <input
                        className="title-input"
                        value={editing.title}
                        onChange={(e) => onEditChange({ ...editing, title: e.target.value })}
                        placeholder={t(locale, "title")}
                        onPointerDown={() => {
                          onFocusTarget("title");
                        }}
                        onFocus={onInputFocus}
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
              <div
                className="task-details"
                onPointerDown={() => {
                  onFocusTarget("note");
                }}
              >
                <div className="task-details-inner">
                    <textarea
                      className="note-input draft-offset"
                      value={editing.note}
                      onChange={(e) => onEditChange({ ...editing, note: e.target.value })}
                      placeholder={t(locale, "note_optional")}
                      rows={3}
                      onPointerDown={() => {
                        onFocusTarget("note");
                      }}
                      onFocus={onInputFocus}
                      readOnly={!isEditReady}
                      data-readonly={!isEditReady ? "true" : undefined}
                      ref={editNoteRef}
                      tabIndex={isEditReady ? 0 : -1}
                    />
                  <div className="schedule draft-offset">
                    {getScheduleLabel(editing, today, locale) ? (
                      <button
                        className="schedule-label-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleDateSchedulePanel();
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <DateBadge
                          label={getScheduleLabel(editing, today, locale)}
                          locale={locale}
                          today={today}
                        />
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="icon-row">
                      {!getScheduleLabel(editing, today, locale) && (
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
                        {t(locale, "deadline")} {editing.deadline}
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
                          {t(locale, "today")}
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
                          {t(locale, "this_evening")}
                        </button>
                        <InlineCalendar
                          selectedDate={editing.someday ? "" : editing.date}
                          today={today}
                          locale={locale}
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
                          {t(locale, "someday")}
                        </button>
                        <button
                          className="pill ghost clear-date"
                          onClick={() => {
                            onScheduleChange({ date: "", someday: false, evening: false });
                            setIsEditScheduleOpen(false);
                          }}
                        >
                          {t(locale, "clear")}
                        </button>
                      </>
                    ) : (
                      <>
                        <InlineCalendar
                          selectedDate={editing.deadline}
                          today={today}
                          locale={locale}
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
                          {t(locale, "clear")}
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
          <ReadonlyTaskRow
            key={item.id}
            locale={locale}
            item={item}
            isDisabled={isDisabled}
            isLogbook={isLogbook}
            today={today}
            evening={Boolean(eveningMap[item.id])}
            onEdit={onEdit}
            onToggleComplete={onToggleComplete}
          />
        );
      })}
    </div>
  );
}

type ReadonlyTaskRowProps = {
  locale: AppLocale;
  item: Task;
  isDisabled: boolean;
  isLogbook: boolean;
  today: string;
  evening: boolean;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
};

const ReadonlyTaskRow = memo(
  function ReadonlyTaskRow({
    locale,
    item,
    isDisabled,
    isLogbook,
    today,
    evening,
    onEdit,
    onToggleComplete,
  }: ReadonlyTaskRowProps) {
    const refDate = getOverdueReferenceDate(item.date, item.deadline);
    const overdueDate = refDate && isDateBefore(refDate, today) ? refDate : undefined;
    return (
      <div
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
                  disabled={isLogbook || isDisabled}
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
            {overdueDate ? (
              <TaskDateBadge
                task={item}
                today={today}
                evening={evening}
                referenceDate={overdueDate}
                locale={locale}
              />
            ) : null}
            <div className="row-actions" />
          </div>
        </div>
        <div className="task-details">
          <div className="task-details-inner">
            <textarea
              className="note-input draft-offset"
              value={item.note ?? ""}
              placeholder={t(locale, "note_optional")}
              rows={3}
              readOnly
              data-readonly="true"
              tabIndex={-1}
            />
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.locale === next.locale &&
    prev.isDisabled === next.isDisabled &&
    prev.isLogbook === next.isLogbook &&
    prev.today === next.today &&
    prev.evening === next.evening
);

function getTaskDateLabel(
  locale: AppLocale,
  task: Task,
  today: string,
  evening: boolean,
  referenceDate?: string
) {
  if (referenceDate) return referenceDate;
  if (task.someday) return t(locale, "someday");
  if (!task.date) return "";
  if (task.date === today) return evening ? t(locale, "this_evening") : t(locale, "today");
  return task.date;
}

function TaskDateBadge({
  locale,
  task,
  today,
  evening,
  referenceDate,
}: {
  locale: AppLocale;
  task: Task;
  today: string;
  evening: boolean;
  referenceDate?: string;
}) {
  const label = getTaskDateLabel(locale, task, today, evening, referenceDate);
  if (!label) return null;
  return <DateBadge label={label} today={today} locale={locale} />;
}

function buildTaskGroups(items: Task[], projects: ProjectRef[], areas: AreaRef[], locale: AppLocale) {
  const projectOrder = new Map(projects.map((p, index) => [p.id, index]));
  const areaOrder = new Map(areas.map((a, index) => [a.id, index]));
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));
  const projectGroups = new Map<string, { title: string; items: Task[] }>();
  const areaGroups = new Map<string, { title: string; items: Task[] }>();
  const noGroup: Task[] = [];

  for (const item of items) {
    if (item.projectId) {
      const title = projectNameById.get(item.projectId) ?? t(locale, "no_group_project");
      if (!projectGroups.has(item.projectId)) {
        projectGroups.set(item.projectId, { title, items: [] });
      }
      projectGroups.get(item.projectId)?.items.push(item);
      continue;
    }
    if (item.areaId) {
      const title = areaNameById.get(item.areaId) ?? t(locale, "no_group_area");
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
    const sortedNoGroup = sortMixedByDateAndCreated(noGroup);
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
    const items = sortMixedByDateAndCreated(group.items);
    sections.push({
      key: `project-${id}`,
      title: group.title,
      items,
      kind: "project",
      href: `/projects/${id}`,
    });
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
    const items = sortMixedByDateAndCreated(group.items);
    sections.push({
      key: `area-${id}`,
      title: group.title,
      items,
      kind: "area",
      href: `/areas/${id}`,
    });
  }

  return sections;
}

function buildLogbookGroups(
  items: Task[],
  today: string,
  tzOffsetMinutes: number,
  locale: AppLocale
) {
  const localeTag = locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";
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
    result.push({ key: "yesterday", title: t(locale, "yesterday"), items: yesterdayItems });
  }
  if (thisWeekItems.length > 0) {
    result.push({ key: "this-week", title: t(locale, "this_week"), items: thisWeekItems });
  }
  if (thisMonthItems.length > 0 && todayParts) {
    const monthTitle = new Intl.DateTimeFormat(localeTag, { month: "long" }).format(
      new Date(Date.UTC(todayParts.year, todayParts.month, 1))
    );
    result.push({ key: "this-month", title: monthTitle, items: thisMonthItems });
  }

  const sortedMonths = [...monthGroups.entries()].sort(([a], [b]) => b - a);
  for (const [monthKey, list] of sortedMonths) {
    const year = Math.floor(monthKey / 12);
    const monthIndex = monthKey % 12;
    const monthTitle = new Intl.DateTimeFormat(localeTag, { month: "long" }).format(
      new Date(Date.UTC(year, monthIndex, 1))
    );
    result.push({
      key: `month-${monthKey}`,
      title: monthTitle,
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

function startOfWeekNumber(value: string) {
  const parsed = parseDateString(value);
  if (!parsed) return 0;
  const date = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return Math.floor(date.getTime() / 86400000);
}

function DateBadge({ label, today, locale }: { label: string; today: string; locale: AppLocale }) {
  if (label === t(locale, "today")) {
    return (
      <span className="date-badge date-today">
        <i className="fa-solid fa-star icon-today" aria-hidden />
        {t(locale, "today")}
      </span>
    );
  }
  if (label === t(locale, "this_evening")) {
    return (
      <span className="date-badge date-evening">
        <i className="fa-solid fa-moon date-evening" aria-hidden />
        {t(locale, "this_evening")}
      </span>
    );
  }
  if (label === t(locale, "someday")) {
    return (
      <span className="date-badge date-someday">
        <i className="fa-solid fa-archive icon-someday" aria-hidden />
        {t(locale, "someday")}
      </span>
    );
  }
  const formatted = formatRelativeDateLabel(label, today, locale);
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
  locale: AppLocale;
  onSelect: (date: string) => void;
};

function InlineCalendar({ selectedDate, today, locale, onSelect }: InlineCalendarProps) {
  const initial = useMemo(() => {
    const parsed = parseDateString(today);
    return parsed ?? getUtcDateParts(new Date());
  }, [today]);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(initial);

  useEffect(() => {
    const parsed = parseDateString(today);
    if (parsed) setCursor({ year: parsed.year, month: parsed.month });
  }, [today]);

  const monthLabel = formatMonthLabel(cursor.year, cursor.month, locale);
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
        {getWeekdayLabels(locale).map((day) => (
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

function formatRelativeDateLabel(date: string, today: string, locale: AppLocale) {
  const target = parseDateString(date);
  const base = parseDateString(today);
  if (!target || !base) return null;
  const diff = dateToNumber(date) - dateToNumber(today);
  const localeTag = locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";
  const formatter = new Intl.DateTimeFormat(localeTag, { weekday: "short" });
  const weekday = formatter.format(new Date(Date.UTC(target.year, target.month, target.day)));
  if (diff === 1) return { text: t(locale, "tomorrow"), isPast: false };
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

function formatMonthLabel(year: number, month: number, locale: AppLocale) {
  const localeTag = locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";
  return new Date(Date.UTC(year, month, 1)).toLocaleString(localeTag, {
    month: "short",
    year: "numeric",
  });
}

function getWeekdayLabels(locale: AppLocale) {
  const localeTag = locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";
  const formatter = new Intl.DateTimeFormat(localeTag, { weekday: "short" });
  const base = Date.UTC(2023, 0, 1);
  return Array.from({ length: 7 }, (_, i) =>
    formatter.format(new Date(base + i * 86400000))
  );
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
