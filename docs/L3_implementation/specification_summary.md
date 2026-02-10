# Specification Summary (Implementation)

## 認証・認可
- API は `Authorization: Bearer <token>` または `x-access-token` を受け取り、Supabase Auth でユーザーを検証する。
- `POST /api/auth/login` は `provider` と認証情報を受け取り、新しい `accessToken` / `refreshToken` を返す。
- `POST /api/auth/refresh` は `refreshToken` を受け取り、新しい `accessToken` / `refreshToken` を返す。
- ユーザー ID は `requireUserContext` で取得し、以降の DB 操作に利用する。
- API route ハンドラは `withApiMonitoring` でラップされ、`401`（認証失敗）, `5xx`（内部エラー）, レイテンシ閾値超過を監視イベントとして出力する。
- Slack 通知は `MONITORING_SLACK_WEBHOOK_URL` 設定時のみ有効で、同一キー通知は `MONITORING_SLACK_COOLDOWN_MS` で抑制する。
- API 保護として、認証系 (`/api/auth/*`) と更新系（`POST/PATCH/DELETE/PUT`）に rate limit を適用する。
- 上限超過時は `429` と `too_many_requests` を返し、`retry-after` と rate-limit ヘッダを返す。

根拠: `app/api/_helpers.ts`, `app/api/_supabase.ts`, `app/api/auth/login/route.ts`, `app/api/auth/refresh/route.ts`, `app/api/_utils.ts`, `app/_lib/monitoring.ts`, `app/_lib/api_protection.ts`

## ヘルスチェック
- `GET /api/health/live` は常に 200 を返し、アプリ生存状態を返す。
- `GET /api/health/ready` は `SUPABASE_URL` / `SUPABASE_ANON_KEY` の存在を確認し、両方設定済みなら 200、欠落時は 503 を返す。

根拠: `app/api/health/live/route.ts`, `app/api/health/ready/route.ts`

## 日付境界と today
- `x-tz-offset-minutes` を受け取り、UTC 日付を補正して `today` を算出する。

根拠: `app/api/_helpers.ts`

## ビュー定義（API）
- Today: `date <= today`, `someday = false`, `archived_at is null`
- Upcoming: `date > today`, `someday = false`, `archived_at is null`（日付ごとにグループ化）
- Anytime: `date is null`, `someday = false`, `archived_at is null`
- Someday: `someday = true`, `archived_at is null`
- Logbook: `archived_at is not null`
- Inbox: `area_id is null`, `archived_at is null`

根拠: `app/api/_queries.ts`, `app/api/today/route.ts`, `app/api/upcoming/route.ts`, `app/api/anytime/route.ts`, `app/api/someday/route.ts`, `app/api/logbook/route.ts`, `app/api/inbox/route.ts`

## 並び順
- Today/Upcoming/Anytime/Someday: `sort_key` 昇順（`nullsFirst: false`）、`created_at` 昇順、必要に応じて `date` 昇順
- Logbook: `archived_at` 降順

根拠: `app/api/_queries.ts`, `app/api/logbook/route.ts`, `app/api/areas/[areaId]/route.ts`, `app/api/projects/[projectId]/route.ts`

## Task 作成・更新
- `title` は必須、`note` は任意。
- 新規作成時のデフォルトタイトルは「新規タスク」。
- `deadline` は任意（nullable date）。
- 新規作成時は `date` が設定されても `deadline` は自動設定しない。
- `someday = true` の場合 `date = null` かつ `deadline = null` に正規化。
- `date` が設定された場合 `someday = false` に正規化。
- `areaId` / `projectId` は所有チェックを行う。
- `projectId` がある場合、`areaId` は Project の `area_id` と一致する必要がある。
- `projectId` に紐づく `area_id` があり、`areaId` 未指定の場合は補完される。
- `someday = true` と `deadline` の同時指定は API で拒否される。

根拠: `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/_helpers.ts`

## Task 一覧 UI の並び順
- Upcoming: 明日〜7日後は日単位（左大数字=日付）、8日目〜今月末は月内レンジ、来月〜3ヶ月は月単位、4ヶ月目以降は年単位で区切って表示
- Logbook: 完了日（`archived_at`）降順（変更なし）
- Today: Project/Area/No Group の順で表示し、その後に This Evening を表示
- Inbox/Anytime/Someday/Area/Project: 日付なし → 日付ありの順で並べ、日付なしは `created_at` 降順、日付ありは `date` 昇順 + `created_at` 降順
- Today/Area/Project の一覧行では、超過基準日（`deadline ?? date`）が `today` より過去のタスクを右端メタ領域に `fa-flag` + `Nd ago`（紫）で表示する

根拠: `app/(views)/[view]/page.tsx`, `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`, `app/_lib/deadline.ts`

## Project / Area / Checklist
- Project: `name` / `note` 必須。
- Area: `name` 必須。
- Checklist: `title` 必須。
- Checklist 一覧取得: `GET /api/tasks/{id}/checklists`（`sort_key` 昇順 + `created_at` 昇順）
- `sortKey` は任意だが空文字は拒否。

根拠: `app/api/projects/route.ts`, `app/api/areas/route.ts`, `app/api/checklists/[id]/route.ts`, `app/api/tasks/[id]/checklists/route.ts`

## 完了タスクの一括アーカイブ
- `POST /api/tasks/archive-completed` は `completed_at is not null and archived_at is null` のタスクを一括更新し、`archivedAt` と `archivedCount` を返す。

根拠: `app/api/tasks/archive-completed/route.ts`, `app/(views)/[view]/page.tsx`

## データ制約（DB）
- `tasks.someday = true` の場合 `tasks.date is null` かつ `tasks.deadline is null`
- `tasks.archived_at is not null` の場合 `completed_at is not null`
- `projects.note` は必須
- 主要テーブルは `user_id` と RLS による制御
- DB 運用は `db_migrate.sh`（固定順適用）、`db_backup.sh`（SQLバックアップ）、`db_rollback.sh`（SQLリストア）を利用する

根拠: `db/migrations/0001_init.sql`, `db/maintenance/0003_archive_flow.sql`, `db/maintenance/0004_add_task_deadline.sql`, `scripts/db_migrate.sh`, `scripts/db_backup.sh`, `scripts/db_rollback.sh`

## フロントエンドの実装仕様
- `app/page.tsx` は公開トップとして「ログインが必要です」カードのみ表示する。
- ダッシュボードは `app/top/page.tsx` で Today/Inbox の件数と Area を表示する。
- `app/login/page.tsx` はログイン成功後に `/top` へ遷移する。
- ダッシュボードの Today/Inbox detail（`Overdue x / ...`）は超過基準日（`deadline ?? date`）で集計する。
- 各ビューは `/api/{view}` を取得して表示。
- `PageMidHeader` の既定リンク先は `/top`。
- `app/(views)/[view]/page.tsx` の各カテゴリ画面では、`PageMidHeader` 直下に「現在の view に対応する単一の `CategoryCard`」を表示する。
- 上記 `CategoryCard` は `PageMidHeader` の直下でスクロール追従（sticky）し、Today/Inbox の場合はダッシュボード同様の detail（Overdue/Today, Overdue/Others）を表示する。
- `app/(views)/[view]/page.tsx` の No Group セクション（area/project 未所属タスク）は、専用クラスでタスク行左余白を調整し、Project/Area 見出しアイコンの左端と揃える。
- `useClientAuth` は `accessToken` / `refreshToken` / `tzOffset` を `localStorage` で保持し、`login` / `logout` を提供する。
- フッターは `Login Method` / `Email` / `Password` / `TZ Offset` を表示し、未認証時は `Login`、認証済みは `Logout` を表示する（`Refresh` は維持）。
- `authProvider` は現状 `password` のみ実装され、認証方式の拡張ポイントとして扱う。
- 画面横断で再利用する UI は `app/_components` に集約する（`CategoryCard`, `PageHero`, `PageMidHeader`, `AccessSettingsFooter`）。
- `localStorage` 読み書きは `app/_hooks/useStoredState.ts`（`useStoredValue`, `useStoredJson`）を利用する。
- トークン状態（`accessToken`/`refreshToken`/`tzOffset`）と `x-tz-offset-minutes` ヘッダ生成は `app/_hooks/useClientAuth.ts` に共通化し、`app/page.tsx` / `app/top/page.tsx` / `app/login/page.tsx` / `app/(views)/[view]/page.tsx` / `app/areas/[areaId]/page.tsx` / `app/projects/[projectId]/page.tsx` が利用する。
- `useStoredValue` は初回 hydration 完了前に `localStorage` へ書き戻さない（初期空文字で既存 token を上書きしない）。
- 日付表示の共通計算は `app/_lib/date.ts`（`DEFAULT_TZ_OFFSET`, `getTodayString`, `getScheduleLabel`）を利用する。
- `app/(views)/[view]/page.tsx` は `today/anytime/someday` のメタ情報（`areas/projects`）を token 単位でキャッシュし、View 間遷移時の重複取得を抑制する（`Refresh` は強制再取得）。
- クライアントの API 呼び出しは `useClientAuth` が返す `authedFetch`（内部で `useAuthedFetch` / `fetchWithAutoRefresh` を利用）を通し、`401` 受信時は `refreshToken` で 1 回だけ再発行後に再試行する。

根拠: `app/page.tsx`, `app/top/page.tsx`, `app/login/page.tsx`, `app/(views)/[view]/page.tsx`, `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`, `app/_components/AccessSettingsFooter.tsx`, `app/_components/CategoryCard.tsx`, `app/_components/PageHero.tsx`, `app/_components/PageMidHeader.tsx`, `app/_hooks/useClientAuth.ts`, `app/_hooks/useStoredState.ts`, `app/_lib/date.ts`, `app/_lib/deadline.ts`, `app/globals.css`

## Task 編集 UI のフォーカス挙動
- タスク編集時は最後にタップした入力（Title / Note）を `lastFocusRef` で記録し、編集有効化時に該当の入力へフォーカスを移す。
- タッチ環境の入力開始判定は `onPointerDown` を用いて、タイトル/ノートのどちらを開くかを決める。
- タイトル入力は `input.title-input`、ノート入力は `textarea.note-input` を使用し、入力スタイルは要素種別込みのセレクタで定義する。
- `app/(views)/[view]/page.tsx` の編集フォーカス時は全選択を行わず、キャレット表示で入力開始する。
- `app/(views)/[view]/page.tsx` の Someday 画面は Today と同じ `Project / Area / No Group` 分類で表示し、各グループ内の並びも `sortMixedByDateAndCreated` に統一する。
- タスクカードのスケジュール操作は 2 つに分離する。
- カレンダーアイコン: 実行日（date）を編集（Today/This Evening/Someday/Calendar/Clear）。
- フラグアイコン: 締切（deadline）を編集（Calendar/Clear のみ）。
- `date > deadline` となる変更、および deadline 設定済みタスクの Someday 変更は確認ダイアログを表示し、同意時は deadline をクリアして保存する。
- deadline 設定済みタスクはスケジュール表示の下に `Deadline YYYY-MM-DD` を表示する。

根拠: `app/(views)/[view]/page.tsx`, `app/globals.css`

## 未確認事項
- UI のデザイン仕様・画面遷移詳細（実装に対する設計ドキュメントが未確認）
  - 追加確認候補: 企画/デザイン資料
