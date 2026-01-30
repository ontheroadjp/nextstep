# 技術要件・アーキテクチャ設計（Technical Requirements）

## 本ドキュメントの目的

本ドキュメントは、本プロダクトにおける技術的前提条件、
アーキテクチャ方針、および採用技術スタックを整理し、
**実装判断のブレを防ぐこと**を目的とする。

本ドキュメントは以下を前提とする。

- philosophy.md
- specification.md

---

## 前提条件

### 利用デバイス

- 本アプリケーションは **スマートフォンでの利用を前提**とする
- タッチ操作を主とし、マウス操作は副次的とする

---

### UX・操作要件

- 片手操作を想定
- タップ可能領域は十分に広く確保する（最小 44px 相当）
- スワイプ操作を補助的に利用する
- すべての操作はタップでも代替可能であること
- 誤操作を防ぐため、ジェスチャーは深めに設定する

---

## アーキテクチャ方針

### フロントエンド / バックエンド分離

- フロントエンドとバックエンドは **API によって完全に分離**する
- フロントエンドは表示と操作に専念する
- バックエンドは以下を一元的に管理する

    - ビュー定義（Today / Upcoming / Area / Inbox / Anytime / Someday / Logbook）
    - 日付・Someday の解釈ロジック
    - データ整合性の保証

---

### データベースの位置づけ

- Supabase は **データベース層としてのみ使用**する
- フロントエンドから Supabase を直接参照しない
- すべてのデータアクセスはバックエンド API を経由する

---

## 全体構成

```
Frontend (Next.js)
        |
        | HTTPS (JSON API)
        v
Backend API (Next.js Route Handlers / Hono)
        |
        v
Supabase (PostgreSQL)
```

---

## 採用技術スタック

### フロントエンド

- Next.js（App Router）
- React（Client Components 中心）
- Tailwind CSS（mobile-first）
- Zustand（UI 状態管理）
- @use-gesture/react（スワイプ・タッチ操作）
- fetch / SWR / TanStack Query（API 通信）

#### フロントエンドの責務

- API レスポンスの表示
- タッチ操作の解釈
- モーダル・画面遷移・アニメーション
- optimistic update による即時反映

---

### バックエンド

- Next.js Route Handlers または Hono
- Prisma（ORM）
- Node.js Runtime

#### バックエンドの責務

- タスクビュー（Today / Upcoming / Area 等）の定義
- 日付・Someday の解釈
- 並び順の保証
- API レスポンスの正規化

---

### データベース

- Supabase（PostgreSQL）

#### 利用範囲

- PostgreSQL（メイン DB）
- Auth（将来導入予定）
- Realtime（必要に応じて部分利用）

#### 注意事項

- Row Level Security（RLS）は最小限から開始する
- 初期実装では単純な user_id 一致程度に留める
- View / Function は必要に応じて利用するが、
  ロジックの主導権はバックエンドに置く

#### 制約・インデックス（重要）

- 文字列必須: `areas.name`, `projects.name`, `projects.note`, `tasks.title`, `tasks.note`, `checklists.title`
- Someday/Date の整合性: `someday = true` なら `date = null`、`date != null` なら `someday = false`
- 主要インデックス: `tasks(user_id, date)`, `tasks(user_id, completed_at desc)`（Logbook 最適化）

---

## API 設計方針

### 基本方針

- CRUD API と View API を分離する
- API 名は **概念名**を採用する
- フロントエンドでクエリ条件を組み立てない

### 日付の前提

- 日付は日単位（時刻は扱わない）
- 日付境界はユーザーのローカル 0:00

---

## データモデル前提

- Task / Project の note は必須
- Task は任意で Project に所属できる
- Project は任意で Area に所属できる
- Checklist は Task に複数ぶら下がる
- Checklist は日付を持たず、完了フラグのみを持つ
- date がある Task は日付順に並べる
- date がない Task は DnD で並び順を保持する
- すべての主要テーブルは `user_id` を持つ
- sortKey は任意だが、指定する場合は空白不可（空文字は拒否）

### 代表的な API エンドポイント例

#### ビュー取得

```
GET /api/inbox
GET /api/today
GET /api/upcoming
GET /api/someday
GET /api/anytime
GET /api/logbook

GET /api/areas
GET /api/areas/{areaId}
GET /api/areas/{areaId}/today
GET /api/areas/{areaId}/upcoming
GET /api/projects
GET /api/projects/{projectId}
GET /api/projects/{projectId}/today
GET /api/projects/{projectId}/upcoming

```

---

#### タスク操作

```
POST   /api/tasks
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}
```

- 完了処理は completedAt を設定することで表現する
- 状態（active / inactive）は持たない

---

## API レスポンス設計（草案）

### 共通方針

- 日付は `YYYY-MM-DD`
- `note` は必須
- `someday = true` の場合は `date = null`
- `date != null` の場合は `someday = false`
- API 側で入力の正規化を行い、矛盾は自動で解消する
- `completedAt != null` は Logbook 以外に出さない

### Task の基本形

```
{
  "id": "task_...",
  "title": "string",
  "note": "string",
  "date": "YYYY-MM-DD" | null,
  "someday": false,
  "completedAt": "YYYY-MM-DDTHH:MM:SSZ" | null,
  "areaId": "area_..." | null,
  "projectId": "project_..." | null,
  "sortKey": "string" | null,
  "checklists": [
    { "id": "check_...", "title": "string", "completed": false }
  ]
}
```

### 代表的なビューの返却形

#### Today

```
{ "items": [Task] }
```

#### Anytime / Someday

```
{ "items": [Task] }
```

#### Upcoming（日付ごとにグルーピング）

```
{
  "groups": [
    { "date": "YYYY-MM-DD", "items": [Task] }
  ]
}
```

#### Inbox

```
{ "items": [Task] }
```

---

## 操作系 API（草案）

### Tasks

#### 作成

```
POST /api/tasks
```

入力（例）

```
{
  "title": "string",
  "note": "string",
  "date": "YYYY-MM-DD" | null,
  "someday": false,
  "areaId": "area_..." | null,
  "projectId": "project_..." | null
}
```

ルール

- `note` は必須
- `someday = true` の場合は `date = null`
- `date != null` の場合は `someday = false`

#### 更新

```
PATCH /api/tasks/{id}
```

入力（例）

```
{
  "title": "string",
  "note": "string",
  "date": "YYYY-MM-DD" | null,
  "someday": false,
  "completedAt": "YYYY-MM-DDTHH:MM:SSZ" | null,
  "areaId": "area_..." | null,
  "projectId": "project_..." | null,
  "sortKey": "string" | null
}
```

#### 削除

```
DELETE /api/tasks/{id}
```

### Projects

#### 作成 / 更新 / 削除

```
POST   /api/projects
PATCH  /api/projects/{id}
DELETE /api/projects/{id}
```

入力（例）

```
{
  "name": "string",
  "note": "string",
  "areaId": "area_..." | null,
  "sortKey": "string" | null
}
```

### Checklists

#### 作成 / 更新 / 削除

```
POST   /api/tasks/{taskId}/checklists
PATCH  /api/checklists/{id}
DELETE /api/checklists/{id}
```

入力（例）

```
{
  "title": "string",
  "completed": false,
  "sortKey": "string" | null
}
```

---

## Logbook

- `completedAt != null` のタスクのみを返す
- `completedAt` の降順で並べる

---

## ビュー判定の SQL ルール（草案）

前提: `date` は日付型、境界はユーザーのローカル 0:00。

### Today

```
where user_id = :userId
  and completed_at is null
  and someday = false
  and date is not null
  and date <= :today
```

### Upcoming

```
where user_id = :userId
  and completed_at is null
  and someday = false
  and date is not null
  and date > :today
```

### Anytime

```
where user_id = :userId
  and completed_at is null
  and someday = false
  and date is null
```

### Someday

```
where user_id = :userId
  and completed_at is null
  and someday = true
```

### Logbook

```
where user_id = :userId
  and completed_at is not null
order by completed_at desc
```

### Inbox

```
where user_id = :userId
  and area_id is null
```

### Area / Project フィルタ

```
and area_id = :areaId
and project_id = :projectId
```

---

## RLS（方針メモ）

- RLS を有効化し、`user_id = auth.uid()` を基本条件とする
- Checklist は Task 所有者一致で制御する

## モバイル前提の UI 実装指針

### 避けるべき実装

- hover 前提の UI
- 小さなチェックボックス
- 細かいドラッグ操作
- モーダルの多重表示

---

### 推奨される実装

- 行全体をタップ可能にする
- スワイプ操作は補助的に利用する
- 編集はフルスクリーン表示を基本とする
- 常に「戻る」手段を用意する

---

## 将来拡張を見据えた設計

- PWA 対応（manifest.json から開始）
- React Native / Expo への移植可能性を維持
- 複数クライアント（Web / Mobile）を同一 API で支える構成

---

## 技術要件まとめ

- 状態を持たないタスクモデル
- 単一日付に基づくビュー構成
- API 主導のロジック集約
- モバイル UX 最優先
- Supabase は DB として利用

本技術要件は、実装フェーズにおける判断基準として常に参照される。
