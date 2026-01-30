-- Apply sort_key constraints and indexes to existing DB (for already-initialized projects).
-- Run once on an existing environment when you cannot re-run 0001_init.sql.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'areas_sort_key_not_blank') then
    alter table areas
      add constraint areas_sort_key_not_blank
      check (sort_key is null or length(trim(sort_key)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_sort_key_not_blank') then
    alter table projects
      add constraint projects_sort_key_not_blank
      check (sort_key is null or length(trim(sort_key)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_sort_key_not_blank') then
    alter table tasks
      add constraint tasks_sort_key_not_blank
      check (sort_key is null or length(trim(sort_key)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'checklists_sort_key_not_blank') then
    alter table checklists
      add constraint checklists_sort_key_not_blank
      check (sort_key is null or length(trim(sort_key)) > 0);
  end if;
end $$;

create index if not exists idx_tasks_user_id_date on tasks(user_id, date);
create index if not exists idx_tasks_user_id_completed_at_desc
  on tasks(user_id, completed_at desc)
  where completed_at is not null;
