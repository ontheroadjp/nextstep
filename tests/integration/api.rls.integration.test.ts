import { afterAll, describe, expect, it } from "vitest";
import { loadDotEnvIfNeeded } from "./_helpers/env";
import { apiFetch, cleanup, getAccessToken, makePrefix, requireEnv } from "./_helpers/api";

const isEnabled = Boolean(process.env.INTEGRATION_TEST);

if (isEnabled) {
  loadDotEnvIfNeeded();
}

const suite = isEnabled ? describe : describe.skip;
const prefixes: string[] = [];

const TEST_EMAIL = process.env.TEST_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";
const TEST_EMAIL_2 = process.env.TEST_EMAIL_2 || "";
const TEST_PASSWORD_2 = process.env.TEST_PASSWORD_2 || "";

suite("integration api rls/logbook", () => {
  if (!isEnabled) return;
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_ANON_KEY ||
    !TEST_EMAIL ||
    !TEST_PASSWORD ||
    !TEST_EMAIL_2 ||
    !TEST_PASSWORD_2
  ) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_ANON_KEY / TEST_EMAIL / TEST_PASSWORD / TEST_EMAIL_2 / TEST_PASSWORD_2"
    );
  }

  it("isolates data between users", async () => {
    const prefix = makePrefix("RLS");
    prefixes.push(prefix);
    const token1 = await getAccessToken(TEST_EMAIL, TEST_PASSWORD);
    const token2 = await getAccessToken(TEST_EMAIL_2, TEST_PASSWORD_2);

    const areaRes = await apiFetch("/api/areas", token1, {
      method: "POST",
      body: JSON.stringify({ name: `${prefix}Area` }),
    });
    expect(areaRes.status).toBe(201);

    const listRes = await apiFetch("/api/areas", token2);
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.items.some((a: { name: string }) => a.name.includes(prefix))).toBe(false);
  });

  it("completed tasks appear only in logbook", async () => {
    const prefix = makePrefix("LOG");
    prefixes.push(prefix);
    const token = await getAccessToken(TEST_EMAIL, TEST_PASSWORD);
    const today = new Date().toISOString().slice(0, 10);

    const taskRes = await apiFetch("/api/tasks", token, {
      method: "POST",
      body: JSON.stringify({
        title: `${prefix}Task`,
        note: `${prefix}Note`,
        date: today,
        someday: false,
      }),
    });
    expect(taskRes.status).toBe(201);
    const taskJson = await taskRes.json();
    const taskId = taskJson.item.id as string;

    const completeRes = await apiFetch(`/api/tasks/${taskId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ completedAt: new Date().toISOString() }),
    });
    expect(completeRes.status).toBe(200);

    const todayRes = await apiFetch("/api/today", token, {
      headers: { "x-tz-offset-minutes": "540" },
    });
    expect(todayRes.status).toBe(200);
    const todayJson = await todayRes.json();
    expect(todayJson.items.some((t: { title: string }) => t.title.includes(prefix))).toBe(true);

    const logbookRes = await apiFetch("/api/logbook", token);
    expect(logbookRes.status).toBe(200);
    const logbookJson = await logbookRes.json();
    expect(logbookJson.items.some((t: { title: string }) => t.title.includes(prefix))).toBe(false);

    const archiveRes = await apiFetch(`/api/tasks/${taskId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    });
    expect(archiveRes.status).toBe(200);

    const todayRes2 = await apiFetch("/api/today", token, {
      headers: { "x-tz-offset-minutes": "540" },
    });
    expect(todayRes2.status).toBe(200);
    const todayJson2 = await todayRes2.json();
    expect(todayJson2.items.some((t: { title: string }) => t.title.includes(prefix))).toBe(false);

    const logbookRes2 = await apiFetch("/api/logbook", token);
    expect(logbookRes2.status).toBe(200);
    const logbookJson2 = await logbookRes2.json();
    expect(logbookJson2.items.some((t: { title: string }) => t.title.includes(prefix))).toBe(true);
  });

  it("rejects mismatched areaId and projectId", async () => {
    const prefix = makePrefix("REL");
    prefixes.push(prefix);
    const token = await getAccessToken(TEST_EMAIL, TEST_PASSWORD);

    const areaRes = await apiFetch("/api/areas", token, {
      method: "POST",
      body: JSON.stringify({ name: `${prefix}AreaA` }),
    });
    expect(areaRes.status).toBe(201);
    const areaJson = await areaRes.json();
    const areaA = areaJson.item.id as string;

    const areaRes2 = await apiFetch("/api/areas", token, {
      method: "POST",
      body: JSON.stringify({ name: `${prefix}AreaB` }),
    });
    expect(areaRes2.status).toBe(201);
    const areaJson2 = await areaRes2.json();
    const areaB = areaJson2.item.id as string;

    const projectRes = await apiFetch("/api/projects", token, {
      method: "POST",
      body: JSON.stringify({ name: `${prefix}Project`, note: `${prefix}Note`, areaId: areaA }),
    });
    expect(projectRes.status).toBe(201);
    const projectJson = await projectRes.json();
    const projectId = projectJson.item.id as string;

    const taskRes = await apiFetch("/api/tasks", token, {
      method: "POST",
      body: JSON.stringify({
        title: `${prefix}Task`,
        note: `${prefix}Note`,
        projectId,
        areaId: areaB,
      }),
    });
    expect(taskRes.status).toBe(400);
  });

  afterAll(async () => {
    try {
      const token = await getAccessToken(requireEnv("TEST_EMAIL"), requireEnv("TEST_PASSWORD"));
      for (const prefix of prefixes) {
        await cleanup(prefix, token);
      }
    } catch {
      // ignore cleanup errors
    }
  });
});
