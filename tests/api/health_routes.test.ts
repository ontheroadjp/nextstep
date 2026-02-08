import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as liveGET } from "../../app/api/health/live/route";
import { GET as readyGET } from "../../app/api/health/ready/route";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("health routes", () => {
  beforeEach(() => {
    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("GET /api/health/live returns 200", async () => {
    const res = await liveGET(new Request("http://localhost/api/health/live"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; checks: { app: string } };
    expect(body.status).toBe("ok");
    expect(body.checks.app).toBe("up");
  });

  it("GET /api/health/ready returns 200 when required env is set", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";

    const res = await readyGET(new Request("http://localhost/api/health/ready"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      checks: { env: Record<string, string> };
    };
    expect(body.status).toBe("ok");
    expect(body.checks.env.SUPABASE_URL).toBe("set");
    expect(body.checks.env.SUPABASE_ANON_KEY).toBe("set");
  });

  it("GET /api/health/ready returns 503 when env is missing", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    const res = await readyGET(new Request("http://localhost/api/health/ready"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      status: string;
      checks: { env: Record<string, string> };
    };
    expect(body.status).toBe("degraded");
    expect(body.checks.env.SUPABASE_URL).toBe("missing");
    expect(body.checks.env.SUPABASE_ANON_KEY).toBe("missing");
  });
});
