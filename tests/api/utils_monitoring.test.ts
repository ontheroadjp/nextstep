import { beforeEach, describe, expect, it, vi } from "vitest";

const { emitMonitoringEventMock, getLatencyThresholdMsMock } = vi.hoisted(() => ({
  emitMonitoringEventMock: vi.fn(async () => {}),
  getLatencyThresholdMsMock: vi.fn(() => 10),
}));
const { checkApiProtectionRateLimitMock } = vi.hoisted(() => ({
  checkApiProtectionRateLimitMock: vi.fn<(...args: unknown[]) => unknown>(() => null),
}));

vi.mock("../../app/_lib/monitoring", () => ({
  emitMonitoringEvent: emitMonitoringEventMock,
  getLatencyThresholdMs: getLatencyThresholdMsMock,
}));
vi.mock("../../app/_lib/api_protection", () => ({
  checkApiProtectionRateLimit: checkApiProtectionRateLimitMock,
}));

import { error, json, withApiMonitoring } from "../../app/api/_utils";

describe("withApiMonitoring", () => {
  beforeEach(() => {
    emitMonitoringEventMock.mockClear();
    getLatencyThresholdMsMock.mockReset();
    getLatencyThresholdMsMock.mockReturnValue(10);
    checkApiProtectionRateLimitMock.mockReset();
    checkApiProtectionRateLimitMock.mockReturnValue(null);
  });

  it("returns 429 when api protection blocks request", async () => {
    checkApiProtectionRateLimitMock.mockReturnValue({
      allowed: false,
      limit: 2,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSec: 60,
      kind: "auth",
    });

    const wrapped = withApiMonitoring(async () => json({ ok: true }));
    const response = await wrapped(new Request("http://localhost/api/auth/login", { method: "POST" }));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(emitMonitoringEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "api_rate_limited",
        status: 429,
      })
    );
  });

  it("reports 401 responses", async () => {
    const wrapped = withApiMonitoring(async () => error("unauthorized", "Invalid access token", 401));
    const response = await wrapped(new Request("http://localhost/api/today"));
    expect(response.status).toBe(401);
    expect(emitMonitoringEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "api_auth_failure",
        status: 401,
        route: "/api/today",
      })
    );
  });

  it("reports 500 responses with error fields", async () => {
    const wrapped = withApiMonitoring(async () => error("internal_error", "db failed", 500));
    const response = await wrapped(new Request("http://localhost/api/today"));
    expect(response.status).toBe(500);
    expect(emitMonitoringEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "api_error",
        status: 500,
        errorCode: "internal_error",
        errorMessage: "db failed",
      })
    );
  });

  it("reports latency threshold exceedance", async () => {
    getLatencyThresholdMsMock.mockReturnValue(1);
    const wrapped = withApiMonitoring(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return json({ ok: true });
    });

    const response = await wrapped(new Request("http://localhost/api/tasks"));
    expect(response.status).toBe(200);
    expect(emitMonitoringEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "api_latency",
        route: "/api/tasks",
      })
    );
  });

  it("reports unhandled exceptions and rethrows", async () => {
    const wrapped = withApiMonitoring(async () => {
      throw new Error("boom");
    });

    await expect(wrapped(new Request("http://localhost/api/tasks"))).rejects.toThrow("boom");
    expect(emitMonitoringEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "api_error",
        message: "Unhandled API exception",
      })
    );
  });
});
