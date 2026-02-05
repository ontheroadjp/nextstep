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
- Unit/Function: `npm run test`
- Integration: `npm run test:integration`

根拠: `package.json`, `.github/workflows/tests.yml`, `.github/workflows/integration.yml`

## 未確認事項
- ローカル `.env` の配布/管理方法
  - 追加確認候補: README, 社内運用ドキュメント
