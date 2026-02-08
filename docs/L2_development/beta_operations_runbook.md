# Beta Operations Runbook

## この文書の目的
- βテスト公開時の運用手順を、運用初心者でも実行できる形でまとめる。
- 事前確認、公開中監視、障害時対応、ロールバックを一つの流れで参照できるようにする。

## 用語（初学者向け）
- Liveness: サービスのプロセスが生きているかどうかの確認。
  - このリポジトリでは `GET /api/health/live`。
- Readiness: 外部依存を含めて「リクエストを受けられる準備」があるかの確認。
  - このリポジトリでは `GET /api/health/ready`。
- Rate limit: 一定時間内のリクエスト回数上限。過負荷や悪用を防ぐ仕組み。
- Webhook: 外部サービス（ここでは Slack）に HTTP で通知を送る仕組み。
- Rollback: 問題発生時に前の安全な状態へ戻す手順。

## 事前チェック（公開前）
1. テストを実行する
- 実行:
  - `npm run typecheck`
  - `npm run test`
- 確認:
  - 失敗がないこと。

2. 必須環境変数を確認する
- API 動作に必須:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- 監視通知（任意）:
  - `MONITORING_SLACK_WEBHOOK_URL`
  - `MONITORING_SLACK_COOLDOWN_MS`
  - `MONITORING_LATENCY_THRESHOLD_MS`
- API 保護（任意、既定値あり）:
  - `API_RATE_LIMIT_WINDOW_MS`
  - `API_RATE_LIMIT_MAX_AUTH`
  - `API_RATE_LIMIT_MAX_WRITE`

3. DB 運用コマンドを確認する
- Dry-run: `npm run db:migrate:dry`
- Apply: `npm run db:migrate`
- Backup: `npm run db:backup -- --output <path/to/backup.sql>`
- Rollback: `npm run db:rollback -- --input <path/to/backup.sql>`

## 公開後の通常監視
1. ヘルスチェックを確認する
- `GET /api/health/live` が 200 であること。
- `GET /api/health/ready` が 200 であること。

2. 監視ログと Slack 通知を確認する
- 監視対象:
  - `401`（認証失敗）
  - `5xx`（内部エラー）
  - レイテンシ閾値超過
  - rate limit 超過（429）
- 確認:
  - 想定外の急増がないこと。

## 障害時の一次対応
1. 症状を分類する
- `ready=503`: 環境変数設定不備の可能性が高い。
- `5xx` 増加: API 例外・外部依存障害の可能性。
- `429` 増加: クライアント過負荷または閾値過小の可能性。

2. すぐできる確認
- `live` / `ready` の応答確認。
- 直近変更（デプロイ、設定変更）有無の確認。
- Slack 通知のエラー種別確認。

3. 暫定対応
- `ready=503` の場合:
  - 必須 env を再設定して再起動し、`ready` が 200 に戻るか確認。
- `429` が正当トラフィックで発生する場合:
  - `API_RATE_LIMIT_MAX_AUTH` / `API_RATE_LIMIT_MAX_WRITE` を段階的に調整。
- `5xx` が継続する場合:
  - 影響範囲を絞り、ロールバック判断に進む。

## ロールバック手順（DB を含む場合）
1. DB バックアップを取得済みか確認
- 未取得なら、まず `db:backup` を実行して保全する。

2. 直近変更の巻き戻しを実施
- アプリ変更はコミット/PR 単位で revert。
- DB は必要に応じて `npm run db:rollback -- --input <backup.sql>` を実施。

3. 復旧確認
- `live=200`, `ready=200` を確認。
- エラー通知が収束していることを確認。

## 記録（ポストモーテムの最低限）
- 発生時刻、影響範囲、検知方法、一次対応、恒久対策候補を記録する。
- 記録先はチーム運用ルールに従う（本リポジトリでは未規定）。

## 参照
- `docs/L2_development/development_setup.md`
- `docs/L2_development/cicd_design.md`
- `docs/L2_development/api_design.md`
- `docs/L2_development/database_design.md`
- `docs/L3_implementation/specification_summary.md`
