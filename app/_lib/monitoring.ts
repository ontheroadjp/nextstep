export type MonitorEventType = "api_error" | "api_auth_failure" | "api_latency";
export type MonitorSeverity = "info" | "warn" | "error";

export type MonitorEvent = {
  type: MonitorEventType;
  severity: MonitorSeverity;
  message: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
};

type SlackPayload = {
  text: string;
};

const lastNotifiedAtByKey = new Map<string, number>();

export function resetMonitoringStateForTests(): void {
  lastNotifiedAtByKey.clear();
}

function parseNumber(value: string | undefined, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function getMonitoringConfig() {
  return {
    slackWebhookUrl: process.env.MONITORING_SLACK_WEBHOOK_URL ?? "",
    slackCooldownMs: parseNumber(process.env.MONITORING_SLACK_COOLDOWN_MS, 60_000),
  };
}

export function shouldNotifySlack(key: string, now: number, cooldownMs: number): boolean {
  const last = lastNotifiedAtByKey.get(key);
  if (last !== undefined && now - last < cooldownMs) {
    return false;
  }
  lastNotifiedAtByKey.set(key, now);
  return true;
}

export function formatSlackText(event: MonitorEvent, timestamp: string): string {
  const parts = [
    `[monitoring/${event.severity}] ${event.type}`,
    `message=${event.message}`,
    `time=${timestamp}`,
  ];

  if (event.method) parts.push(`method=${event.method}`);
  if (event.route) parts.push(`route=${event.route}`);
  if (event.status !== undefined) parts.push(`status=${String(event.status)}`);
  if (event.durationMs !== undefined) parts.push(`durationMs=${String(event.durationMs)}`);
  if (event.errorCode) parts.push(`errorCode=${event.errorCode}`);
  if (event.errorMessage) parts.push(`errorMessage=${event.errorMessage}`);

  return parts.join("\n");
}

function createSlackPayload(event: MonitorEvent, timestamp: string): SlackPayload {
  return { text: formatSlackText(event, timestamp) };
}

export async function emitMonitoringEvent(event: MonitorEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  const payloadForLog = { ...event, timestamp };
  const logger = event.severity === "error" ? console.error : event.severity === "warn" ? console.warn : console.info;
  logger(JSON.stringify({ monitoring: payloadForLog }));

  const { slackWebhookUrl, slackCooldownMs } = getMonitoringConfig();
  if (!slackWebhookUrl) return;

  const key = `${event.type}:${event.method ?? "-"}:${event.route ?? "-"}:${String(event.status ?? "-")}`;
  if (!shouldNotifySlack(key, Date.now(), slackCooldownMs)) return;

  try {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createSlackPayload(event, timestamp)),
    });
    if (!response.ok) {
      console.warn(
        JSON.stringify({
          monitoring: {
            type: "monitoring_delivery_failed",
            severity: "warn",
            message: "Slack webhook response was not ok",
            status: response.status,
            timestamp,
          },
        })
      );
    }
  } catch (err) {
    console.warn(
      JSON.stringify({
        monitoring: {
          type: "monitoring_delivery_failed",
          severity: "warn",
          message: err instanceof Error ? err.message : "Unknown monitoring delivery error",
          timestamp,
        },
      })
    );
  }
}

export function getLatencyThresholdMs(): number {
  return parseNumber(process.env.MONITORING_LATENCY_THRESHOLD_MS, 1500);
}
