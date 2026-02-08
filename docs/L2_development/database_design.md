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

## マイグレーション運用手順
- 適用順序は固定:
  1. `db/migrations/0001_init.sql`
  2. `db/maintenance/0002_apply_sort_key_constraints.sql`
  3. `db/maintenance/0003_archive_flow.sql`
- 実行コマンド:
  - Dry-run: `npm run db:migrate:dry`
  - Apply: `npm run db:migrate`
- バックアップ/ロールバック:
  - Backup: `npm run db:backup -- --output <path/to/backup.sql>`
  - Rollback (SQL restore): `npm run db:rollback -- --input <path/to/backup.sql>`
- 実行時は `DATABASE_URL` が必須。

根拠: `scripts/db_migrate.sh`, `scripts/db_backup.sh`, `scripts/db_rollback.sh`, `package.json`
