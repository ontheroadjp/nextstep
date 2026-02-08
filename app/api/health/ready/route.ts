import { json } from "../../_utils";

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(_request: Request): Promise<Response> {
  const hasSupabaseUrl = hasValue(process.env.SUPABASE_URL);
  const hasSupabaseAnonKey = hasValue(process.env.SUPABASE_ANON_KEY);
  const isReady = hasSupabaseUrl && hasSupabaseAnonKey;

  return json(
    {
      status: isReady ? "ok" : "degraded",
      checks: {
        env: {
          SUPABASE_URL: hasSupabaseUrl ? "set" : "missing",
          SUPABASE_ANON_KEY: hasSupabaseAnonKey ? "set" : "missing",
        },
      },
    },
    { status: isReady ? 200 : 503 }
  );
}
