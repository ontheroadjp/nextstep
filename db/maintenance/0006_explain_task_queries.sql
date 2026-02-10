-- Query plan inspection template for task list endpoints.
-- Fill <user_id>/<today>/<area_id>/<project_id> and run in the target DB.

explain (analyze, buffers)
select id, title, note, date, deadline, someday, completed_at, archived_at, created_at, area_id, project_id, sort_key
from tasks
where user_id = '<user_id>'
  and archived_at is null
  and someday = false
  and date is not null
  and date <= '<today>'
order by date asc, sort_key asc nulls last, created_at asc;

explain (analyze, buffers)
select id, title, note, date, deadline, someday, completed_at, archived_at, created_at, area_id, project_id, sort_key
from tasks
where user_id = '<user_id>'
  and archived_at is null
  and someday = false
  and date is null
order by sort_key asc nulls last, created_at asc;

explain (analyze, buffers)
select id, title, note, date, deadline, someday, completed_at, archived_at, created_at, area_id, project_id, sort_key
from tasks
where user_id = '<user_id>'
  and archived_at is null
  and someday = true
order by sort_key asc nulls last, created_at asc;

explain (analyze, buffers)
select id, title, note, date, deadline, someday, completed_at, archived_at, created_at, area_id, project_id, sort_key
from tasks
where user_id = '<user_id>'
  and archived_at is not null
order by archived_at desc;
