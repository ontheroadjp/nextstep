import { createServerClient } from "../_supabase";
import { error, json } from "../_utils";
import { mapTask, nonEmptyString, normalizeSomedayDate, readJson, requireUserContext } from "../_helpers";

type TaskCreateInput = {
  title?: string;
  note?: string;
  date?: string | null;
  someday?: boolean;
  areaId?: string | null;
  projectId?: string | null;
};

export async function POST(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const body = await readJson<TaskCreateInput>(request);
  if (body instanceof Response) return body;

  if (!nonEmptyString(body.title)) {
    return error("bad_request", "title is required", 400);
  }
  if (!nonEmptyString(body.note)) {
    return error("bad_request", "note is required", 400);
  }

  const normalized = normalizeSomedayDate({ date: body.date, someday: body.someday });

  const { data, error: insertError } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: body.title.trim(),
      note: body.note.trim(),
      date: normalized.date ?? null,
      someday: normalized.someday ?? false,
      area_id: body.areaId ?? null,
      project_id: body.projectId ?? null,
    })
    .select(
      "id,title,note,date,someday,completed_at,area_id,project_id,sort_key,checklists(id,title,completed,sort_key)"
    )
    .single();

  if (insertError) return error("internal_error", insertError.message, 500);

  return json({ item: mapTask(data as Record<string, unknown>) }, { status: 201 });
}
