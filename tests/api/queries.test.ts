import { describe, expect, it } from "vitest";
import {
  fetchAnytime,
  fetchInbox,
  fetchLogbook,
  fetchSomeday,
  fetchToday,
  fetchUpcoming,
} from "../../app/api/_queries";

type Call = {
  method: string;
  args: unknown[];
};

type Chain = {
  select: (...args: unknown[]) => Chain;
  eq: (...args: unknown[]) => Chain;
  is: (...args: unknown[]) => Chain;
  not: (...args: unknown[]) => Chain;
  lte: (...args: unknown[]) => Chain;
  gt: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
};

function createSupabaseRecorder() {
  const calls: Call[] = [];

  const chain: Chain = {
    select: (...args) => {
      calls.push({ method: "select", args });
      return chain;
    },
    eq: (...args) => {
      calls.push({ method: "eq", args });
      return chain;
    },
    is: (...args) => {
      calls.push({ method: "is", args });
      return chain;
    },
    not: (...args) => {
      calls.push({ method: "not", args });
      return chain;
    },
    lte: (...args) => {
      calls.push({ method: "lte", args });
      return chain;
    },
    gt: (...args) => {
      calls.push({ method: "gt", args });
      return chain;
    },
    order: (...args) => {
      calls.push({ method: "order", args });
      return chain;
    },
  };

  const supabase = {
    from: (...args: unknown[]) => {
      calls.push({ method: "from", args });
      return chain;
    },
  };

  return { supabase, calls };
}

function expectCallOrder(calls: Call[], expected: string[]) {
  let cursor = -1;
  for (const method of expected) {
    const idx = calls.findIndex((call, i) => i > cursor && call.method === method);
    expect(idx).toBeGreaterThan(cursor);
    cursor = idx;
  }
}

describe("_queries", () => {
  it("fetchToday builds expected conditions and filter clauses", async () => {
    const { supabase, calls } = createSupabaseRecorder();

    await fetchToday(supabase as never, "u1", "2026-02-07", {
      areaId: "a1",
      projectId: "p1",
    });

    const selectCall = calls.find((call) => call.method === "select");
    expect(typeof selectCall?.args[0]).toBe("string");
    expect(String(selectCall?.args[0])).toContain("deadline");

    expect(calls).toContainEqual({ method: "from", args: ["tasks"] });
    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
    expect(calls).toContainEqual({ method: "is", args: ["archived_at", null] });
    expect(calls).toContainEqual({ method: "eq", args: ["someday", false] });
    expect(calls).toContainEqual({ method: "not", args: ["date", "is", null] });
    expect(calls).toContainEqual({ method: "lte", args: ["date", "2026-02-07"] });
    expect(calls).toContainEqual({ method: "eq", args: ["area_id", "a1"] });
    expect(calls).toContainEqual({ method: "eq", args: ["project_id", "p1"] });
    expect(calls).toContainEqual({ method: "order", args: ["date", { ascending: true }] });
    expect(calls).toContainEqual({
      method: "order",
      args: ["sort_key", { ascending: true, nullsFirst: false }],
    });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: true }] });
    expectCallOrder(calls, ["from", "select", "eq", "is", "eq", "not", "lte", "order", "order", "order", "eq", "eq"]);
  });

  it("fetchUpcoming builds expected conditions and filter clauses", async () => {
    const { supabase, calls } = createSupabaseRecorder();

    await fetchUpcoming(supabase as never, "u1", "2026-02-07", {
      areaId: "a1",
      projectId: "p1",
    });

    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
    expect(calls).toContainEqual({ method: "is", args: ["archived_at", null] });
    expect(calls).toContainEqual({ method: "eq", args: ["someday", false] });
    expect(calls).toContainEqual({ method: "not", args: ["date", "is", null] });
    expect(calls).toContainEqual({ method: "gt", args: ["date", "2026-02-07"] });
    expect(calls).toContainEqual({ method: "eq", args: ["area_id", "a1"] });
    expect(calls).toContainEqual({ method: "eq", args: ["project_id", "p1"] });
    expect(calls).toContainEqual({ method: "order", args: ["date", { ascending: true }] });
    expect(calls).toContainEqual({
      method: "order",
      args: ["sort_key", { ascending: true, nullsFirst: false }],
    });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: true }] });
    expectCallOrder(calls, ["from", "select", "eq", "is", "eq", "not", "gt", "order", "order", "order", "eq", "eq"]);
  });

  it("fetchAnytime builds expected conditions and filter clauses", async () => {
    const { supabase, calls } = createSupabaseRecorder();

    await fetchAnytime(supabase as never, "u1", {
      areaId: "a1",
      projectId: "p1",
    });

    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
    expect(calls).toContainEqual({ method: "is", args: ["archived_at", null] });
    expect(calls).toContainEqual({ method: "eq", args: ["someday", false] });
    expect(calls).toContainEqual({ method: "is", args: ["date", null] });
    expect(calls).toContainEqual({ method: "eq", args: ["area_id", "a1"] });
    expect(calls).toContainEqual({ method: "eq", args: ["project_id", "p1"] });
    expect(calls).toContainEqual({
      method: "order",
      args: ["sort_key", { ascending: true, nullsFirst: false }],
    });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: true }] });
    expectCallOrder(calls, ["from", "select", "eq", "is", "eq", "is", "order", "order", "eq", "eq"]);
  });

  it("fetchSomeday builds expected conditions and filter clauses", async () => {
    const { supabase, calls } = createSupabaseRecorder();

    await fetchSomeday(supabase as never, "u1", {
      areaId: "a1",
      projectId: "p1",
    });

    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
    expect(calls).toContainEqual({ method: "is", args: ["archived_at", null] });
    expect(calls).toContainEqual({ method: "eq", args: ["someday", true] });
    expect(calls).toContainEqual({ method: "eq", args: ["area_id", "a1"] });
    expect(calls).toContainEqual({ method: "eq", args: ["project_id", "p1"] });
    expect(calls).toContainEqual({
      method: "order",
      args: ["sort_key", { ascending: true, nullsFirst: false }],
    });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: true }] });
    expectCallOrder(calls, ["from", "select", "eq", "is", "eq", "order", "order", "eq", "eq"]);
  });

  it("fetchLogbook builds expected conditions and filter clauses", async () => {
    const { supabase, calls } = createSupabaseRecorder();

    await fetchLogbook(supabase as never, "u1", {
      areaId: "a1",
      projectId: "p1",
    });

    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
    expect(calls).toContainEqual({ method: "not", args: ["archived_at", "is", null] });
    expect(calls).toContainEqual({ method: "eq", args: ["area_id", "a1"] });
    expect(calls).toContainEqual({ method: "eq", args: ["project_id", "p1"] });
    expect(calls).toContainEqual({ method: "order", args: ["archived_at", { ascending: false }] });
    expectCallOrder(calls, ["from", "select", "eq", "not", "order", "eq", "eq"]);
  });

  it("fetchInbox builds expected conditions", async () => {
    const { supabase, calls } = createSupabaseRecorder();

    await fetchInbox(supabase as never, "u1");

    expect(calls).toContainEqual({ method: "eq", args: ["user_id", "u1"] });
    expect(calls).toContainEqual({ method: "is", args: ["archived_at", null] });
    expect(calls).toContainEqual({ method: "is", args: ["area_id", null] });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
    expectCallOrder(calls, ["from", "select", "eq", "is", "is", "order"]);
  });
});
