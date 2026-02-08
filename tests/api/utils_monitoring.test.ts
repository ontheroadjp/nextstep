import { beforeEach, describe, expect, it, vi } from "vitest";

const { emitMonitoringEventMock, getLatencyThresholdMsMock } = vi.hoisted(() => ({
  emitMonitoringEventMock: vi.fn(async () => {}),
  getLatencyThresholdMsMock: vi.fn(() => 10),
}));

vi.mock("../../app/_lib/monitoring", () => ({
  emitMonitoringEvent: emitMonitoringEventMock,
  getLatencyThresholdMs: getLatencyThresholdMsMock,
}));

import { error, json, withApiMonitoring } from "../../app/api/_utils";

describe("withApiMonitoring", () => {
  beforeEach(() => {
    emitMonitoringEventMock.mockClear();
    getLatencyThresholdMsMock.mockReset();
    getLatencyThresholdMsMock.mockReturnValue(10);
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
