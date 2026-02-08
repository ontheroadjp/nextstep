import { createServerClient } from "../../_supabase";
import { error, json, withApiMonitoring } from "../../_utils";
import { ensureOwnedReference, nonEmptyString, readJson, requireUserContext } from "../../_helpers";
import { baseTaskSelect } from "../../_queries";

type ProjectUpdateInput = {
  name?: string;
  note?: string;
  areaId?: string | null;
  sortKey?: string | null;
};

async function _GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const params = await context.params;

  const { data: item, error: itemError } = await supabase
    .from("projects")
    .select("id,name,note,area_id,sort_key")
    .eq("id", params.projectId)
    .eq("user_id", userId)
    .single();

  if (itemError) return error("not_found", "Project not found", 404);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .eq("project_id", params.projectId)
    .is("archived_at", null)
    .order("date", { ascending: true })
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (tasksError) return error("internal_error", tasksError.message, 500);

  return json({ item, tasks: tasks ?? [] });
}

async function _PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const body = await readJson<ProjectUpdateInput>(request);
  if (body instanceof Response) return body;

  if (body.name !== undefined && !nonEmptyString(body.name)) {
    return error("bad_request", "name must be non-empty", 400);
  }
  if (body.note !== undefined && !nonEmptyString(body.note)) {
    return error("bad_request", "note must be non-empty", 400);
  }
  if (body.areaId !== undefined && body.areaId !== null && !nonEmptyString(body.areaId)) {
    return error("bad_request", "areaId must be non-empty", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.note !== undefined) update.note = body.note.trim();
  if (body.areaId !== undefined) update.area_id = body.areaId;
  if (body.sortKey !== undefined) {
    update.sort_key = body.sortKey === null ? null : body.sortKey.trim();
  }

  if (body.areaId) {
    const areaCheck = await ensureOwnedReference(supabase, userId, "areas", body.areaId, "areaId");
    if (areaCheck) return areaCheck;
  }

  const { data, error: updateError } = await supabase
    .from("projects")
    .update(update)
    .eq("id", params.projectId)
    .eq("user_id", userId)
    .select("id,name,note,area_id,sort_key")
    .single();

  if (updateError) {
    if (
      updateError.message.includes("Results contain 0 rows") ||
      updateError.message.includes("Cannot coerce the result")
    ) {
      return error("not_found", "Project not found", 404);
    }
    return error("internal_error", updateError.message, 500);
  }

  return json({ item: data });
}

async function _DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", params.projectId)
    .eq("user_id", userId);

  if (deleteError) return error("internal_error", deleteError.message, 500);

  return json({ ok: true });
}

export const GET = withApiMonitoring(_GET);

export const PATCH = withApiMonitoring(_PATCH);

export const DELETE = withApiMonitoring(_DELETE);
