import { createServerClient } from "../../_supabase";
import { error, json } from "../../_utils";
import { nonEmptyString, readJson, requireUserContext } from "../../_helpers";
import { baseTaskSelect } from "../../_queries";

type AreaUpdateInput = {
  name?: string;
  sortKey?: string | null;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ areaId: string }> | { areaId: string } }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const params = await context.params;

  const { data: item, error: itemError } = await supabase
    .from("areas")
    .select("id,name,sort_key")
    .eq("id", params.areaId)
    .eq("user_id", userId)
    .single();

  if (itemError) return error("not_found", "Area not found", 404);

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .eq("area_id", params.areaId)
    .is("archived_at", null)
    .order("date", { ascending: true })
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (tasksError) return error("internal_error", tasksError.message, 500);

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id,name,note,area_id,sort_key")
    .eq("user_id", userId)
    .eq("area_id", params.areaId)
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (projectsError) return error("internal_error", projectsError.message, 500);

  return json({ item, tasks: tasks ?? [], projects: projects ?? [] });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ areaId: string }> | { areaId: string } }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const body = await readJson<AreaUpdateInput>(request);
  if (body instanceof Response) return body;

  if (body.name !== undefined && !nonEmptyString(body.name)) {
    return error("bad_request", "name must be non-empty", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.sortKey !== undefined) {
    update.sort_key = body.sortKey === null ? null : body.sortKey.trim();
  }

  const { data, error: updateError } = await supabase
    .from("areas")
    .update(update)
    .eq("id", params.areaId)
    .eq("user_id", userId)
    .select("id,name,sort_key")
    .single();

  if (updateError) {
    if (
      updateError.message.includes("Results contain 0 rows") ||
      updateError.message.includes("Cannot coerce the result")
    ) {
      return error("not_found", "Area not found", 404);
    }
    return error("internal_error", updateError.message, 500);
  }

  return json({ item: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ areaId: string }> | { areaId: string } }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const { error: deleteError } = await supabase
    .from("areas")
    .delete()
    .eq("id", params.areaId)
    .eq("user_id", userId);

  if (deleteError) return error("internal_error", deleteError.message, 500);

  return json({ ok: true });
}
