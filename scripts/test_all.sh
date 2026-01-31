#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

base_url=${BASE_URL:-http://localhost:3000}
TOKEN=$(node scripts/get_access_token.mjs | tr -d '\r\n')
if [[ -z "${TOKEN}" ]]; then
  echo "Failed to get access token" 1>&2
  exit 1
fi

header_auth=("-H" "x-access-token: $TOKEN")

test_prefix=${TEST_PREFIX:-[TEST] }

curl_cmd() {
  curl -sS --max-time 10 "$@"
}

extract_id() {
  python3 -c 'import json, re, sys
text = sys.argv[1].strip() if len(sys.argv) > 1 else ""
if not text:
    print("")
    raise SystemExit
try:
    data = json.loads(text)
    print(data.get("item", {}).get("id", ""))
    raise SystemExit
except Exception:
    pass
match = re.search(r"\"item\"\s*:\s*\{[^}]*\"id\"\s*:\s*\"([^\"]+)\"", text)
print(match.group(1) if match else "")
' "$1"
}

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

# Create Area
AREA_RESP=$(curl_cmd -X POST "$base_url/api/areas" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${test_prefix}Work\",\"sortKey\":\"a\"}")
printf "\n# Create Area\n%s\n\n" "$AREA_RESP"
AREA_ID=$(extract_id "$AREA_RESP")

AREA_JSON="null"
if [[ -n "$AREA_ID" ]]; then
  AREA_JSON="\"$AREA_ID\""
fi

# Create Project
PROJECT_RESP=$(curl_cmd -X POST "$base_url/api/projects" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${test_prefix}Project A\",\"note\":\"${test_prefix}Project note\",\"areaId\":$AREA_JSON}")
printf "\n# Create Project\n%s\n\n" "$PROJECT_RESP"
PROJECT_ID=$(extract_id "$PROJECT_RESP")

PROJECT_JSON="null"
if [[ -n "$PROJECT_ID" ]]; then
  PROJECT_JSON="\"$PROJECT_ID\""
fi

# Compute today/tomorrow JST
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

run "Create Anytime task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Anytime task\",\"note\":\"${test_prefix}Anytime note\",\"date\":null,\"someday\":false,\"areaId\":$AREA_JSON,\"projectId\":$PROJECT_JSON}"

run "Create Today task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Today task\",\"note\":\"${test_prefix}Today note\",\"date\":\"$TODAY\",\"someday\":false}"

run "Create Upcoming task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Upcoming task\",\"note\":\"${test_prefix}Upcoming note\",\"date\":\"$TOMORROW\",\"someday\":false}"

run "Create Someday task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Someday task\",\"note\":\"${test_prefix}Someday note\",\"someday\":true}"

run "Anytime" \
  curl_cmd "$base_url/api/anytime" \
    "${header_auth[@]}"

run "Today" \
  curl_cmd "$base_url/api/today" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: 540"

run "Upcoming" \
  curl_cmd "$base_url/api/upcoming" \
    "${header_auth[@]}" \
    -H "x-tz-offset-minutes: 540"

run "Someday" \
  curl_cmd "$base_url/api/someday" \
    "${header_auth[@]}"

run "Inbox" \
  curl_cmd "$base_url/api/inbox" \
    "${header_auth[@]}"

run "Areas" \
  curl_cmd "$base_url/api/areas" \
    "${header_auth[@]}"

if [[ -n "$AREA_ID" ]]; then
  run "Area detail" \
    curl_cmd "$base_url/api/areas/$AREA_ID" \
      "${header_auth[@]}"
  run "Area Today" \
    curl_cmd "$base_url/api/areas/$AREA_ID/today" \
      "${header_auth[@]}" \
      -H "x-tz-offset-minutes: 540"
  run "Area Upcoming" \
    curl_cmd "$base_url/api/areas/$AREA_ID/upcoming" \
      "${header_auth[@]}" \
      -H "x-tz-offset-minutes: 540"
fi

run "Projects" \
  curl_cmd "$base_url/api/projects" \
    "${header_auth[@]}"

if [[ -n "$PROJECT_ID" ]]; then
  run "Project detail" \
    curl_cmd "$base_url/api/projects/$PROJECT_ID" \
      "${header_auth[@]}"
  run "Project Today" \
    curl_cmd "$base_url/api/projects/$PROJECT_ID/today" \
      "${header_auth[@]}" \
      -H "x-tz-offset-minutes: 540"
  run "Project Upcoming" \
    curl_cmd "$base_url/api/projects/$PROJECT_ID/upcoming" \
      "${header_auth[@]}" \
      -H "x-tz-offset-minutes: 540"
fi

# Checklist on the latest Anytime task
ANYTIME_RESP=$(curl_cmd "$base_url/api/anytime" "${header_auth[@]}")
TASK_ID=$(python3 -c 'import json,sys
text=sys.argv[1]
try:
    data=json.loads(text)
    items=data.get("items",[])
    print(items[0]["id"] if items else "")
except Exception:
    print("")
' "$ANYTIME_RESP")

if [[ -n "$TASK_ID" ]]; then
  run "Create Checklist" \
    curl_cmd -X POST "$base_url/api/tasks/$TASK_ID/checklists" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"${test_prefix}Checklist item\",\"completed\":false}"

  ANYTIME_RESP_2=$(curl_cmd "$base_url/api/anytime" "${header_auth[@]}")
  CHECK_ID=$(python3 -c 'import json,sys
text=sys.argv[1]
try:
    data=json.loads(text)
    items=data.get("items",[])
    if not items:
        print("")
    else:
        checks=items[0].get("checklists",[])
        print(checks[0]["id"] if checks else "")
except Exception:
    print("")
' "$ANYTIME_RESP_2")

  if [[ -n "$CHECK_ID" ]]; then
    run "Update Checklist" \
      curl_cmd -X PATCH "$base_url/api/checklists/$CHECK_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d '{"completed":true}'
  fi

  run "Complete task" \
    curl_cmd -X PATCH "$base_url/api/tasks/$TASK_ID" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d '{"completedAt":"2026-01-30T00:00:00Z"}'

  run "Archive task" \
    curl_cmd -X PATCH "$base_url/api/tasks/$TASK_ID" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d '{"archivedAt":"2026-01-30T00:00:00Z"}'

  run "Logbook" \
    curl_cmd "$base_url/api/logbook" \
      "${header_auth[@]}"
fi
