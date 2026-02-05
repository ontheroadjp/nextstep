# Architecture Design

## 概要
- Next.js App Router を用いた単一アプリ構成。
- API は `app/api/*` の Route Handlers で実装。
- データストアは Supabase (PostgreSQL + RLS)。

根拠: `next.config.js`, `app/api/`, `db/migrations/0001_init.sql`

## ディレクトリ構造（主要）
- `app/`: Next.js App Router の UI と API ルート
- `app/api/`: JSON API (Route Handlers)
- `db/`: PostgreSQL のスキーマ/メンテナンス SQL
- `docs/`: 仕様/運用ドキュメント
- `tests/`: Vitest のユニット/統合テスト

根拠: `app/`, `db/`, `docs/`, `tests/`

## フロントエンド
- `app/page.tsx`: ダッシュボード（Today/Inbox/Areas の件数やリンク）
- `app/(views)/[view]/page.tsx`: Today/Upcoming/Anytime/Someday/Logbook/Inbox の一覧画面
- `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`: Area/Project の詳細画面

根拠: `app/page.tsx`, `app/(views)/[view]/page.tsx`, `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`

## バックエンド（API）
- 認証: `Authorization: Bearer <token>` または `x-access-token` を受け取り、Supabase Auth で検証。
- ビュー取得: Today/Upcoming/Anytime/Someday/Logbook/Inbox。
- CRUD: Tasks/Areas/Projects/Checklists。
- 日付境界: `x-tz-offset-minutes` で補正し、API 側で today を算出。

根拠: `app/api/_helpers.ts`, `app/api/_queries.ts`, `app/api/*/route.ts`

## データ層
- テーブル: `areas`, `projects`, `tasks`, `checklists`
- RLS で `user_id` によるアクセス制御
- Someday/Date/Archive の整合性制約

根拠: `db/migrations/0001_init.sql`, `db/maintenance/0003_archive_flow.sql`

## 未確認事項
- デプロイ先/運用環境（Vercel など）の定義
  - 追加確認候補: README, IaC/デプロイ設定（未確認）
