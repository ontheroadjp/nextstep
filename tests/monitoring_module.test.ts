import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emitMonitoringEvent,
  formatSlackText,
  resetMonitoringStateForTests,
  shouldNotifySlack,
  type MonitorEvent,
} from "../app/_lib/monitoring";

describe("monitoring module", () => {
  beforeEach(() => {
    resetMonitoringStateForTests();
    delete process.env.MONITORING_SLACK_WEBHOOK_URL;
    delete process.env.MONITORING_SLACK_COOLDOWN_MS;
    vi.restoreAllMocks();
  });

  it("applies cooldown per key", () => {
    expect(shouldNotifySlack("k1", 1000, 5000)).toBe(true);
    expect(shouldNotifySlack("k1", 2000, 5000)).toBe(false);
    expect(shouldNotifySlack("k1", 7000, 5000)).toBe(true);
  });

  it("formats Slack text with event fields", () => {
    const text = formatSlackText(
      {
        type: "api_error",
        severity: "error",
        message: "API internal error response",
        method: "GET",
        route: "/api/today",
        status: 500,
        durationMs: 1234,
        errorCode: "internal_error",
      },
      "2026-02-08T00:00:00.000Z"
    );
    expect(text).toContain("[monitoring/error] api_error");
    expect(text).toContain("method=GET");
    expect(text).toContain("route=/api/today");
    expect(text).toContain("status=500");
    expect(text).toContain("durationMs=1234");
    expect(text).toContain("errorCode=internal_error");
  });

  it("posts to Slack when webhook is configured", async () => {
    process.env.MONITORING_SLACK_WEBHOOK_URL = "https://example.test/webhook";
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const event: MonitorEvent = {
      type: "api_auth_failure",
      severity: "warn",
      message: "API unauthorized response",
      method: "GET",
      route: "/api/today",
      status: 401,
    };

    await emitMonitoringEvent(event);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://example.test/webhook");
  });

  it("suppresses duplicate Slack notifications in cooldown window", async () => {
    process.env.MONITORING_SLACK_WEBHOOK_URL = "https://example.test/webhook";
    process.env.MONITORING_SLACK_COOLDOWN_MS = "60000";
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const event: MonitorEvent = {
      type: "api_latency",
      severity: "warn",
      message: "API latency threshold exceeded",
      method: "POST",
      route: "/api/tasks",
      status: 200,
      durationMs: 2200,
    };

    await emitMonitoringEvent(event);
    await emitMonitoringEvent(event);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
