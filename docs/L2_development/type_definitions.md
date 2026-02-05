# Type Definitions (TypeScript)

## API ドメイン型

### Task
- `id: string`
- `title: string`
- `note: string`
- `date: string | null`
- `someday: boolean`
- `completedAt: string | null`
- `archivedAt: string | null`
- `createdAt: string | null`
- `areaId: string | null`
- `projectId: string | null`
- `sortKey: string | null`
- `checklists: Checklist[]`

根拠: `app/api/_helpers.ts`

### Checklist
- `id: string`
- `title: string`
- `completed: boolean`
- `sortKey: string | null`

根拠: `app/api/_helpers.ts`

## 入力 DTO（代表）

### TaskCreateInput
- `title?: string`
- `note?: string`
- `date?: string | null`
- `someday?: boolean`
- `areaId?: string | null`
- `projectId?: string | null`

根拠: `app/api/tasks/route.ts`

### TaskUpdateInput
- `title?: string`
- `note?: string`
- `date?: string | null`
- `someday?: boolean`
- `completedAt?: string | null`
- `archivedAt?: string | null`
- `areaId?: string | null`
- `projectId?: string | null`
- `sortKey?: string | null`

根拠: `app/api/tasks/[id]/route.ts`

## フロントエンド表示用の型（代表）
- View で使用する `Task` 型（API Task のサブセット）
- `ViewState` などの UI 状態型

根拠: `app/page.tsx`, `app/(views)/[view]/page.tsx`, `app/areas/[areaId]/page.tsx`, `app/projects/[projectId]/page.tsx`

## 未確認事項
- 型定義の集中管理方針（共通型ファイルの有無）
  - 追加確認候補: `src/` や `lib/` 等の共通型定義ファイル（未確認）
