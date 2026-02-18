import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("home overdue rule", () => {
  it("uses deadline-aware reference date in top splitOverdue", () => {
    const source = readFileSync("app/top/page.tsx", "utf8");
    expect(source).toContain("const refDate = getOverdueReferenceDate(item.date, item.deadline);");
    expect(source).toContain("if (refDate && refDate < today)");
  });
});
