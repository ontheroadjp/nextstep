import { afterAll, describe, expect, it } from "vitest";
import { loadDotEnvIfNeeded } from "./_helpers/env";
import { apiFetch, cleanup, getAccessToken, makePrefix, requireEnv } from "./_helpers/api";

const isEnabled = Boolean(process.env.INTEGRATION_TEST);

if (isEnabled) {
  loadDotEnvIfNeeded();
}

const TEST_EMAIL = process.env.TEST_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";

const suite = isEnabled ? describe : describe.skip;
const prefixes: string[] = [];

suite("integration api", () => {
  if (!isEnabled) return;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / TEST_EMAIL / TEST_PASSWORD");
  }

  it("creates and reads data across views", async () => {
    const prefix = makePrefix("IT");
    prefixes.push(prefix);
    const token = await getAccessToken(TEST_EMAIL, TEST_PASSWORD);

    const areaRes = await apiFetch("/api/areas", token, {
      method: "POST",
      body: JSON.stringify({ name: `${prefix}Area` }),
    });
    expect(areaRes.status).toBe(201);
    const area = await areaRes.json();
    const areaId = area.item.id as string;

    const projectRes = await apiFetch("/api/projects", token, {
      method: "POST",
      body: JSON.stringify({ name: `${prefix}Project`, note: `${prefix}Note`, areaId }),
    });
    expect(projectRes.status).toBe(201);
    const project = await projectRes.json();
    const projectId = project.item.id as string;

    const today = new Date().toISOString().slice(0, 10);
    const taskRes = await apiFetch("/api/tasks", token, {
      method: "POST",
      body: JSON.stringify({
        title: `${prefix}Today`,
        note: `${prefix}Note`,
        date: today,
        someday: false,
        areaId,
        projectId,
      }),
    });
    expect(taskRes.status).toBe(201);

    const todayRes = await apiFetch("/api/today", token, {
      headers: { "x-tz-offset-minutes": "540" },
    });
    expect(todayRes.status).toBe(200);
    const todayJson = await todayRes.json();
    expect(todayJson.items.some((t: { title: string }) => t.title.includes(prefix))).toBe(true);

    await cleanup(prefix, token);
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
