#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <TASK_ID>" 1>&2
  exit 1
fi

TASK_ID=$1
TOKEN=$(node scripts/get_access_token.mjs | tr -d '\r\n')
if [[ -z "${TOKEN}" ]]; then
  echo "Failed to get access token" 1>&2
  exit 1
fi

base_url=${BASE_URL:-http://localhost:3000}

curl -s -X PATCH "$base_url/api/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completedAt":"2026-01-30T00:00:00Z"}' | cat

echo ""

curl -s -X PATCH "$base_url/api/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"archivedAt":"2026-01-30T00:00:00Z"}' | cat

echo ""

curl -s "$base_url/api/logbook" \
  -H "Authorization: Bearer $TOKEN" | cat

echo ""
