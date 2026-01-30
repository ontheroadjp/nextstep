import { describe, expect, it, vi } from "vitest";
import { nonEmptyString, normalizeSomedayDate, todayFromRequest } from "../app/api/_helpers";

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

describe("normalizeSomedayDate", () => {
  it("forces date=null when someday=true", () => {
    expect(normalizeSomedayDate({ date: "2026-01-30", someday: true })).toEqual({
      date: null,
      someday: true,
    });
  });

  it("forces someday=false when date is set", () => {
    expect(normalizeSomedayDate({ date: "2026-01-30", someday: false })).toEqual({
      date: "2026-01-30",
      someday: false,
    });
  });

  it("keeps values when neither is set", () => {
    expect(normalizeSomedayDate({})).toEqual({
      date: undefined,
      someday: undefined,
    });
  });

  it("keeps date when someday is undefined", () => {
    expect(normalizeSomedayDate({ date: "2026-01-30" })).toEqual({
      date: "2026-01-30",
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
