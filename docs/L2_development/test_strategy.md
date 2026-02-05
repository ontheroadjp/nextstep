# Test Strategy

## テスト種別
- Unit/Function テスト: Vitest
- Integration テスト: 実サーバー + 実DB (Supabase)

根拠: `package.json`, `vitest.config.ts`, `docs/L1/05_testing.md`, `.github/workflows/integration.yml`

## 実行コマンド
- `npm run test`
- `npm run test:integration`

根拠: `package.json`, `.github/workflows/tests.yml`, `.github/workflows/integration.yml`

## 前提環境変数（Integration）
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BASE_URL`, `TEST_PREFIX`, `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_EMAIL_2`, `TEST_PASSWORD_2`

根拠: `docs/L1/05_testing.md`, `.github/workflows/integration.yml`

## テスト対象
- API ルート（Tasks/Areas/Projects/Checklists/Views）
- RLS を含むアクセス制御

根拠: `tests/api/*.test.ts`, `tests/integration/*.test.ts`, `docs/L1/05_testing.md`

## 未確認事項
- E2E テスト（Playwright/Cypress 等）の導入有無
  - 追加確認候補: `package.json` の依存関係（未検出）
