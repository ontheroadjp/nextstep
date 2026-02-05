# Philosophy

## 目的
本プロダクトは、タスク管理そのものではなく「意思決定時の認知負荷を下げること」を目的とする。

根拠: `docs/L0/philosophy.md`

## 基本思想（実装に影響する前提）
- タスクは「可能性」であり、状態（active/inactive）を持たせない。
- 日付の設定は「その日から向き合う意思決定」であり、Today/Upcoming に現れる条件となる。
- Today は自動で増えず、日付未設定タスクは Anytime に留まる。
- Someday は隔離のためのフラグであり、Today/Upcoming から除外される。
- Area は継続的な責任範囲であり、完了対象ではない。

根拠: `docs/L0/philosophy.md`, `docs/L1/01_specification.md`

## 未確認事項
- 対象ユーザー層や利用シーンの具体的定義（例: 個人/チーム運用の想定）。
  - 追加確認候補: 企画資料や README（未確認）。
