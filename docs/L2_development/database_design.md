# Database Design

## 使用データベース
- Supabase (PostgreSQL)

根拠: `db/migrations/0001_init.sql`, `app/api/_supabase.ts`

## テーブル
- `areas`
- `projects`
- `tasks`
- `checklists`

根拠: `db/migrations/0001_init.sql`

## 主要カラムと制約（抜粋）
- `areas.name`: 必須、空白不可
- `projects.name`: 必須、空白不可
- `projects.note`: 必須、空白不可
- `tasks.title`: 必須、空白不可
- `tasks.someday` と `tasks.date` は排他（`someday = true` の場合 `date is null`）
- `tasks.archived_at` がある場合 `completed_at` 必須
- `sort_key` は任意だが空白不可

根拠: `db/migrations/0001_init.sql`, `db/maintenance/0002_apply_sort_key_constraints.sql`, `db/maintenance/0003_archive_flow.sql`

## RLS（Row Level Security）
- `areas/projects/tasks` は `user_id = auth.uid()` のみアクセス可能
- `checklists` は親 `tasks` の `user_id` に基づいてアクセス制御

根拠: `db/migrations/0001_init.sql`

## インデックス（抜粋）
- `tasks(user_id, date)`
- `tasks(user_id, completed_at desc)`
- `tasks(archived_at)`
- `tasks(area_id)` / `tasks(project_id)`
- `checklists(task_id)`

根拠: `db/migrations/0001_init.sql`, `db/maintenance/0002_apply_sort_key_constraints.sql`, `db/maintenance/0003_archive_flow.sql`

## 未確認事項
- 実運用のマイグレーション適用手順
  - 追加確認候補: README, 運用手順書
