#!/bin/sh
# Daily PostgreSQL backups (runs in the "backup" container of docker-compose.prod.yml).
#   BACKUP_AT         time of day to run, HH:MM in the container's TZ (default 02:30)
#   BACKUP_KEEP_DAYS  delete dumps older than this many days (default 14)
#   BACKUP_ON_START   "true" = also take one backup right away (default true)
# Connection comes from PGHOST / PGUSER / PGPASSWORD / PGDATABASE.
# Files: /backups/hrportal-YYYYMMDD-HHMMSS.dump (pg_dump custom format, includes photos).
# Copy /backups off this machine regularly (e.g. rclone / rsync to another server or cloud storage).
set -eu

AT="${BACKUP_AT:-02:30}"
KEEP="${BACKUP_KEEP_DAYS:-14}"

backup() {
  file="/backups/hrportal-$(date +%Y%m%d-%H%M%S).dump"
  # Write to a temp name first so a half-written dump never looks like a good backup
  if pg_dump -Fc -f "$file.partial"; then
    mv "$file.partial" "$file"
    echo "$(date -Iseconds) backup ok: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.partial"
    echo "$(date -Iseconds) BACKUP FAILED" >&2
  fi
  find /backups -name 'hrportal-*.dump' -mtime +"$KEEP" -print -delete
}

until pg_isready -q; do sleep 2; done
[ "${BACKUP_ON_START:-true}" = "true" ] && backup

last=""
while true; do
  now="$(date +%H:%M)"
  today="$(date +%F)"
  if [ "$now" = "$AT" ] && [ "$last" != "$today" ]; then
    backup
    last="$today"
  fi
  sleep 30
done
