import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("someday grouping sort rule", () => {
  it("uses the same group sort rule as today (no someday-only branch)", () => {
    const source = read("../app/(views)/[view]/page.tsx");
    expect(source).toContain("const sortedNoGroup = sortMixedByDateAndCreated(noGroup);");
    expect(source).toContain("const items = sortMixedByDateAndCreated(group.items);");
    expect(source).not.toContain('view === "someday" ? sortDatedByDateAscThenCreatedDesc');
  });
});
