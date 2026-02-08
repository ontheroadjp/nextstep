import { createServerClient } from "../_supabase";
import { error, json, withApiMonitoring } from "../_utils";
import {
  ensureOwnedReference,
  getProjectAreaId,
  mapTask,
  nonEmptyString,
  normalizeSomedayDate,
  readJson,
  requireUserContext,
} from "../_helpers";

type TaskCreateInput = {
  title?: string;
  note?: string;
  date?: string | null;
  someday?: boolean;
  areaId?: string | null;
  projectId?: string | null;
};

async function _POST(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const body = await readJson<TaskCreateInput>(request);
  if (body instanceof Response) return body;

  if (body.title !== undefined && typeof body.title !== "string") {
    return error("bad_request", "title must be string", 400);
  }
  if (body.title === undefined || !nonEmptyString(body.title)) {
    return error("bad_request", "title is required", 400);
  }
  if (body.note !== undefined && typeof body.note !== "string") {
    return error("bad_request", "note must be string", 400);
  }
  if (body.areaId !== undefined && body.areaId !== null && !nonEmptyString(body.areaId)) {
    return error("bad_request", "areaId must be non-empty", 400);
  }
  if (body.projectId !== undefined && body.projectId !== null && !nonEmptyString(body.projectId)) {
    return error("bad_request", "projectId must be non-empty", 400);
  }

  const normalized = normalizeSomedayDate({ date: body.date, someday: body.someday });

  if (body.areaId) {
    const areaCheck = await ensureOwnedReference(supabase, userId, "areas", body.areaId, "areaId");
    if (areaCheck) return areaCheck;
  }
  let resolvedAreaId = body.areaId ?? null;
  if (body.projectId) {
    const projectCheck = await ensureOwnedReference(
      supabase,
      userId,
      "projects",
      body.projectId,
      "projectId"
    );
    if (projectCheck) return projectCheck;
    const projectInfo = await getProjectAreaId(supabase, userId, body.projectId);
    if (projectInfo instanceof Response) return projectInfo;
    if (resolvedAreaId === null && projectInfo.areaId !== null) {
      resolvedAreaId = projectInfo.areaId;
    } else if (resolvedAreaId !== null && projectInfo.areaId !== resolvedAreaId) {
      return error("bad_request", "areaId does not match projectId", 400);
    }
  }

  const title = body.title.trim();
  const { data, error: insertError } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title,
      note: body.note?.trim() ?? "",
      date: normalized.date ?? null,
      someday: normalized.someday ?? false,
      area_id: resolvedAreaId,
      project_id: body.projectId ?? null,
    })
    .select(
      "id,title,note,date,someday,completed_at,archived_at,created_at,area_id,project_id,sort_key,checklists(id,title,completed,sort_key)"
    )
    .single();

  if (insertError) return error("internal_error", insertError.message, 500);

  return json({ item: mapTask(data as Record<string, unknown>) }, { status: 201 });
}

export const POST = withApiMonitoring(_POST);
