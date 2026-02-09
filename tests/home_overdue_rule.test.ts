import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("home overdue rule", () => {
  it("uses deadline-aware reference date in splitOverdue", () => {
    const source = readFileSync("app/page.tsx", "utf8");
    expect(source).toContain("const refDate = getOverdueReferenceDate(item.date, item.deadline);");
    expect(source).toContain("if (refDate && refDate < today)");
  });
});
