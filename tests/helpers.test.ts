import { describe, expect, it, vi } from "vitest";
import { nonEmptyString, normalizeTaskSchedule, todayFromRequest } from "../app/api/_helpers";

describe("nonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(nonEmptyString("a")).toBe(true);
    expect(nonEmptyString("  a  ")).toBe(true);
  });

  it("returns false for empty or whitespace-only strings", () => {
    expect(nonEmptyString("")).toBe(false);
    expect(nonEmptyString("   ")).toBe(false);
    expect(nonEmptyString(null)).toBe(false);
    expect(nonEmptyString(undefined)).toBe(false);
  });
});

describe("normalizeTaskSchedule", () => {
  it("forces date=null when someday=true", () => {
    expect(
      normalizeTaskSchedule({
        date: "2026-01-30",
        deadline: "2026-02-01",
        someday: true,
      })
    ).toEqual({
      date: null,
      deadline: null,
      someday: true,
    });
  });

  it("forces someday=false when date is set", () => {
    expect(
      normalizeTaskSchedule({
        date: "2026-01-30",
        deadline: "2026-02-01",
        someday: false,
      })
    ).toEqual({
      date: "2026-01-30",
      deadline: "2026-02-01",
      someday: false,
    });
  });

  it("keeps values when neither is set", () => {
    expect(normalizeTaskSchedule({})).toEqual({
      date: undefined,
      deadline: undefined,
      someday: undefined,
    });
  });

  it("keeps date when someday is undefined", () => {
    expect(normalizeTaskSchedule({ date: "2026-01-30", deadline: "2026-01-31" })).toEqual({
      date: "2026-01-30",
      deadline: "2026-01-31",
      someday: false,
    });
  });
});

describe("todayFromRequest", () => {
  it("uses UTC when no offset header is provided", () => {
    const now = new Date("2026-01-30T12:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const req = new Request("http://localhost");
    expect(todayFromRequest(req)).toBe("2026-01-30");
  });

  it("applies offset minutes header", () => {
    const now = new Date("2026-01-30T00:30:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const req = new Request("http://localhost", {
      headers: { "x-tz-offset-minutes": "540" },
    });
    // 00:30Z + 9h = 09:30 JST, same date
    expect(todayFromRequest(req)).toBe("2026-01-30");
  });
});
