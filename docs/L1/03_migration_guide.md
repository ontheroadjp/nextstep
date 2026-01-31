# マイグレーション運用ガイド

## 目的

- 1 回の実行で DB を初期化できること
- Supabase の SQL Editor / CLI どちらでも適用可能にする

---

## 初期化手順（1 回で再構築）

1. Supabase のプロジェクトを作成する
2. `db/migrations/0001_init.sql` をそのまま実行する
3. 実行後にテーブルと RLS が作成されていることを確認する

---

## 注意点

- 本マイグレーションは `auth.users` を参照するため、Supabase の Auth が有効である必要がある
- 再実行に備えて `create table if not exists` を使用している
- トリガー / 関数 / ポリシーも同一ファイルに含めている
- 既存環境に制約/インデックスの変更を反映する場合は、再初期化または別途 ALTER を実施する

---

## 既存環境への差分適用

### sort_key 制約・インデックスの追加

- ファイル: `db/maintenance/0002_apply_sort_key_constraints.sql`
- 目的: 既存DBに `sort_key` の空白禁止制約とインデックスを追加

#### 実行前の注意

- 既存データに `sort_key = ''` や空白のみが含まれると制約追加に失敗する
- その場合は先にデータを修正（`null` へ変更）してから実行する

#### 例: 事前クリーンアップ

```
update areas set sort_key = null where trim(coalesce(sort_key, '')) = '';
update projects set sort_key = null where trim(coalesce(sort_key, '')) = '';
update tasks set sort_key = null where trim(coalesce(sort_key, '')) = '';
update checklists set sort_key = null where trim(coalesce(sort_key, '')) = '';
```

---

### 完了/整理フローの追加（archived_at）

- ファイル: `db/maintenance/0003_archive_flow.sql`
- 目的: `archived_at` 追加と `tasks_note_not_blank` の削除

#### 注意

- `archived_at` は「Logbook へ整理」時にのみセットされる
- `completed_at` が null のまま `archived_at` をセットすると制約で失敗する
