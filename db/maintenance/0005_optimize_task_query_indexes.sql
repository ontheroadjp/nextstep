-- Add partial/compound indexes aligned with current task list query patterns.
-- Safe to run repeatedly.

create index if not exists idx_tasks_today_lookup
  on tasks(user_id, date, sort_key, created_at)
  where archived_at is null and someday = false and date is not null;

create index if not exists idx_tasks_anytime_lookup
  on tasks(user_id, sort_key, created_at)
  where archived_at is null and someday = false and date is null;

create index if not exists idx_tasks_someday_lookup
  on tasks(user_id, sort_key, created_at)
  where archived_at is null and someday = true;

create index if not exists idx_tasks_logbook_lookup
  on tasks(user_id, archived_at desc)
  where archived_at is not null;

create index if not exists idx_tasks_inbox_lookup
  on tasks(user_id, created_at desc)
  where archived_at is null and area_id is null;
