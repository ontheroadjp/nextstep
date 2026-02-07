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
