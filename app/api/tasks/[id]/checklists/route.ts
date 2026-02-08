import { createServerClient } from "../../../_supabase";
import { error, json, withApiMonitoring } from "../../../_utils";
import { nonEmptyString, readJson, requireUserContext } from "../../../_helpers";

type ChecklistCreateInput = {
  title?: string;
  completed?: boolean;
  sortKey?: string | null;
};

async function _POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const params = await context.params;

  const body = await readJson<ChecklistCreateInput>(request);
  if (body instanceof Response) return body;

  if (!nonEmptyString(body.title)) {
    return error("bad_request", "title is required", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const { data, error: insertError } = await supabase
    .from("checklists")
    .insert({
      task_id: params.id,
      title: body.title.trim(),
      completed: body.completed ?? false,
      sort_key: body.sortKey === undefined || body.sortKey === null ? null : body.sortKey.trim(),
    })
    .select("id,title,completed,sort_key")
    .single();

  if (insertError) return error("internal_error", insertError.message, 500);

  return json({ item: data }, { status: 201 });
}

export const POST = withApiMonitoring(_POST);
