import { createServerClient } from "../../_supabase";
import { error, json } from "../../_utils";
import {
  ensureOwnedReference,
  mapTask,
  nonEmptyString,
  normalizeSomedayDate,
  readJson,
  requireUserContext,
} from "../../_helpers";

type TaskUpdateInput = {
  title?: string;
  note?: string;
  date?: string | null;
  someday?: boolean;
  completedAt?: string | null;
  areaId?: string | null;
  projectId?: string | null;
  sortKey?: string | null;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const params = await context.params;

  const body = await readJson<TaskUpdateInput>(request);
  if (body instanceof Response) return body;

  if (body.title !== undefined && !nonEmptyString(body.title)) {
    return error("bad_request", "title must be non-empty", 400);
  }
  if (body.note !== undefined && !nonEmptyString(body.note)) {
    return error("bad_request", "note must be non-empty", 400);
  }
  if (body.areaId !== undefined && body.areaId !== null && !nonEmptyString(body.areaId)) {
    return error("bad_request", "areaId must be non-empty", 400);
  }
  if (body.projectId !== undefined && body.projectId !== null && !nonEmptyString(body.projectId)) {
    return error("bad_request", "projectId must be non-empty", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const normalized = normalizeSomedayDate({ date: body.date, someday: body.someday });

  if (body.areaId) {
    const areaCheck = await ensureOwnedReference(supabase, userId, "areas", body.areaId, "areaId");
    if (areaCheck) return areaCheck;
  }
  if (body.projectId) {
    const projectCheck = await ensureOwnedReference(
      supabase,
      userId,
      "projects",
      body.projectId,
      "projectId"
    );
    if (projectCheck) return projectCheck;
  }

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.note !== undefined) update.note = body.note.trim();
  if (normalized.date !== undefined) update.date = normalized.date;
  if (normalized.someday !== undefined) update.someday = normalized.someday;
  if (body.completedAt !== undefined) update.completed_at = body.completedAt;
  if (body.areaId !== undefined) update.area_id = body.areaId;
  if (body.projectId !== undefined) update.project_id = body.projectId;
  if (body.sortKey !== undefined) {
    update.sort_key = body.sortKey === null ? null : body.sortKey.trim();
  }

  const { data, error: updateError } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", userId)
    .select(
      "id,title,note,date,someday,completed_at,area_id,project_id,sort_key,checklists(id,title,completed,sort_key)"
    )
    .single();

  if (updateError) {
    if (
      updateError.message.includes("Results contain 0 rows") ||
      updateError.message.includes("Cannot coerce the result")
    ) {
      return error("not_found", "Task not found", 404);
    }
    return error("internal_error", updateError.message, 500);
  }

  return json({ item: mapTask(data as Record<string, unknown>) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (deleteError) return error("internal_error", deleteError.message, 500);

  return json({ ok: true });
}
