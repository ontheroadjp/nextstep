import { createServerClient } from "../../_supabase";
import { error, json } from "../../_utils";
import { nonEmptyString, readJson } from "../../_helpers";

type RefreshInput = {
  refreshToken?: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<RefreshInput>(request);
  if (body instanceof Response) return body;

  if (!nonEmptyString(body.refreshToken)) {
    return error("bad_request", "refreshToken is required", 400);
  }

  const supabase = createServerClient();
  const { data, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: body.refreshToken,
  });

  if (refreshError || !data.session?.access_token || !data.session?.refresh_token) {
    return error("unauthorized", "Failed to refresh session", 401);
  }

  return json({
    item: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
    },
  });
}
