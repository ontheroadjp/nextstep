# Test Strategy

## テスト種別
- Unit/Function テスト: Vitest
- Integration テスト: 実サーバー + 実DB (Supabase)
- Smoke テスト: `tests/smoke/*`（エントリポイントの疎通確認）

根拠: `package.json`, `vitest.config.ts`, `docs/L1/05_testing.md`, `.github/workflows/integration.yml`

## 実行コマンド
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`

根拠: `package.json`, `.github/workflows/tests.yml`, `.github/workflows/integration.yml`

## CI 方針
- GitHub Actions を継続利用
- 既存 CI を更新する方針（差分は最小）
- `commands.test` と同一の `npm run test` に加えて、`npm run typecheck` を CI で実行

根拠: `.github/workflows/tests.yml`, `repo.profile.json`

## 前提環境変数（Integration）
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BASE_URL`, `TEST_PREFIX`, `TEST_EMAIL`, `TEST_PASSWORD`, `TEST_EMAIL_2`, `TEST_PASSWORD_2`

根拠: `docs/L1/05_testing.md`, `.github/workflows/integration.yml`

## Seed データ（表示検証）
- 実行コマンド: `npm run seed:test-data`
- 挙動:
  - `append` は既存データを維持して追加投入
  - `reset` は `areas/projects/tasks/checklists` を全削除してから投入
- `reset` で必要:
  - `SUPABASE_SERVICE_ROLE_KEY`

根拠: `scripts/seed_test_data.mjs`, `package.json`

## テスト対象
- API ルート（Tasks/Areas/Projects/Checklists/Views）
- 認証更新 API（`POST /api/auth/refresh`）
- RLS を含むアクセス制御
- View 編集フォーカスの挙動（入力開始時に全選択しない）
- View Someday グルーピングの並び順ルール（Today と同一）
- View Upcoming の期間区切りルール（明日〜7日 / 月内レンジ / 3ヶ月月単位 / 4ヶ月目以降年単位）
- deadline 警告フローと超過判定基準（`deadline ?? date`）のルール

根拠: `tests/api/*.test.ts`, `tests/integration/*.test.ts`, `tests/task_edit_focus_behavior.test.ts`, `tests/someday_grouping_sort_rule.test.ts`, `tests/upcoming_sectioning.test.ts`, `tests/deadline_warning_flow.test.ts`, `tests/home_overdue_rule.test.ts`, `tests/api/auth_refresh_route.test.ts`, `docs/L1/05_testing.md`

## 未確認事項
- E2E テスト（Playwright/Cypress 等）の導入有無
  - 追加確認候補: `package.json` の依存関係（未検出）
