# Development Setup

## 前提
- Node.js が必要（CI は Node 20）。

根拠: `.github/workflows/tests.yml`, `.github/workflows/integration.yml`

## セットアップ
1. 依存関係のインストール
   - `npm ci`
2. 開発サーバー起動
   - `npm run dev`

根拠: `package.json`, `.github/workflows/tests.yml`

## 環境変数
- API 実行に必要:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

根拠: `app/api/_supabase.ts`

- Integration テストに必要:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `BASE_URL`
  - `TEST_PREFIX`
  - `TEST_EMAIL`
  - `TEST_PASSWORD`
  - `TEST_EMAIL_2`
  - `TEST_PASSWORD_2`

根拠: `docs/L1/05_testing.md`, `.github/workflows/integration.yml`

## テスト
- TypeScript 型チェック: `npm run typecheck`
- Unit/Function: `npm run test`
- Integration: `npm run test:integration`
- Seed データ投入: `npm run seed:test-data`

根拠: `package.json`, `.github/workflows/tests.yml`, `.github/workflows/integration.yml`

## Seed データ投入（表示テスト用）
- スクリプト: `scripts/seed_test_data.mjs`
- 投入モード:
  - `reset`: `areas/projects/tasks/checklists` を全削除してから投入
  - `append`: 既存データを残して追加投入
- データ構成（現行実装）:
  - Area: 3件
  - Project: 2件
  - Task: 80件（近い日付を多め、遠い日付を少なめで分布）
- `reset` 利用時の追加必須環境変数:
  - `SUPABASE_SERVICE_ROLE_KEY`

根拠: `scripts/seed_test_data.mjs`, `package.json`

## 未確認事項
- ローカル `.env` の配布/管理方法
  - 追加確認候補: README, 社内運用ドキュメント
