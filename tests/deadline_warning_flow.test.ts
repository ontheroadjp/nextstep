import { describe, expect, it } from "vitest";
import {
  getOverdueReferenceDate,
  isDateAfterDeadline,
  shouldWarnSomedayWithDeadline,
} from "../app/_lib/deadline";

describe("deadline warning flow helpers", () => {
  it("detects date > deadline", () => {
    expect(isDateAfterDeadline("2026-02-10", "2026-02-09")).toBe(true);
    expect(isDateAfterDeadline("2026-02-09", "2026-02-09")).toBe(false);
    expect(isDateAfterDeadline("2026-02-08", "2026-02-09")).toBe(false);
  });

  it("returns false for empty or invalid date inputs", () => {
    expect(isDateAfterDeadline("", "2026-02-09")).toBe(false);
    expect(isDateAfterDeadline("2026/02/10", "2026-02-09")).toBe(false);
    expect(isDateAfterDeadline("2026-02-10", "")).toBe(false);
    expect(isDateAfterDeadline("2026-02-10", "2026/02/09")).toBe(false);
  });

  it("warns when moving to someday with deadline", () => {
    expect(shouldWarnSomedayWithDeadline("2026-02-09", true)).toBe(true);
    expect(shouldWarnSomedayWithDeadline("", true)).toBe(false);
    expect(shouldWarnSomedayWithDeadline("2026-02-09", false)).toBe(false);
  });

  it("uses deadline as overdue reference before date", () => {
    expect(getOverdueReferenceDate("2026-01-30", "2026-02-20")).toBe("2026-02-20");
    expect(getOverdueReferenceDate("2026-01-30", null)).toBe("2026-01-30");
    expect(getOverdueReferenceDate("", "2026-02-20")).toBe("2026-02-20");
    expect(getOverdueReferenceDate("", "")).toBeNull();
  });
});
