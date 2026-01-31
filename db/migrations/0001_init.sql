-- Initial schema for tasks, projects, areas, and checklists.
-- Run this single migration to recreate all tables and constraints.

create extension if not exists "pgcrypto";

-- Areas
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint areas_name_not_blank check (length(trim(name)) > 0),
  constraint areas_sort_key_not_blank check (sort_key is null or length(trim(sort_key)) > 0)
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  note text not null,
  area_id uuid null references areas(id) on delete set null,
  sort_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (length(trim(name)) > 0),
  constraint projects_note_not_blank check (length(trim(note)) > 0),
  constraint projects_sort_key_not_blank check (sort_key is null or length(trim(sort_key)) > 0)
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text not null,
  date date null,
  someday boolean not null default false,
  completed_at timestamptz null,
  archived_at timestamptz null,
  area_id uuid null references areas(id) on delete set null,
  project_id uuid null references projects(id) on delete set null,
  sort_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (length(trim(title)) > 0),
  constraint tasks_sort_key_not_blank check (sort_key is null or length(trim(sort_key)) > 0),
  -- Someday excludes date; date implies someday=false. date may be null with someday=false (Anytime).
  constraint tasks_someday_date_exclusive check (someday = false or date is null),
  constraint tasks_archived_requires_completed check (archived_at is null or completed_at is not null)
);

-- Checklists
create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklists_title_not_blank check (length(trim(title)) > 0),
  constraint checklists_sort_key_not_blank check (sort_key is null or length(trim(sort_key)) > 0)
);

-- Indexes
create index if not exists idx_tasks_date on tasks(date);
create index if not exists idx_tasks_user_id_date on tasks(user_id, date);
create index if not exists idx_tasks_someday on tasks(someday);
create index if not exists idx_tasks_completed_at on tasks(completed_at);
create index if not exists idx_tasks_archived_at on tasks(archived_at);
create index if not exists idx_tasks_user_id_completed_at_desc
  on tasks(user_id, completed_at desc)
  where completed_at is not null;
create index if not exists idx_tasks_area_id on tasks(area_id);
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_areas_user_id on areas(user_id);
create index if not exists idx_projects_area_id on projects(area_id);
create index if not exists idx_checklists_task_id on checklists(task_id);

-- updated_at auto-touch
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger areas_set_updated_at
before update on areas
for each row execute procedure set_updated_at();

create trigger projects_set_updated_at
before update on projects
for each row execute procedure set_updated_at();

create trigger tasks_set_updated_at
before update on tasks
for each row execute procedure set_updated_at();

create trigger checklists_set_updated_at
before update on checklists
for each row execute procedure set_updated_at();

-- RLS
alter table areas enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table checklists enable row level security;

create policy areas_select on areas
  for select using (user_id = auth.uid());
create policy areas_insert on areas
  for insert with check (user_id = auth.uid());
create policy areas_update on areas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy areas_delete on areas
  for delete using (user_id = auth.uid());

create policy projects_select on projects
  for select using (user_id = auth.uid());
create policy projects_insert on projects
  for insert with check (user_id = auth.uid());
create policy projects_update on projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy projects_delete on projects
  for delete using (user_id = auth.uid());

create policy tasks_select on tasks
  for select using (user_id = auth.uid());
create policy tasks_insert on tasks
  for insert with check (user_id = auth.uid());
create policy tasks_update on tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_delete on tasks
  for delete using (user_id = auth.uid());

create policy checklists_select on checklists
  for select using (
    exists (
      select 1 from tasks t
      where t.id = checklists.task_id
        and t.user_id = auth.uid()
    )
  );
create policy checklists_insert on checklists
  for insert with check (
    exists (
      select 1 from tasks t
      where t.id = checklists.task_id
        and t.user_id = auth.uid()
    )
  );
create policy checklists_update on checklists
  for update using (
    exists (
      select 1 from tasks t
      where t.id = checklists.task_id
        and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from tasks t
      where t.id = checklists.task_id
        and t.user_id = auth.uid()
    )
  );
create policy checklists_delete on checklists
  for delete using (
    exists (
      select 1 from tasks t
      where t.id = checklists.task_id
        and t.user_id = auth.uid()
    )
  );
