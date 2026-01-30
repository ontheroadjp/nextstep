## テスト方針

### 実行コマンド

- Unit/Function テスト
  - `npm run test`
- Integration テスト（実サーバー/実DB）
  - `npm run test:integration`
  - 前提: API サーバーが起動していること（`BASE_URL` に到達できること）

### 必須の環境変数（.env）

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
BASE_URL=http://localhost:3000
TEST_PREFIX=[TEST] 
TEST_EMAIL=...
TEST_PASSWORD=...
TEST_EMAIL_2=...
TEST_PASSWORD_2=...
```

- Integration テストは `.env` を自動で読み込む
- `TEST_EMAIL_2` は RLS の隔離確認に使用

### テストスクリプト

- `scripts/test_all.sh`
  - 主要ビュー（Today/Upcoming/Anytime/Someday/Inbox）をまとめて確認
  - `TEST_PREFIX` を先頭に付与したデータのみ作成
- `scripts/test_edge_cases.sh`
  - Someday/Date の矛盾、過去日付、必須項目エラーなどの確認
- `scripts/cleanup_test_data.sh`
  - `TEST_PREFIX` を持つデータのみ削除

### 期待する保証

- `completedAt` を設定したタスクは Today/Upcoming/Anytime/Someday/Inbox に出ない
- Logbook にのみ表示される
- RLS により他ユーザーのデータは閲覧/更新/削除できない

---

## CI（推奨）

### Unit テスト

- push/PR で `npm run test`
- Integration は通常スキップ
- ワークフロー: `.github/workflows/tests.yml`

### Integration テスト

- 手動実行（workflow_dispatch）
- Supabase のキー・テストユーザーは GitHub Secrets に登録
- Next.js サーバーを起動してから `npm run test:integration`
- ワークフロー: `.github/workflows/integration.yml`
- Integration テストはネットワーク依存のためタイムアウトは長め（20s）

#### Secrets 名

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TEST_EMAIL`
- `TEST_PASSWORD`
- `TEST_EMAIL_2`
- `TEST_PASSWORD_2`

#### Secrets 登録手順（GitHub）

1. GitHub のリポジトリ → Settings → Environments
2. `integration` 環境を作成し、Secrets か Variables のどちらかに追加
3. 追加後、Actions から `integration` workflow を手動実行
