#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

TOKEN=$(node scripts/get_access_token.mjs | tr -d '\r\n')
if [[ -z "${TOKEN}" ]]; then
  echo "Failed to get access token" 1>&2
  exit 1
fi

base_url=${BASE_URL:-http://localhost:3000}

# Compute today/tomorrow with JST offset (540 minutes) to match API default tests.
TODAY=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset)
print(now.strftime('%Y-%m-%d'))
PY
)
TOMORROW=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset) + timedelta(days=1)
print(now.strftime('%Y-%m-%d'))
PY
)

header_auth=("-H" "Authorization: Bearer $TOKEN")

run() {
  printf "\n# %s\n" "$1"
  shift
  "$@" | cat
  echo ""
}

run "Create Anytime task" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d '{"title":"Anytime task","note":"Anytime note","date":null,"someday":false}'

run "Create Today task" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Today task\",\"note\":\"Today note\",\"date\":\"$TODAY\",\"someday\":false}"

run "Create Upcoming task" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Upcoming task\",\"note\":\"Upcoming note\",\"date\":\"$TOMORROW\",\"someday\":false}"

run "Create Someday task" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d '{"title":"Someday task","note":"Someday note","someday":true}'

run "Anytime" \
  curl -s "$base_url/api/anytime" \
    "${header_auth[@]}"

run "Today" \
  curl -s "$base_url/api/today" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: 540"

run "Upcoming" \
  curl -s "$base_url/api/upcoming" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: 540"

run "Someday" \
  curl -s "$base_url/api/someday" \
    "${header_auth[@]}"

# Grab a task id for logbook test (latest Anytime)
TASK_ID=$(curl -s "$base_url/api/anytime" "${header_auth[@]}" | python3 - <<'PY'
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get('items', [])
    print(items[0]['id'] if items else '')
except Exception:
    print('')
PY
)

if [[ -n "$TASK_ID" ]]; then
  run "Complete one task" \
    curl -s -X PATCH "$base_url/api/tasks/$TASK_ID" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d '{"completedAt":"2026-01-30T00:00:00Z"}'

  run "Archive one task" \
    curl -s -X PATCH "$base_url/api/tasks/$TASK_ID" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d '{"archivedAt":"2026-01-30T00:00:00Z"}'

  run "Logbook" \
    curl -s "$base_url/api/logbook" \
      "${header_auth[@]}"
else
  echo "# Logbook\nNo task found to complete."
fi
