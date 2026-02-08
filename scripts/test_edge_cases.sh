#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

base_url=${BASE_URL:-http://localhost:3000}
# shellcheck disable=SC1091
source scripts/test_auth_common.sh
init_auth_header

test_prefix=${TEST_PREFIX:-[TEST] }

run() {
  printf "\n# %s\n" "$1"
  shift
  tmp=$(mktemp)
  set +e
  "$@" >"$tmp" 2>&1
  status=$?
  set -e
  cat "$tmp"
  rm -f "$tmp"
  if [[ $status -ne 0 ]]; then
    echo "Command failed with status $status" 1>&2
  fi
  echo ""
}

# Extract id from a JSON response stored in a variable.
extract_id() {
  python3 -c 'import json, sys
text = sys.argv[1].strip() if len(sys.argv) > 1 else ""
if not text:
    print("")
    raise SystemExit
try:
    data = json.loads(text)
    print(data.get("item", {}).get("id", ""))
except Exception:
    print("")
' "$1"
}

# Compute dates for JST
TODAY=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset)
print(now.strftime('%Y-%m-%d'))
PY
)
YESTERDAY=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset) - timedelta(days=1)
print(now.strftime('%Y-%m-%d'))
PY
)

# 1) Someday/date exclusivity
run "Someday overrides date" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Someday w date\",\"note\":\"${test_prefix}note\",\"date\":\"$TODAY\",\"someday\":true}"

run "Date overrides someday" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Date w someday\",\"note\":\"${test_prefix}note\",\"date\":\"$TODAY\",\"someday\":false}"

# 2) Past date appears in Today
run "Past date task" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Past task\",\"note\":\"${test_prefix}note\",\"date\":\"$YESTERDAY\",\"someday\":false}"

run "Today includes past date" \
  curl -s "$base_url/api/today" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: 540"

# 3) Timezone difference (UTC-8)
run "Today with UTC-8" \
  curl -s "$base_url/api/today" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: -480"

# 4) Validation errors
run "Missing title" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d '{"note":"note"}'

run "Blank note allowed" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d '{"title":"Title","note":"   "}'

# 5) Inbox overlap with date (no area + today)
INBOX_TODAY_RESP=$(curl -s -X POST "$base_url/api/tasks" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${test_prefix}Inbox Today\",\"note\":\"${test_prefix}note\",\"date\":\"$TODAY\",\"someday\":false}")
INBOX_TODAY_ID=$(extract_id "$INBOX_TODAY_RESP")

run "Inbox" \
  curl -s "$base_url/api/inbox" \
    "${header_auth[@]}"

run "Today again" \
  curl -s "$base_url/api/today" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: 540"

# 6) Area/Project filter
AREA_RESP=$(curl -s -X POST "$base_url/api/areas" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${test_prefix}Edge Area\"}")
AREA_ID=$(extract_id "$AREA_RESP")

AREA_JSON="null"
if [[ -n "$AREA_ID" ]]; then
  AREA_JSON="\"$AREA_ID\""
fi

PROJECT_RESP=$(curl -s -X POST "$base_url/api/projects" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${test_prefix}Edge Project\",\"note\":\"${test_prefix}note\",\"areaId\":$AREA_JSON}")
PROJECT_ID=$(extract_id "$PROJECT_RESP")

PROJECT_JSON="null"
if [[ -n "$PROJECT_ID" ]]; then
  PROJECT_JSON="\"$PROJECT_ID\""
fi

run "Task in Area+Project" \
  curl -s -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Scoped task\",\"note\":\"${test_prefix}note\",\"date\":\"$TODAY\",\"someday\":false,\"areaId\":$AREA_JSON,\"projectId\":$PROJECT_JSON}"

if [[ -n "$AREA_ID" ]]; then
  run "Area Today filter" \
    curl -s "$base_url/api/areas/$AREA_ID/today" \
      "${header_auth[@]}" \
      -H "x-tz-offset-minutes: 540"
fi

if [[ -n "$PROJECT_ID" ]]; then
  run "Project Today filter" \
    curl -s "$base_url/api/projects/$PROJECT_ID/today" \
      "${header_auth[@]}" \
      -H "x-tz-offset-minutes: 540"
fi

# 7) Sort order via sortKey
SORT_A_RESP=$(curl -s -X POST "$base_url/api/tasks" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${test_prefix}Sort A\",\"note\":\"${test_prefix}note\",\"date\":null,\"someday\":false}")
SORT_A=$(extract_id "$SORT_A_RESP")

SORT_B_RESP=$(curl -s -X POST "$base_url/api/tasks" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${test_prefix}Sort B\",\"note\":\"${test_prefix}note\",\"date\":null,\"someday\":false}")
SORT_B=$(extract_id "$SORT_B_RESP")

if [[ -n "$SORT_A" && -n "$SORT_B" ]]; then
  run "Set sortKey" \
    curl -s -X PATCH "$base_url/api/tasks/$SORT_A" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d '{"sortKey":"b"}'

  run "Set sortKey" \
    curl -s -X PATCH "$base_url/api/tasks/$SORT_B" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d '{"sortKey":"a"}'

  run "Anytime order after sortKey" \
    curl -s "$base_url/api/anytime" \
      "${header_auth[@]}"
fi

# 8) Delete Area/Project and ensure nulling
if [[ -n "$AREA_ID" ]]; then
  run "Delete Area" \
    curl -s -X DELETE "$base_url/api/areas/$AREA_ID" \
      "${header_auth[@]}"
fi

if [[ -n "$PROJECT_ID" ]]; then
  run "Delete Project" \
    curl -s -X DELETE "$base_url/api/projects/$PROJECT_ID" \
      "${header_auth[@]}"
fi

# 9) RLS deny (second user if provided)
if [[ -n "${TEST_EMAIL_2:-}" && -n "${TEST_PASSWORD_2:-}" ]]; then
  TOKEN2=$(TEST_EMAIL="$TEST_EMAIL_2" TEST_PASSWORD="$TEST_PASSWORD_2" node scripts/get_access_token.mjs | tr -d '\r\n')
  if [[ -n "$TOKEN2" && -n "$INBOX_TODAY_ID" ]]; then
    run "RLS should deny update to other user's task" \
      curl -s -X PATCH "$base_url/api/tasks/$INBOX_TODAY_ID" \
        -H "Authorization: Bearer $TOKEN2" \
        -H "Content-Type: application/json" \
        -d '{"title":"HACKED"}'
  fi
else
  echo "# RLS cross-user test\nSet TEST_EMAIL_2 and TEST_PASSWORD_2 in .env to run."
fi
