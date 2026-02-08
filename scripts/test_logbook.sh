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
base_url=${BASE_URL:-http://localhost:3000}
# shellcheck disable=SC1091
source scripts/test_auth_common.sh
init_auth_header

curl -s -X PATCH "$base_url/api/tasks/$TASK_ID" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d '{"completedAt":"2026-01-30T00:00:00Z"}' | cat

echo ""

curl -s -X PATCH "$base_url/api/tasks/$TASK_ID" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d '{"archivedAt":"2026-01-30T00:00:00Z"}' | cat

echo ""

curl -s "$base_url/api/logbook" \
  "${header_auth[@]}" | cat

echo ""
