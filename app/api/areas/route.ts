import { createServerClient } from "../_supabase";
import { error, json } from "../_utils";
import { nonEmptyString, readJson, requireUserContext } from "../_helpers";

type AreaCreateInput = {
  name?: string;
  sortKey?: string | null;
};

export async function GET(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const { data, error: fetchError } = await supabase
    .from("areas")
    .select("id,name,sort_key")
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

  const body = await readJson<AreaCreateInput>(request);
  if (body instanceof Response) return body;

  if (!nonEmptyString(body.name)) {
    return error("bad_request", "name is required", 400);
  }
  if (body.sortKey !== undefined && body.sortKey !== null && !nonEmptyString(body.sortKey)) {
    return error("bad_request", "sortKey must be non-empty", 400);
  }

  const { data, error: insertError } = await supabase
    .from("areas")
    .insert({
      user_id: userId,
      name: body.name.trim(),
      sort_key: body.sortKey === undefined || body.sortKey === null ? null : body.sortKey.trim(),
    })
    .select("id,name,sort_key")
    .single();

  if (insertError) return error("internal_error", insertError.message, 500);

  return json({ item: data }, { status: 201 });
}
