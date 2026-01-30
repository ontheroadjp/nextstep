import { createServerClient } from "../_supabase";
import { error, json } from "../_utils";
import { nonEmptyString, readJson, requireUserContext } from "../_helpers";

type ProjectCreateInput = {
  name?: string;
  note?: string;
  areaId?: string | null;
  sortKey?: string | null;
};

export async function GET(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const { data, error: fetchError } = await supabase
    .from("projects")
    .select("id,name,note,area_id,sort_key")
    .eq("user_id", userId)
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (fetchError) return error("internal_error", fetchError.message, 500);

  return json({ items: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const body = await readJson<ProjectCreateInput>(request);
  if (body instanceof Response) return body;

  if (!nonEmptyString(body.name)) {
    return error("bad_request", "name is required", 400);
  }
  if (!nonEmptyString(body.note)) {
    return error("bad_request", "note is required", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const { data, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: body.name.trim(),
      note: body.note.trim(),
      area_id: body.areaId ?? null,
      sort_key: body.sortKey === undefined || body.sortKey === null ? null : body.sortKey.trim(),
    })
    .select("id,name,note,area_id,sort_key")
    .single();

  if (insertError) return error("internal_error", insertError.message, 500);

  return json({ item: data }, { status: 201 });
}
