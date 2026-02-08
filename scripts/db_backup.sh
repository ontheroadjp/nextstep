#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
DATABASE_URL_VALUE="${DATABASE_URL:-}"
OUTPUT_FILE=""

usage() {
  cat <<'EOF'
Usage: scripts/db_backup.sh --output <file.sql> [--dry-run] [--database-url <url>]

Create a plain SQL backup using pg_dump.
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
    --output)
      if (($# < 2)); then
        echo "Missing value for --output" >&2
        exit 1
      fi
      OUTPUT_FILE="$2"
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

if [[ -z "$OUTPUT_FILE" ]]; then
  echo "--output is required." >&2
  exit 1
fi

if ((DRY_RUN == 1)); then
  echo "DRY-RUN: backup plan"
  echo "  OUTPUT $OUTPUT_FILE"
  exit 0
fi

if [[ -z "$DATABASE_URL_VALUE" ]]; then
  echo "DATABASE_URL is required (or pass --database-url)." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump command is required but not found." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Creating backup: $OUTPUT_FILE"
pg_dump --no-owner --no-privileges --format=plain --file "$OUTPUT_FILE" "$DATABASE_URL_VALUE"
echo "Backup completed."
