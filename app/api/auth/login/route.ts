import { createServerClient } from "../../_supabase";
import { error, json, withApiMonitoring } from "../../_utils";
import { nonEmptyString, readJson } from "../../_helpers";

type LoginInput = {
  provider?: string;
  email?: string;
  password?: string;
};

async function _POST(request: Request): Promise<Response> {
  const body = await readJson<LoginInput>(request);
  if (body instanceof Response) return body;

  const provider = body.provider ?? "password";
  if (provider !== "password") {
    return error("bad_request", "provider is not supported", 400);
  }
  if (!nonEmptyString(body.email) || !nonEmptyString(body.password)) {
    return error("bad_request", "email and password are required", 400);
  }

  const supabase = createServerClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (signInError || !data.session?.access_token || !data.session?.refresh_token) {
    return error("unauthorized", "Failed to sign in", 401);
  }

  return json({
    item: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
    },
  });
}

export const POST = withApiMonitoring(_POST);
