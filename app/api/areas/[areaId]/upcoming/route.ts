import { createServerClient } from "../../../_supabase";
import { error, json } from "../../../_utils";
import { mapTask, requireUserContext, todayFromRequest } from "../../../_helpers";
import { fetchUpcoming } from "../../../_queries";

export async function GET(request: Request, context: { params: Promise<{ areaId: string }> | { areaId: string } }): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const params = await context.params;

  const today = todayFromRequest(request);
  const { data, error: fetchError } = await fetchUpcoming(supabase, userId, today, {
    areaId: params.areaId,
  });
  if (fetchError) return error("internal_error", fetchError.message, 500);

  const groups = new Map<string, ReturnType<typeof mapTask>[]>();
  for (const row of data ?? []) {
    const task = mapTask(row);
    if (!task.date) continue;
    if (!groups.has(task.date)) groups.set(task.date, []);
    groups.get(task.date)?.push(task);
  }

  const result = Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
  }));

  return json({ groups: result });
}
