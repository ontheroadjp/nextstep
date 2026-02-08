type ProtectedKind = "auth" | "write";

type LimitConfig = {
  windowMs: number;
  authMax: number;
  writeMax: number;
};

type Counter = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | { allowed: true; limit: number; remaining: number; resetAt: number; kind: ProtectedKind }
  | { allowed: false; limit: number; remaining: 0; resetAt: number; retryAfterSec: number; kind: ProtectedKind };

const counters = new Map<string, Counter>();

function parseNumber(value: string | undefined, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function getLimitConfig(): LimitConfig {
  return {
    windowMs: parseNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 60_000),
    authMax: parseNumber(process.env.API_RATE_LIMIT_MAX_AUTH, 60),
    writeMax: parseNumber(process.env.API_RATE_LIMIT_MAX_WRITE, 300),
  };
}

function normalizeIp(raw: string | null): string {
  if (!raw) return "";
  return raw.split(",")[0]?.trim() ?? "";
}

function getClientKey(request: Request): string {
  const forwarded = normalizeIp(request.headers.get("x-forwarded-for"));
  const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
  const cfIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  const tokenFragment = authHeader.startsWith("Bearer ") ? authHeader.slice(7, 23) : "";
  return forwarded || cfIp || realIp || tokenFragment || "anonymous";
}

function classifyProtectedRequest(pathname: string, method: string): ProtectedKind | null {
  if (pathname.startsWith("/api/auth/")) return "auth";
  if (method === "POST" || method === "PATCH" || method === "DELETE" || method === "PUT") return "write";
  return null;
}

function pruneExpired(now: number): void {
  for (const [key, counter] of counters.entries()) {
    if (counter.resetAt <= now) counters.delete(key);
  }
}

export function resetApiProtectionStateForTests(): void {
  counters.clear();
}

export function checkApiProtectionRateLimit(request: Request): RateLimitResult | null {
  const url = new URL(request.url);
  const kind = classifyProtectedRequest(url.pathname, request.method);
  if (!kind) return null;

  const now = Date.now();
  pruneExpired(now);

  const config = getLimitConfig();
  const limit = kind === "auth" ? config.authMax : config.writeMax;
  const windowMs = config.windowMs;
  const clientKey = getClientKey(request);
  const counterKey = `${kind}:${request.method}:${url.pathname}:${clientKey}`;
  const existing = counters.get(counterKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    counters.set(counterKey, { count: 1, resetAt });
    return { allowed: true, limit, remaining: Math.max(0, limit - 1), resetAt, kind };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt, retryAfterSec, kind };
  }

  existing.count += 1;
  counters.set(counterKey, existing);
  return { allowed: true, limit, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt, kind };
}
