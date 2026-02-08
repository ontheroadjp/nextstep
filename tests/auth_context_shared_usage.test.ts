import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("shared auth context usage", () => {
  const targets = [
    "../app/page.tsx",
    "../app/(views)/[view]/page.tsx",
    "../app/areas/[areaId]/page.tsx",
    "../app/projects/[projectId]/page.tsx",
  ];

  it.each(targets)("uses useClientAuth in %s", (path) => {
    const source = read(path);
    expect(source).toContain("useClientAuth");
    expect(source).not.toContain('useStoredValue("ns-access-token"');
    expect(source).not.toContain('useStoredValue("ns-refresh-token"');
    expect(source).not.toContain('useStoredValue("ns-tz-offset"');
  });

  it("builds tz headers in one shared hook", () => {
    const source = read("../app/_hooks/useClientAuth.ts");
    expect(source).toContain('next.set("x-tz-offset-minutes", offset)');
  });
});
