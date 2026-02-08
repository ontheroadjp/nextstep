# CI/CD Design

## CI
- 型/Unit テスト: `npm ci` + `npm run typecheck` + `npm run test` (push/PR)
- Integration テスト: 手動実行 (workflow_dispatch)

根拠: `.github/workflows/tests.yml`, `.github/workflows/integration.yml`

## Integration ワークフローの要点
- Node 20
- Supabase の Secrets/Vars を利用
- `npm run dev` でサーバー起動後、`npm run test:integration`

根拠: `.github/workflows/integration.yml`

## CD
- デプロイ設定は未確認

未確認理由: デプロイ用の設定/IaC がリポジトリ内に見当たらない
追加確認候補: README, `.github/workflows` の追加ファイル, Infra フォルダ

## 運用監視（アプリ内）
- API 監視イベントはアプリ内で構造化ログとして出力される。
- Slack 通知は Incoming Webhook を利用する（任意設定）。
- 監視関連環境変数:
  - `MONITORING_SLACK_WEBHOOK_URL`（未設定時は Slack 通知を行わない）
  - `MONITORING_SLACK_COOLDOWN_MS`（同一キー通知の抑制間隔、既定 60000ms）
  - `MONITORING_LATENCY_THRESHOLD_MS`（レイテンシ通知閾値、既定 1500ms）

根拠: `app/_lib/monitoring.ts`, `app/api/_utils.ts`

## API 保護設定（アプリ内）
- API rate limit 関連環境変数:
  - `API_RATE_LIMIT_WINDOW_MS`（固定窓ミリ秒、既定 60000）
  - `API_RATE_LIMIT_MAX_AUTH`（認証系上限、既定 60）
  - `API_RATE_LIMIT_MAX_WRITE`（更新系上限、既定 300）

根拠: `app/_lib/api_protection.ts`, `app/api/_utils.ts`

## β運用導線
- 公開前チェック、障害時対応、ロールバックを含む運用手順は `docs/L2_development/beta_operations_runbook.md` を参照。
