import { createServerClient } from "../../_supabase";
import { error, json, withApiMonitoring } from "../../_utils";
import { requireUserContext } from "../../_helpers";

async function _POST(request: Request): Promise<Response> {
  const admin = createServerClient();
  const auth = await requireUserContext(admin, request);
  if (auth instanceof Response) return auth;
  const { userId, accessToken } = auth;
  const supabase = createServerClient(accessToken);

  const archivedAt = new Date().toISOString();
  const { data, error: updateError } = await supabase
    .from("tasks")
    .update({ archived_at: archivedAt })
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .is("archived_at", null)
    .select("id");

  if (updateError) return error("internal_error", updateError.message, 500);

  return json({
    item: {
      archivedAt,
      archivedCount: Array.isArray(data) ? data.length : 0,
    },
  });
}

export const POST = withApiMonitoring(_POST);
