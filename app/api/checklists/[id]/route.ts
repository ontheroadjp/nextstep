import { createServerClient } from "../../_supabase";
import { error, json, withApiMonitoring } from "../../_utils";
import { nonEmptyString, readJson, requireUserContext } from "../../_helpers";

type ChecklistUpdateInput = {
  title?: string;
  completed?: boolean;
  sortKey?: string | null;
};

async function _PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const body = await readJson<ChecklistUpdateInput>(request);
  if (body instanceof Response) return body;

  if (body.title !== undefined && !nonEmptyString(body.title)) {
    return error("bad_request", "title must be non-empty", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.completed !== undefined) update.completed = body.completed;
  if (body.sortKey !== undefined) {
    update.sort_key = body.sortKey === null ? null : body.sortKey.trim();
  }

  const { data, error: updateError } = await supabase
    .from("checklists")
    .update(update)
    .eq("id", params.id)
    .select("id,title,completed,sort_key")
    .single();

  if (updateError) {
    if (
      updateError.message.includes("Results contain 0 rows") ||
      updateError.message.includes("Cannot coerce the result")
    ) {
      return error("not_found", "Checklist not found", 404);
    }
    return error("internal_error", updateError.message, 500);
  }

  return json({ item: data });
}

async function _DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);
  const params = await context.params;

  const { error: deleteError } = await supabase.from("checklists").delete().eq("id", params.id);

  if (deleteError) return error("internal_error", deleteError.message, 500);

  return json({ ok: true });
}

export const PATCH = withApiMonitoring(_PATCH);

export const DELETE = withApiMonitoring(_DELETE);
