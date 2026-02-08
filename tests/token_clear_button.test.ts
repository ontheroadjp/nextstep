import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("auth footer login/logout", () => {
  const targets = [
    "../app/page.tsx",
    "../app/(views)/[view]/page.tsx",
    "../app/areas/[areaId]/page.tsx",
    "../app/projects/[projectId]/page.tsx",
  ];

  it("defines login/logout behavior in shared footer component", () => {
    const source = read("../app/_components/AccessSettingsFooter.tsx");
    expect(source).toContain("Refresh");
    expect(source).toContain("Login");
    expect(source).toContain("Logout");
    expect(source).toContain("Email");
    expect(source).toContain("Password");
    expect(source).toContain("authProvider");
    expect(source).not.toContain("Access Token");
    expect(source).not.toContain("Refresh Token");
  });

  it.each(targets)("uses shared footer component in %s", (path) => {
    const source = read(path);
    expect(source).toContain("AccessSettingsFooter");
  });
});
