#!/bin/sh
# Restore a backup into the running database (REPLACES current data).
#   sh scripts/restore.sh backups/hrportal-20261031-023000.dump
# Uses docker compose from the project root; the api is stopped during the restore.
# The restore runs in ONE transaction: if anything fails, the database is left exactly as it was.
set -eu

DUMP="${1:?usage: sh scripts/restore.sh <path-to-.dump>}"
[ -f "$DUMP" ] || { echo "not found: $DUMP" >&2; exit 1; }

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
echo "This replaces ALL data in the database with $DUMP. Type 'restore' to continue:"
read -r answer
[ "$answer" = "restore" ] || { echo "cancelled"; exit 1; }

# Whatever happens below, remove the copied dump and bring the API back
cleanup() {
  $COMPOSE exec -T db rm -f /tmp/restore.dump >/dev/null 2>&1 || true
  $COMPOSE start api >/dev/null 2>&1 || echo "WARNING: could not start the api; run: $COMPOSE start api" >&2
}
trap cleanup EXIT

$COMPOSE stop api
$COMPOSE cp "$DUMP" db:/tmp/restore.dump
if $COMPOSE exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction --exit-on-error /tmp/restore.dump'; then
  echo "restored from $DUMP"
else
  echo "RESTORE FAILED: nothing was changed (the whole restore was rolled back)" >&2
  exit 1
fi
