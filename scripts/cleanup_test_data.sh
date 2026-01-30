#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "SUPABASE_URL / SUPABASE_ANON_KEY are required in .env" 1>&2
  exit 1
fi

if [[ -z "${TEST_EMAIL:-}" || -z "${TEST_PASSWORD:-}" ]]; then
  echo "TEST_EMAIL / TEST_PASSWORD are required in .env" 1>&2
  exit 1
fi

TOKEN=$(node scripts/get_access_token.mjs | tr -d '\r\n')
if [[ -z "${TOKEN}" ]]; then
  echo "Failed to get access token" 1>&2
  exit 1
fi

BASE=${SUPABASE_URL%/}
REST="$BASE/rest/v1"

prefix=${TEST_PREFIX:-[TEST] }
# URL-encode prefix for ilike pattern
prefix_enc=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$prefix")

# Delete checklists first
curl -s -X DELETE "$REST/checklists?title=ilike.${prefix_enc}%25" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  | cat

echo ""

# Delete tasks
curl -s -X DELETE "$REST/tasks?title=ilike.${prefix_enc}%25" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  | cat

echo ""

# Delete projects
curl -s -X DELETE "$REST/projects?name=ilike.${prefix_enc}%25" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  | cat

echo ""

# Delete areas
curl -s -X DELETE "$REST/areas?name=ilike.${prefix_enc}%25" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Prefer: return=representation" \
  | cat

echo ""
