import { describe, expect, it } from "vitest";
import HomePage from "../../app/page";
import { nonEmptyString } from "../../app/api/_helpers";
import { error } from "../../app/api/_utils";

describe("smoke: entrypoints", () => {
  it("app page exports a component", () => {
    expect(typeof HomePage).toBe("function");
  });

  it("api helpers export functions", () => {
    expect(typeof nonEmptyString).toBe("function");
  });

  it("api utils can build error responses", async () => {
    const res = error("bad_request", "smoke", 400);
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    expect(res.status).toBe(400);
    expect(body.error?.code).toBe("bad_request");
  });
});
