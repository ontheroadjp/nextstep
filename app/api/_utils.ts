export type ApiErrorCode =
  | "not_implemented"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
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
