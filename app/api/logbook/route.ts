import { createServerClient } from "../_supabase";
import { error, json } from "../_utils";
import { mapTask, requireUserContext } from "../_helpers";
import { fetchLogbook } from "../_queries";

export async function GET(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const { data, error: fetchError } = await fetchLogbook(supabase, userId);
  if (fetchError) return error("internal_error", fetchError.message, 500);

  return json({ items: (data ?? []).map(mapTask) });
}
