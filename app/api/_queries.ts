import type { SupabaseClient } from "@supabase/supabase-js";

export function baseTaskSelect() {
  return "id,title,note,date,deadline,someday,completed_at,archived_at,created_at,area_id,project_id,sort_key";
}

export async function fetchToday(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  filters: { areaId?: string; projectId?: string } = {}
) {
  let query = supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("someday", false)
    .not("date", "is", null)
    .lte("date", today)
    .order("date", { ascending: true })
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);

  return query;
}

export async function fetchUpcoming(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  filters: { areaId?: string; projectId?: string } = {}
) {
  let query = supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("someday", false)
    .not("date", "is", null)
    .gt("date", today)
    .order("date", { ascending: true })
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);

  return query;
}

export async function fetchAnytime(
  supabase: SupabaseClient,
  userId: string,
  filters: { areaId?: string; projectId?: string } = {}
) {
  let query = supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("someday", false)
    .is("date", null)
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);

  return query;
}

export async function fetchSomeday(
  supabase: SupabaseClient,
  userId: string,
  filters: { areaId?: string; projectId?: string } = {}
) {
  let query = supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("someday", true)
    .order("sort_key", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);

  return query;
}

export async function fetchLogbook(
  supabase: SupabaseClient,
  userId: string,
  filters: { areaId?: string; projectId?: string } = {}
) {
  let query = supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);

  return query;
}

export async function fetchInbox(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("tasks")
    .select(baseTaskSelect())
    .eq("user_id", userId)
    .is("archived_at", null)
    .is("area_id", null)
    .order("created_at", { ascending: false });
}
