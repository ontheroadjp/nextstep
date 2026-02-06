import { describe, expect, it } from "vitest";
import { formatOverdueDaysAgo } from "../app/_lib/overdue";

describe("formatOverdueDaysAgo", () => {
  it("returns 1d ago for yesterday", () => {
    expect(formatOverdueDaysAgo("2026-02-05", "2026-02-06")).toBe("1d ago");
  });

  it("returns 6d ago for six days old date", () => {
    expect(formatOverdueDaysAgo("2026-01-31", "2026-02-06")).toBe("6d ago");
  });

  it("returns null for today", () => {
    expect(formatOverdueDaysAgo("2026-02-06", "2026-02-06")).toBeNull();
  });

  it("returns null for future date", () => {
    expect(formatOverdueDaysAgo("2026-02-07", "2026-02-06")).toBeNull();
  });
});

