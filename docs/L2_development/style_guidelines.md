# Style Guidelines

## 全般

### タイポグラフィ
- 基本文字: "Space Grotesk" をベース（`html, body`）
- 見出し: `h1` は "Fraunces" を使用
- 小見出し（`.eyebrow`）は大文字・レタースペーシング強め（0.2em）

根拠: `app/globals.css`

### カラー / テーマ
- `:root` の CSS 変数で色と影を定義（`--bg`, `--ink`, `--muted`, `--accent`, `--accent-2`, `--card`, `--border`, `--shadow`）
- ページ背景は淡色グラデーションを採用（`html, body`）
- アイコンは Font Awesome 6（npm）を利用

根拠: `app/globals.css`

### アイコン運用
- 主要カテゴリは Font Awesome 6 の固定アイコンと固定色を使用
- Project: `fa-tachometer` + `.icon-project`（`#6a7ea5`）
- Area: `fa-cube` + `.icon-area`（`#d98a2b`）
- Inbox: `fa-inbox` + `.icon-inbox`（`#3b4d7a`）
- Today: `fa-star` + `.icon-today`（`#d98a2b`）
- Upcoming: `fa-calendar` + `.icon-upcoming`（`#bd5e4a`）
- Anytime: `fa-stack-overflow` + `.icon-anytime`（`#3f6b5f`）
- Someday: `fa-archive` + `.icon-someday`（`#6b5f4f`）
- Logbook: `fa-book` + `.icon-logbook`（`#5b7a4f`）
- タスク詳細の日付表示（`.date-badge`）は 16px で、ラベルに応じて左側アイコンを切り替える
- `Today`: `fa-star`（`.icon-today`）
- `This Evening`: `fa-moon`（`.date-evening`）
- `Someday`: `fa-archive`（`.icon-someday`）
- その他: `fa-calendar`（`.icon-upcoming`）
- 直近日付の表示ルール（`en-US`）:
  - 明日: `Tomorrow`
  - 今日から2〜5日後: 曜日（例: `Mon`）
  - 6日後以降: `m/d(曜日)`（ゼロ埋めなし）
  - 過去日付: `m/d(曜日)` + `fa-flag`、文字色は紫（`.date-overdue`）

根拠: `app/page.tsx`, `app/(views)/[view]/page.tsx`, `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`, `app/globals.css`

### カラー詳細（HEX）
- メインカラー（Text/Inks）: `#1b1a16`（`--ink`）
- サブカラー（Muted Text）: `#6b5f4f`（`--muted`）
- アクセントカラー（Primary Accent）: `#d98a2b`（`--accent`）
- アクセントサブ（Secondary Accent）: `#3f6b5f`（`--accent-2`）
- 背景: `#efe9df`（`--bg`）
- カード: `#fdf9f3`（`--card`）
- ボーダー: `#e4dacd`（`--border`）

根拠: `app/globals.css`

### フォントサイズ / 行間
- `.eyebrow`: 12px
- `h1`: `clamp(32px, 4vw, 48px)`
- `label`: 13px
- `textarea`, `input:not([type="checkbox"])`: 14px
- `.task-title`: 14px / line-height 1.4
- `.task-note`: 12px
- `input.title-input`: 16px / line-height 1.4
- `.logbook-stack-button`: 13px
- `.fab-add`: 26px / line-height 1
- `.view-header h2`: 18px
- `.badge`: 12px
- `.detail`: 13px
- `.lead`: line-height 1.7

根拠: `app/globals.css`

### レイアウト
- 主要レイアウトは `display: grid` を前提に構成
- グリッドは `auto-fit + minmax` を多用（カード一覧など）
- 主要コンテナ `.hero.page` は `min-height: 100svh` と固定パディングで余白を確保

根拠: `app/globals.css`

### カード / パネル
- `.panel` はカード背景、1px 枠線、角丸、影を持つ基本パネル
- `.view-card` は影なし・角丸 0 で密度高めの表示に寄せる
- `.group-card` は影なし・角丸 18px のグルーピング用

根拠: `app/globals.css`

### ボタン / 入力
- `button` は素の背景なし・ボーダーなしで設計し、角丸は 999px が基本
- `input` / `textarea` は `font: inherit` を利用し、角丸 12px を基本にする
- `:disabled` / `:hover` の状態を明示的に定義

根拠: `app/globals.css`

### インタラクション
- カードリンクのホバーは `transform: translateY(-2px)` + `transition` を使用

根拠: `app/globals.css`

## ページ別

### Home（`app/page.tsx`）
- セクション構成: `.hero.page` + `.grid` + `.footer-panel`
- カード表現: `.view-card`, `.view-header`, `.badge`, `.detail`, `.card-link`
- タイトル装飾: `.with-icon`, `.title-icon`
- ステータス文言: `.error`, `.muted`, `.hint`
- カテゴリアイコン: `.icon-project`, `.icon-area`, `.icon-today`, `.icon-upcoming`, `.icon-anytime`, `.icon-someday`, `.icon-logbook`, `.icon-inbox`

根拠: `app/page.tsx`, `app/globals.css`

### View（`app/(views)/[view]/page.tsx`）
- セクション構成: `.hero.page` + `.grid` + `.footer-panel`
- 一覧/カード: `.view-card.full`, `.task-list`, `.grouped-grid`, `.group-card`, `.group-list`, `.date-group`
- 入力/編集: `.title-input`, `.note-input`, `.task-details`, `.task-details-inner`
- 追加/操作: `.fab-add`, `.logbook-stack-button`, `.icon-button`, `.pill`, `.toolbar`
- 日付/スケジュール: `.schedule`, `.schedule-label-button`, `.date-badge`
- カレンダー: `.calendar`, `.calendar-header`, `.calendar-grid`
- カレンダー: 今日セルは `Today` アイコンのみ表示（テキストなし）、過去日は非表示
- ボタン: `Today / This Evening / Someday` は高さ 1.8 倍、`Someday` は全幅、`Clear` は赤系

根拠: `app/(views)/[view]/page.tsx`, `app/globals.css`

### Area（`app/areas/[areaId]/page.tsx`）
- セクション構成: `.hero.page` + `.grid` + `.footer-panel`
- 一覧/カード: `.view-card.full`, `.task-list`
- 入力/編集: `.title-input`, `.note-input`, `.task-details`, `.task-details-inner`
- 追加/操作: `.fab-add`, `.logbook-stack-button`, `.icon-button`, `.pill`, `.toolbar`
- 日付/スケジュール: `.schedule`, `.schedule-label-button`, `.date-badge`
- カレンダー: `.calendar`, `.calendar-header`, `.calendar-grid`

根拠: `app/areas/[areaId]/page.tsx`, `app/globals.css`

### Project（`app/projects/[projectId]/page.tsx`）
- セクション構成: `.hero.page` + `.grid` + `.footer-panel`
- 一覧/カード: `.view-card.full`, `.task-list`
- 入力/編集: `.title-input`, `.note-input`, `.task-details`, `.task-details-inner`
- 追加/操作: `.fab-add`, `.logbook-stack-button`, `.icon-button`, `.pill`, `.toolbar`
- 日付/スケジュール: `.schedule`, `.schedule-label-button`, `.date-badge`
- カレンダー: `.calendar`, `.calendar-header`, `.calendar-grid`

根拠: `app/projects/[projectId]/page.tsx`, `app/globals.css`

## 未確認事項
- ユーザー向け UI コンポーネントの命名ルール（BEM など）の統一方針
- 追加確認候補: `app/(views)` 以下の実装
