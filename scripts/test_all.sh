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

# Create Secondary Area
AREA2_RESP=$(curl_cmd -X POST "$base_url/api/areas" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${test_prefix}Home\",\"sortKey\":\"b\"}")
printf "\n# Create Area 2\n%s\n\n" "$AREA2_RESP"
AREA2_ID=$(extract_id "$AREA2_RESP")

AREA2_JSON="null"
if [[ -n "$AREA2_ID" ]]; then
  AREA2_JSON="\"$AREA2_ID\""
fi

# Create Project B (no area)
PROJECT2_RESP=$(curl_cmd -X POST "$base_url/api/projects" \
  "${header_auth[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${test_prefix}Project B\",\"note\":\"${test_prefix}Project note\"}")
printf "\n# Create Project B\n%s\n\n" "$PROJECT2_RESP"
PROJECT2_ID=$(extract_id "$PROJECT2_RESP")

PROJECT2_JSON="null"
if [[ -n "$PROJECT2_ID" ]]; then
  PROJECT2_JSON="\"$PROJECT2_ID\""
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

DAY_AFTER=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset) + timedelta(days=2)
print(now.strftime('%Y-%m-%d'))
PY
)

DAY3=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset) + timedelta(days=3)
print(now.strftime('%Y-%m-%d'))
PY
)

DAY4=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset) + timedelta(days=4)
print(now.strftime('%Y-%m-%d'))
PY
)

DAY5=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
now = datetime.now(offset) + timedelta(days=5)
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

LOG_YESTERDAY=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
base = datetime.now(offset).replace(hour=12, minute=0, second=0, microsecond=0)
dt = base - timedelta(days=1)
print(dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z"))
PY
)

LOG_THIS_WEEK=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
base = datetime.now(offset).replace(hour=12, minute=0, second=0, microsecond=0)
dt = base - timedelta(days=3)
print(dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z"))
PY
)

LOG_THIS_MONTH=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
base = datetime.now(offset).replace(hour=12, minute=0, second=0, microsecond=0)
dt = base - timedelta(days=10)
print(dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z"))
PY
)

LOG_LAST_MONTH=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
offset = timezone(timedelta(minutes=540))
base = datetime.now(offset).replace(hour=12, minute=0, second=0, microsecond=0)
dt = base - timedelta(days=40)
print(dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z"))
PY
)

run "Create Anytime task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Anytime task\",\"note\":\"${test_prefix}Anytime note\",\"date\":null,\"someday\":false,\"areaId\":$AREA_JSON,\"projectId\":$PROJECT_JSON}"

for i in 1 2 3 4 5; do
  run "Create Extra Anytime $i" \
    curl_cmd -X POST "$base_url/api/tasks" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"${test_prefix}Anytime extra $i\",\"note\":\"${test_prefix}Anytime note $i\",\"date\":null,\"someday\":false}"
done

run "Create Inbox Today task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Inbox Today\",\"note\":\"${test_prefix}Inbox note\",\"date\":\"$TODAY\",\"someday\":false}"

run "Create Area Today task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Area Today\",\"note\":\"${test_prefix}Area note\",\"date\":\"$TODAY\",\"someday\":false,\"areaId\":$AREA2_JSON}"

run "Create Project A Today task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Project A Today\",\"note\":\"${test_prefix}Project note\",\"date\":\"$TODAY\",\"someday\":false,\"projectId\":$PROJECT_JSON}"

run "Create Project B Today task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Project B Today\",\"note\":\"${test_prefix}Project note\",\"date\":\"$TODAY\",\"someday\":false,\"projectId\":$PROJECT2_JSON}"

for i in 1 2 3 4 5; do
  run "Create Extra Today $i" \
    curl_cmd -X POST "$base_url/api/tasks" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"${test_prefix}Today extra $i\",\"note\":\"${test_prefix}Today note $i\",\"date\":\"$TODAY\",\"someday\":false}"
done

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

run "Create Upcoming task 2" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Upcoming task 2\",\"note\":\"${test_prefix}Upcoming note\",\"date\":\"$DAY_AFTER\",\"someday\":false,\"areaId\":$AREA2_JSON}"

run "Create Upcoming task 3" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Upcoming task 3\",\"note\":\"${test_prefix}Upcoming note\",\"date\":\"$DAY3\",\"someday\":false}"

run "Create Upcoming task 4" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Upcoming task 4\",\"note\":\"${test_prefix}Upcoming note\",\"date\":\"$DAY4\",\"someday\":false,\"projectId\":$PROJECT_JSON}"

run "Create Upcoming task 5" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Upcoming task 5\",\"note\":\"${test_prefix}Upcoming note\",\"date\":\"$DAY5\",\"someday\":false,\"areaId\":$AREA2_JSON}"

run "Create Someday task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Someday task\",\"note\":\"${test_prefix}Someday note\",\"someday\":true}"

run "Create Area Someday task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Area Someday\",\"note\":\"${test_prefix}Someday note\",\"someday\":true,\"areaId\":$AREA2_JSON}"

run "Create Project Someday task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Project Someday\",\"note\":\"${test_prefix}Someday note\",\"someday\":true,\"projectId\":$PROJECT_JSON}"

for i in 1 2 3 4 5; do
  run "Create Extra Someday $i" \
    curl_cmd -X POST "$base_url/api/tasks" \
      "${header_auth[@]}" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"${test_prefix}Someday extra $i\",\"note\":\"${test_prefix}Someday note $i\",\"someday\":true}"
done

run "Create Anytime Inbox task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Anytime Inbox\",\"note\":\"${test_prefix}Anytime note\",\"date\":null,\"someday\":false}"

run "Create Area Anytime task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Area Anytime\",\"note\":\"${test_prefix}Anytime note\",\"date\":null,\"someday\":false,\"areaId\":$AREA2_JSON}"

run "Create Project Anytime task" \
  curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Project Anytime\",\"note\":\"${test_prefix}Anytime note\",\"date\":null,\"someday\":false,\"projectId\":$PROJECT_JSON}"

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

  LOG1_RESP=$(curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Logbook Yesterday\",\"note\":\"${test_prefix}Logbook\",\"date\":\"$YESTERDAY\",\"someday\":false}")
  printf "\n# Create Logbook Yesterday\n%s\n\n" "$LOG1_RESP"
  LOG1_ID=$(extract_id "$LOG1_RESP")

  if [[ -n "$LOG1_ID" ]]; then
    run "Complete Logbook Yesterday" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG1_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"completedAt\":\"$LOG_YESTERDAY\"}"
    run "Archive Logbook Yesterday" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG1_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"archivedAt\":\"$LOG_YESTERDAY\"}"
  fi

  LOG2_RESP=$(curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Logbook This Week\",\"note\":\"${test_prefix}Logbook\",\"date\":null,\"someday\":false}")
  printf "\n# Create Logbook This Week\n%s\n\n" "$LOG2_RESP"
  LOG2_ID=$(extract_id "$LOG2_RESP")

  if [[ -n "$LOG2_ID" ]]; then
    run "Complete Logbook This Week" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG2_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"completedAt\":\"$LOG_THIS_WEEK\"}"
    run "Archive Logbook This Week" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG2_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"archivedAt\":\"$LOG_THIS_WEEK\"}"
  fi

  LOG3_RESP=$(curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Logbook This Month\",\"note\":\"${test_prefix}Logbook\",\"date\":null,\"someday\":false}")
  printf "\n# Create Logbook This Month\n%s\n\n" "$LOG3_RESP"
  LOG3_ID=$(extract_id "$LOG3_RESP")

  if [[ -n "$LOG3_ID" ]]; then
    run "Complete Logbook This Month" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG3_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"completedAt\":\"$LOG_THIS_MONTH\"}"
    run "Archive Logbook This Month" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG3_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"archivedAt\":\"$LOG_THIS_MONTH\"}"
  fi

  LOG4_RESP=$(curl_cmd -X POST "$base_url/api/tasks" \
    "${header_auth[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"${test_prefix}Logbook Last Month\",\"note\":\"${test_prefix}Logbook\",\"date\":null,\"someday\":false}")
  printf "\n# Create Logbook Last Month\n%s\n\n" "$LOG4_RESP"
  LOG4_ID=$(extract_id "$LOG4_RESP")

  if [[ -n "$LOG4_ID" ]]; then
    run "Complete Logbook Last Month" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG4_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"completedAt\":\"$LOG_LAST_MONTH\"}"
    run "Archive Logbook Last Month" \
      curl_cmd -X PATCH "$base_url/api/tasks/$LOG4_ID" \
        "${header_auth[@]}" \
        -H "Content-Type: application/json" \
        -d "{\"archivedAt\":\"$LOG_LAST_MONTH\"}"
  fi

  run "Logbook" \
    curl_cmd "$base_url/api/logbook" \
      "${header_auth[@]}"
fi
