import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkApiProtectionRateLimit,
  resetApiProtectionStateForTests,
} from "../../app/_lib/api_protection";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("api protection rate limit", () => {
  beforeEach(() => {
    restoreEnv();
    resetApiProtectionStateForTests();
  });

  afterEach(() => {
    restoreEnv();
    resetApiProtectionStateForTests();
  });

  it("does not protect read-only non-auth API", () => {
    const req = new Request("http://localhost/api/today", { method: "GET" });
    const result = checkApiProtectionRateLimit(req);
    expect(result).toBeNull();
  });

  it("limits auth API by configured threshold", () => {
    process.env.API_RATE_LIMIT_MAX_AUTH = "2";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const req = new Request("http://localhost/api/auth/login", { method: "POST" });
    const first = checkApiProtectionRateLimit(req);
    const second = checkApiProtectionRateLimit(req);
    const third = checkApiProtectionRateLimit(req);

    expect(first && first.allowed).toBe(true);
    expect(second && second.allowed).toBe(true);
    expect(third && third.allowed).toBe(false);
    if (third && !third.allowed) {
      expect(third.retryAfterSec).toBeGreaterThanOrEqual(1);
      expect(third.limit).toBe(2);
    }
  });

  it("limits write API by configured threshold", () => {
    process.env.API_RATE_LIMIT_MAX_WRITE = "1";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const req = new Request("http://localhost/api/tasks", { method: "POST" });
    const first = checkApiProtectionRateLimit(req);
    const second = checkApiProtectionRateLimit(req);

    expect(first && first.allowed).toBe(true);
    expect(second && second.allowed).toBe(false);
  });

  it("separates clients by x-forwarded-for", () => {
    process.env.API_RATE_LIMIT_MAX_WRITE = "1";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const reqA = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    const reqB = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.2" },
    });

    const firstA = checkApiProtectionRateLimit(reqA);
    const firstB = checkApiProtectionRateLimit(reqB);
    const secondA = checkApiProtectionRateLimit(reqA);

    expect(firstA && firstA.allowed).toBe(true);
    expect(firstB && firstB.allowed).toBe(true);
    expect(secondA && secondA.allowed).toBe(false);
  });
});
