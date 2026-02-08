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

  it("defines Clear button behavior in shared footer component", () => {
    const source = read("../app/_components/AccessSettingsFooter.tsx");
    expect(source).toContain("Refresh");
    expect(source).toContain("Clear");
    expect(source).toContain('setAccessToken("")');
    expect(source).toContain('setRefreshToken("")');
    expect(source).toContain("type AuthState");
    expect(source).toContain("refresh_missing");
    expect(source).toContain("access_missing");
  });

  it.each(targets)("uses shared footer component in %s", (path) => {
    const source = read(path);
    expect(source).toContain("AccessSettingsFooter");
  });
});
