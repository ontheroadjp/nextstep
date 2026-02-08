import { checkApiProtectionRateLimit } from "../_lib/api_protection";
import { emitMonitoringEvent, getLatencyThresholdMs } from "../_lib/monitoring";

export type ApiErrorCode =
  | "not_implemented"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "too_many_requests"
  | "internal_error";

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, init);
}

export function error(code: ApiErrorCode, message: string, status = 400): Response {
  return json({ error: { code, message } }, { status });
}

export function notImplemented(message: string): Response {
  return error("not_implemented", message, 501);
}

type ApiRouteHandlerNoContext = (request: Request) => Promise<Response> | Response;
type ApiRouteHandlerWithContext<TContext> = (
  request: Request,
  context: TContext
) => Promise<Response> | Response;

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function extractErrorFields(response: Response): Promise<{
  code?: string;
  message?: string;
}> {
  try {
    const body = (await response.clone().json()) as ErrorBody;
    return { code: body.error?.code, message: body.error?.message };
  } catch {
    return {};
  }
}

export function withApiMonitoring(handler: ApiRouteHandlerNoContext): ApiRouteHandlerNoContext;
export function withApiMonitoring<TContext>(
  handler: ApiRouteHandlerWithContext<TContext>
): ApiRouteHandlerWithContext<TContext>;
export function withApiMonitoring<TContext>(
  handler: ApiRouteHandlerNoContext | ApiRouteHandlerWithContext<TContext>
) {
  return async (request: Request, context?: TContext): Promise<Response> => {
    const startedAt = Date.now();
    try {
      const protection = checkApiProtectionRateLimit(request);
      if (protection && !protection.allowed) {
        const route = new URL(request.url).pathname;
        const method = request.method;
        void emitMonitoringEvent({
          type: "api_rate_limited",
          severity: "warn",
          message: "API rate limit exceeded",
          method,
          route,
          status: 429,
        });
        return json(
          { error: { code: "too_many_requests", message: "Rate limit exceeded" } },
          {
            status: 429,
            headers: {
              "retry-after": String(protection.retryAfterSec),
              "x-rate-limit-limit": String(protection.limit),
              "x-rate-limit-remaining": String(protection.remaining),
              "x-rate-limit-reset": String(protection.resetAt),
            },
          }
        );
      }

      const response =
        context === undefined
          ? await (handler as ApiRouteHandlerNoContext)(request)
          : await (handler as ApiRouteHandlerWithContext<TContext>)(request, context);
      const durationMs = Date.now() - startedAt;
      const thresholdMs = getLatencyThresholdMs();
      const route = new URL(request.url).pathname;
      const method = request.method;
      const status = response.status;

      if (durationMs >= thresholdMs) {
        void emitMonitoringEvent({
          type: "api_latency",
          severity: "warn",
          message: "API latency threshold exceeded",
          method,
          route,
          status,
          durationMs,
        });
      }

      if (status === 401) {
        void emitMonitoringEvent({
          type: "api_auth_failure",
          severity: "warn",
          message: "API unauthorized response",
          method,
          route,
          status,
        });
      }

      if (status >= 500) {
        const fields = await extractErrorFields(response);
        void emitMonitoringEvent({
          type: "api_error",
          severity: "error",
          message: "API internal error response",
          method,
          route,
          status,
          errorCode: fields.code,
          errorMessage: fields.message,
        });
      }

      return response;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const route = new URL(request.url).pathname;
      const method = request.method;
      void emitMonitoringEvent({
        type: "api_error",
        severity: "error",
        message: "Unhandled API exception",
        method,
        route,
        status: 500,
        durationMs,
        errorMessage: err instanceof Error ? err.message : "Unknown exception",
      });
      throw err;
    }
  };
}
