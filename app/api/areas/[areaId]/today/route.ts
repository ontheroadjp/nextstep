import { createServerClient } from "../../../_supabase";
import { error, json, withApiMonitoring } from "../../../_utils";
import { mapTask, requireUserContext, todayFromRequest } from "../../../_helpers";
import { fetchToday } from "../../../_queries";

async function _GET(request: Request, context: { params: Promise<{ areaId: string }> }): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const params = await context.params;

  const today = todayFromRequest(request);
  const { data, error: fetchError } = await fetchToday(supabase, userId, today, {
    areaId: params.areaId,
  });
  if (fetchError) return error("internal_error", fetchError.message, 500);

  return json({ items: (data ?? []).map(mapTask) });
}

export const GET = withApiMonitoring(_GET);
