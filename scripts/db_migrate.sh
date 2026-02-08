#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
DATABASE_URL_VALUE="${DATABASE_URL:-}"

usage() {
  cat <<'EOF'
Usage: scripts/db_migrate.sh [--dry-run] [--database-url <url>]

Apply SQL files in the fixed order:
  1) db/migrations/0001_init.sql
  2) db/maintenance/0002_apply_sort_key_constraints.sql
  3) db/maintenance/0003_archive_flow.sql
EOF
}

while (($# > 0)); do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --database-url)
      if (($# < 2)); then
        echo "Missing value for --database-url" >&2
        exit 1
      fi
      DATABASE_URL_VALUE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

FILES=(
  "$ROOT_DIR/db/migrations/0001_init.sql"
  "$ROOT_DIR/db/maintenance/0002_apply_sort_key_constraints.sql"
  "$ROOT_DIR/db/maintenance/0003_archive_flow.sql"
)

for file in "${FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "SQL file not found: $file" >&2
    exit 1
  fi
done

if ((DRY_RUN == 1)); then
  echo "DRY-RUN: migrate plan"
  for file in "${FILES[@]}"; do
    echo "  APPLY $file"
  done
  exit 0
fi

if [[ -z "$DATABASE_URL_VALUE" ]]; then
  echo "DATABASE_URL is required (or pass --database-url)." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command is required but not found." >&2
  exit 1
fi

for file in "${FILES[@]}"; do
  echo "Applying: $file"
  psql "$DATABASE_URL_VALUE" -v ON_ERROR_STOP=1 -f "$file"
done

echo "Migration apply completed."
