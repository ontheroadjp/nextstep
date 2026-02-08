# API Design

## 共通仕様
- JSON API
- 認証: `Authorization: Bearer <token>` または `x-access-token`
- 日付境界: `x-tz-offset-minutes`

根拠: `app/api/_helpers.ts`, `docs/L1/04_api_contract.md`

## 認証 API
- `POST /api/auth/refresh`（`refreshToken` を受け取り、`accessToken` / `refreshToken` を再発行）

根拠: `app/api/auth/refresh/route.ts`

## ビュー API
- `GET /api/today`
- `GET /api/upcoming`
- `GET /api/anytime`
- `GET /api/someday`
- `GET /api/logbook`
- `GET /api/inbox`

根拠: `app/api/*/route.ts`

## エンティティ API
- Areas: `GET/POST /api/areas`, `GET/PATCH/DELETE /api/areas/{areaId}`
- Projects: `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/{projectId}`
- Tasks: `POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}`
- Checklists: `POST /api/tasks/{id}/checklists`, `PATCH/DELETE /api/checklists/{id}`

根拠: `app/api/areas/route.ts`, `app/api/areas/[areaId]/route.ts`, `app/api/projects/route.ts`, `app/api/projects/[projectId]/route.ts`, `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/tasks/[id]/checklists/route.ts`, `app/api/checklists/[id]/route.ts`

## Area/Project ビュー
- `GET /api/areas/{areaId}/today`
- `GET /api/areas/{areaId}/upcoming`
- `GET /api/projects/{projectId}/today`
- `GET /api/projects/{projectId}/upcoming`

根拠: `app/api/areas/[areaId]/today/route.ts`, `app/api/areas/[areaId]/upcoming/route.ts`, `app/api/projects/[projectId]/today/route.ts`, `app/api/projects/[projectId]/upcoming/route.ts`

## バリデーション（抜粋）
- 必須: Task.title, Project.name/note, Area.name, Checklist.title
- `sortKey` は空文字不可
- `areaId` / `projectId` は所有チェック
- `projectId` に紐づく `area_id` との整合性をチェック

根拠: `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/projects/route.ts`, `app/api/areas/route.ts`, `app/api/checklists/[id]/route.ts`

## 未確認事項
- API のバージョニング方針
  - 追加確認候補: README, 運用ドキュメント
