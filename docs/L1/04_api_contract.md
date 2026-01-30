# API コントラクト（草案）

## 基本方針

- すべて JSON
- 成功時は 2xx、失敗時は 4xx/5xx
- エラーは共通フォーマット
- 認証は `Authorization: Bearer <access_token>` または `x-access-token` を使用する
- 日付境界のため `x-tz-offset-minutes` を送信できる（例: JST は 540）

---

## 共通レスポンス

### Error

```
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

---

## 共通ルール

- `someday = true` の場合は `date = null` に正規化する
- `date != null` の場合は `someday = false` に正規化する
- `completedAt != null` のタスクは Logbook のみ表示する
- `sortKey` は任意だが、指定する場合は空白不可（空文字は拒否）

---

## Tasks

### GET /api/today

```
{ "items": [Task] }
```

### GET /api/upcoming

```
{ "groups": [{ "date": "YYYY-MM-DD", "items": [Task] }] }
```

### GET /api/anytime

```
{ "items": [Task] }
```

### GET /api/someday

```
{ "items": [Task] }
```

### GET /api/logbook

```
{ "items": [Task] }
```

### POST /api/tasks

入力

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

返却

```
{ "item": Task }
```

### PATCH /api/tasks/{id}

入力

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

返却

```
{ "item": Task }
```

### DELETE /api/tasks/{id}

```
{ "ok": true }
```

---

## Projects

### GET /api/projects

```
{ "items": [Project] }
```

### GET /api/projects/{id}

```
{ "item": Project, "tasks": [Task] }
```

### POST /api/projects

入力

```
{
  "name": "string",
  "note": "string",
  "areaId": "area_..." | null,
  "sortKey": "string" | null
}
```

返却

```
{ "item": Project }
```

### PATCH /api/projects/{id}

入力

```
{
  "name": "string",
  "note": "string",
  "areaId": "area_..." | null,
  "sortKey": "string" | null
}
```

返却

```
{ "item": Project }
```

### DELETE /api/projects/{id}

```
{ "ok": true }
```

---

## Areas

### GET /api/areas

```
{ "items": [Area] }
```

### GET /api/areas/{id}

```
{ "item": Area, "tasks": [Task], "projects": [Project] }
```

### POST /api/areas

入力

```
{
  "name": "string",
  "sortKey": "string" | null
}
```

返却

```
{ "item": Area }
```

### PATCH /api/areas/{id}

入力

```
{
  "name": "string",
  "sortKey": "string" | null
}
```

返却

```
{ "item": Area }
```

### DELETE /api/areas/{id}

```
{ "ok": true }
```

---

## Checklists

### POST /api/tasks/{taskId}/checklists

入力

```
{
  "title": "string",
  "completed": false,
  "sortKey": "string" | null
}
```

返却

```
{ "item": Checklist }
```

### PATCH /api/checklists/{id}

入力

```
{
  "title": "string",
  "completed": false,
  "sortKey": "string" | null
}
```

返却

```
{ "item": Checklist }
```

### DELETE /api/checklists/{id}

```
{ "ok": true }
```

---

## 型（参考）

### Task

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
    { "id": "check_...", "title": "string", "completed": false, "sortKey": "string" | null }
  ]
}
```

### Project

```
{
  "id": "project_...",
  "name": "string",
  "note": "string",
  "areaId": "area_..." | null,
  "sortKey": "string" | null
}
```

### Area

```
{
  "id": "area_...",
  "name": "string",
  "sortKey": "string" | null
}
```

### Checklist

```
{
  "id": "check_...",
  "title": "string",
  "completed": false,
  "sortKey": "string" | null
}
```
