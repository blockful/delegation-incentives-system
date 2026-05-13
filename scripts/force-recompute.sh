#!/usr/bin/env bash
# Force recomputation of a distribution month.
#
# Usage:
#   ./scripts/force-recompute.sh 2026-03
#
# What it does:
#   Deletes the cached distribution result from the database. The backend's
#   automatic distribution scheduler will recompute it on its next scan
#   (within ~60 seconds, once Ponder reports ready).
#
# Prerequisites: DATABASE_URL must be set (either in .env or environment).

set -euo pipefail

MONTH="${1:-}"
MONTH_RE='^[0-9]{4}-(0[1-9]|1[0-2])$'

if [[ -z "$MONTH" ]]; then
  echo "Usage: $0 YYYY-MM"
  echo "Example: $0 2026-03"
  exit 1
fi

if ! [[ "$MONTH" =~ $MONTH_RE ]]; then
  echo "Error: invalid month format '$MONTH' — expected YYYY-MM (e.g. 2026-03)"
  exit 1
fi

# Load .env if DATABASE_URL isn't already set
if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$(dirname "$0")/../.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Add it to .env or export it before running."
  exit 1
fi

echo "Clearing cached distribution for $MONTH..."
psql "$DATABASE_URL" -c "DELETE FROM distribution_result WHERE month = '$MONTH';"
echo "Done. The backend scheduler will recompute on its next scan (~60s)."
