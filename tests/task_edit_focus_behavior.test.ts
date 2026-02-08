import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("task edit focus behavior", () => {
  it("does not force select-all on edit inputs in view page", () => {
    const source = read("../app/(views)/[view]/page.tsx");
    expect(source).toContain("target.focus();");
    expect(source).not.toContain("target.select();");
  });
});
