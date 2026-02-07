import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("view page header category cards", () => {
  const source = read("../app/(views)/[view]/page.tsx");

  it("renders a single category card below PageMidHeader", () => {
    expect(source).toContain("<PageMidHeader title={pageTitle} />");
    expect(source).toContain('className="grid view-switcher-grid"');
    expect(source).toContain("const headerCard = useMemo(() => {");
    expect(source).toContain('title={headerCard.title}');
  });

  it("switches card title by current view", () => {
    expect(source).toContain('if (view === "today")');
    expect(source).toContain('title: "Today"');
    expect(source).toContain('if (view === "upcoming")');
    expect(source).toContain('title: "Upcoming"');
    expect(source).toContain('if (view === "anytime")');
    expect(source).toContain('title: "Anytime"');
    expect(source).toContain('if (view === "someday")');
    expect(source).toContain('title: "Someday"');
    expect(source).toContain('if (view === "logbook")');
    expect(source).toContain('title: "Logbook"');
    expect(source).toContain('title: "Inbox"');
  });

  it("adds a no-group class for unassigned task section", () => {
    expect(source).toContain('group.key === "nogroup" ? " no-group-card" : ""');
  });
});
