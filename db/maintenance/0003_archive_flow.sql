-- Add archived_at and relax task note constraint for existing environments.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'archived_at'
  ) then
    alter table tasks add column archived_at timestamptz null;
  end if;

  if exists (select 1 from pg_constraint where conname = 'tasks_note_not_blank') then
    alter table tasks drop constraint tasks_note_not_blank;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_archived_requires_completed') then
    alter table tasks
      add constraint tasks_archived_requires_completed
      check (archived_at is null or completed_at is not null);
  end if;
end $$;

create index if not exists idx_tasks_archived_at on tasks(archived_at);
