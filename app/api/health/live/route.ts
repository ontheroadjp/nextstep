import { json } from "../../_utils";

export async function GET(_request: Request): Promise<Response> {
  return json({
    status: "ok",
    checks: {
      app: "up",
    },
  });
}
