#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
DATABASE_URL_VALUE="${DATABASE_URL:-}"
INPUT_FILE=""

usage() {
  cat <<'EOF'
Usage: scripts/db_rollback.sh --input <backup.sql> [--dry-run] [--database-url <url>]

Restore database from a SQL backup file using psql.
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
    --input)
      if (($# < 2)); then
        echo "Missing value for --input" >&2
        exit 1
      fi
      INPUT_FILE="$2"
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

if [[ -z "$INPUT_FILE" ]]; then
  echo "--input is required." >&2
  exit 1
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "Input SQL file not found: $INPUT_FILE" >&2
  exit 1
fi

if ((DRY_RUN == 1)); then
  echo "DRY-RUN: rollback plan"
  echo "  RESTORE $INPUT_FILE"
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

echo "Restoring from: $INPUT_FILE"
psql "$DATABASE_URL_VALUE" -v ON_ERROR_STOP=1 -f "$INPUT_FILE"
echo "Rollback restore completed."
