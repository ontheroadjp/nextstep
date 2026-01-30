import { createClient } from "@supabase/supabase-js";

export function getBaseUrl() {
  const raw = process.env.BASE_URL || "";
  return raw.startsWith("http") ? raw : "http://localhost:3000";
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function makePrefix(label: string) {
  const base = process.env.TEST_PREFIX || "[TEST] ";
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${base}${label}-${Date.now()}-${nonce}-`;
}

export async function getAccessToken(email: string, password: string): Promise<string> {
  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message || "No access token");
  }
  return data.session.access_token;
}

export async function apiFetch(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("x-access-token", token);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const url = new URL(path, getBaseUrl());
  return fetch(url.toString(), { ...init, headers });
}

export async function cleanup(prefix: string, token: string) {
  const base = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const rest = `${base}/rest/v1`;
  const enc = encodeURIComponent(prefix);
  const headers = {
    apikey: requireEnv("SUPABASE_ANON_KEY"),
    Authorization: `Bearer ${token}`,
    Prefer: "return=representation",
  };
  await fetch(`${rest}/checklists?title=ilike.${enc}%25`, { method: "DELETE", headers });
  await fetch(`${rest}/tasks?title=ilike.${enc}%25`, { method: "DELETE", headers });
  await fetch(`${rest}/projects?name=ilike.${enc}%25`, { method: "DELETE", headers });
  await fetch(`${rest}/areas?name=ilike.${enc}%25`, { method: "DELETE", headers });
}
