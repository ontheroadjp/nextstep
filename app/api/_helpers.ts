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
  archivedAt: string | null;
  createdAt: string | null;
  areaId: string | null;
  projectId: string | null;
  sortKey: string | null;
  checklists: Checklist[];
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function mapChecklist(row: unknown): Checklist {
  const item = toRecord(row);
  return {
    id: String(item.id),
    title: String(item.title ?? ""),
    completed: Boolean(item.completed),
    sortKey: (item.sort_key as string | null) ?? null,
  };
}

export function mapTask(row: unknown): Task {
  const item = toRecord(row);
  const checklists = Array.isArray(item.checklists)
    ? item.checklists.map((c) => mapChecklist(c))
    : [];

  return {
    id: String(item.id),
    title: String(item.title ?? ""),
    note: String(item.note ?? ""),
    date: (item.date as string | null) ?? null,
    someday: Boolean(item.someday),
    completedAt: (item.completed_at as string | null) ?? null,
    archivedAt: (item.archived_at as string | null) ?? null,
    createdAt: (item.created_at as string | null) ?? null,
    areaId: (item.area_id as string | null) ?? null,
    projectId: (item.project_id as string | null) ?? null,
    sortKey: (item.sort_key as string | null) ?? null,
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
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
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

export async function getProjectAreaId(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ areaId: string | null } | Response> {
  const { data, error: fetchError } = await supabase
    .from("projects")
    .select("id,area_id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .limit(1);

  if (fetchError) {
    return error("internal_error", fetchError.message, 500);
  }
  if (!data || data.length === 0) {
    return error("bad_request", "projectId is invalid", 400);
  }
  const projectAreaId = (data[0]?.area_id as string | null) ?? null;
  return { areaId: projectAreaId };
}
