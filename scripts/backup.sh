#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/spendwise/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/spendwise_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting PostgreSQL backup → $FILENAME"
docker exec spendwise-postgres-1 pg_dump \
  -U "${POSTGRES_USER:-spendwise}" \
  "${POSTGRES_DB:-spendwise}" \
  | gzip > "$FILENAME"

echo "[backup] Size: $(du -sh "$FILENAME" | cut -f1)"

# Retention: keep last 14 daily backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete
echo "[backup] Old backups pruned. Done."