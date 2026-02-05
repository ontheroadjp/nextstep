# Inception Deck

## Why Are We Here?
- タスク管理そのものではなく、意思決定時の認知負荷を下げる。

根拠: `docs/L0/philosophy.md`

## Elevator Pitch
日付・Someday・Area/Project による最小限の判断だけで、Today/Upcoming/Anytime/Someday/Logbook を自動で切り替えて確認できるタスク管理体験を提供する。

根拠: `docs/L1/01_specification.md`, `app/api/_queries.ts`, `app/api/*/route.ts`

## Product Box（機能の核）
- Today / Upcoming / Anytime / Someday / Logbook / Inbox のビュー
- Area / Project による整理
- Task と Checklist の作成・更新・削除

根拠: `app/api/*/route.ts`, `app/(views)/[view]/page.tsx`, `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`

## Not Doing（現時点で未実装・未確認）
- 共有・チーム機能
- 通知・リマインド
- 優先度やラベル等の追加メタデータ

根拠: `app/`, `app/api/`, `db/migrations/0001_init.sql` に該当実装が存在しない

## Constraints（技術・運用）
- Next.js App Router によるフロントエンドと API Route Handler の同居
- Supabase (PostgreSQL + RLS) をデータストアとして利用
- 認証は Supabase の access token を API に渡す方式

根拠: `next.config.js`, `app/api/_supabase.ts`, `db/migrations/0001_init.sql`

## Stakeholders（未確認）
- プロダクトオーナー/運用者
- エンドユーザー（個人利用想定かチーム利用想定か）

未確認理由: リポジトリ内に明確なステークホルダー定義がない
追加確認候補: README, 企画資料
