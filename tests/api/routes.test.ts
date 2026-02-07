import { describe, expect, it, vi } from "vitest";

vi.mock("../../app/api/_supabase", () => ({
  createServerClient: () => ({}),
}));

vi.mock("../../app/api/_helpers", () => ({
  requireUserContext: async () => ({ userId: "u1", accessToken: "token" }),
  mapTask: (row: Record<string, unknown>) => row,
  todayFromRequest: () => "2026-01-30",
}));

vi.mock("../../app/api/_queries", () => ({
  fetchToday: async () => ({ data: [], error: null }),
  fetchUpcoming: async () => ({ data: [], error: null }),
  fetchAnytime: async () => ({ data: [], error: null }),
  fetchSomeday: async () => ({ data: [], error: null }),
  fetchLogbook: async () => ({ data: [], error: null }),
  fetchInbox: async () => ({ data: [], error: null }),
}));

import { GET as todayGET } from "../../app/api/today/route";
import { GET as upcomingGET } from "../../app/api/upcoming/route";
import { GET as anytimeGET } from "../../app/api/anytime/route";
import { GET as somedayGET } from "../../app/api/someday/route";
import { GET as logbookGET } from "../../app/api/logbook/route";
import { GET as inboxGET } from "../../app/api/inbox/route";
import { GET as areaTodayGET } from "../../app/api/areas/[areaId]/today/route";
import { GET as areaUpcomingGET } from "../../app/api/areas/[areaId]/upcoming/route";
import { GET as projectTodayGET } from "../../app/api/projects/[projectId]/today/route";
import { GET as projectUpcomingGET } from "../../app/api/projects/[projectId]/upcoming/route";

describe("route smoke tests", () => {
  const req = new Request("http://localhost");

  it("today/upcoming/anytime/someday/logbook/inbox return 200", async () => {
    expect((await todayGET(req)).status).toBe(200);
    expect((await upcomingGET(req)).status).toBe(200);
    expect((await anytimeGET(req)).status).toBe(200);
    expect((await somedayGET(req)).status).toBe(200);
    expect((await logbookGET(req)).status).toBe(200);
    expect((await inboxGET(req)).status).toBe(200);
  });

  it("area/project filtered routes return 200", async () => {
    expect((await areaTodayGET(req, { params: Promise.resolve({ areaId: "a1" }) })).status).toBe(200);
    expect((await areaUpcomingGET(req, { params: Promise.resolve({ areaId: "a1" }) })).status).toBe(200);
    expect((await projectTodayGET(req, { params: Promise.resolve({ projectId: "p1" }) })).status).toBe(200);
    expect((await projectUpcomingGET(req, { params: Promise.resolve({ projectId: "p1" }) })).status).toBe(200);
  });
});
