import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("access token clear button", () => {
  const targets = [
    "../app/page.tsx",
    "../app/(views)/[view]/page.tsx",
    "../app/areas/[areaId]/page.tsx",
    "../app/projects/[projectId]/page.tsx",
  ];

  it.each(targets)("adds Clear button next to Refresh in %s", (path) => {
    const source = read(path);
    expect(source).toContain("Refresh");
    expect(source).toContain("Clear");
    expect(source).toContain('onClick={() => setToken("")}');
  });
});
