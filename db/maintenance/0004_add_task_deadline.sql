-- Add tasks.deadline and update someday/date constraint for existing environments.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tasks' and column_name = 'deadline'
  ) then
    alter table tasks add column deadline date null;
  end if;

  if exists (select 1 from pg_constraint where conname = 'tasks_someday_date_exclusive') then
    alter table tasks drop constraint tasks_someday_date_exclusive;
  end if;

  alter table tasks
    add constraint tasks_someday_date_exclusive
    check (someday = false or (date is null and deadline is null));
end $$;
