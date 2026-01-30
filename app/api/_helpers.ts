import type { SupabaseClient } from "@supabase/supabase-js";
import { error } from "./_utils";

export type Checklist = {
  id: string;
  title: string;
  completed: boolean;
  sortKey: string | null;
};

export type Task = {
  id: string;
  title: string;
  note: string;
  date: string | null;
  someday: boolean;
  completedAt: string | null;
  areaId: string | null;
  projectId: string | null;
  sortKey: string | null;
  checklists: Checklist[];
};

export function mapChecklist(row: Record<string, unknown>): Checklist {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    completed: Boolean(row.completed),
    sortKey: (row.sort_key as string | null) ?? null,
  };
}

export function mapTask(row: Record<string, unknown>): Task {
  const checklists = Array.isArray(row.checklists)
    ? row.checklists.map((c) => mapChecklist(c as Record<string, unknown>))
    : [];

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    note: String(row.note ?? ""),
    date: (row.date as string | null) ?? null,
    someday: Boolean(row.someday),
    completedAt: (row.completed_at as string | null) ?? null,
    areaId: (row.area_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    sortKey: (row.sort_key as string | null) ?? null,
    checklists,
  };
}

export async function requireUserId(
  supabase: SupabaseClient,
  request: Request
): Promise<string | Response> {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return error("unauthorized", "Missing Authorization header", 401);
  }

  const accessToken = match[1];
  const { data, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !data.user) {
    return error("unauthorized", "Invalid access token", 401);
  }

  return data.user.id;
}

export async function requireUserContext(
  supabase: SupabaseClient,
  request: Request
): Promise<{ userId: string; accessToken: string } | Response> {
  const authHeader = request.headers.get("authorization");
  const bearerMatch = authHeader?.match(/^Bearer\\s+(.+)$/i);
  const altHeader = request.headers.get("x-access-token");
  const accessToken = bearerMatch?.[1] ?? altHeader ?? "";
  if (!accessToken) {
    return error("unauthorized", "Missing Authorization header", 401);
  }

  const { data, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !data.user) {
    return error("unauthorized", "Invalid access token", 401);
  }

  return { userId: data.user.id, accessToken };
}

export function todayFromRequest(request: Request): string {
  const offsetHeader = request.headers.get("x-tz-offset-minutes");
  const offsetMinutes = offsetHeader ? Number(offsetHeader) : 0;
  const offsetMs = Number.isFinite(offsetMinutes) ? offsetMinutes * 60 * 1000 : 0;
  const now = new Date(Date.now() + offsetMs);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function readJson<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return error("bad_request", "Invalid JSON body", 400);
  }
}

export function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeSomedayDate(input: {
  date?: string | null;
  someday?: boolean;
}): { date?: string | null; someday?: boolean } {
  const { date, someday } = input;
  if (someday === true) {
    return { date: null, someday: true };
  }
  if (date != null) {
    return { date, someday: false };
  }
  return { date, someday };
}

export async function ensureOwnedReference(
  supabase: SupabaseClient,
  userId: string,
  table: "areas" | "projects",
  id: string,
  label: "areaId" | "projectId"
): Promise<Response | null> {
  const { data, error: fetchError } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .limit(1);

  if (fetchError) {
    return error("internal_error", fetchError.message, 500);
  }
  if (!data || data.length === 0) {
    return error("bad_request", `${label} is invalid`, 400);
  }
  return null;
}
