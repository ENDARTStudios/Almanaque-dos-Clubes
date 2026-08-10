#!/usr/bin/env bash
# backup-db.sh — Backup automático do PostgreSQL
# Uso: ./scripts/backup-db.sh [output-dir]
# Default output-dir: ./backups/

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="${OUTPUT_DIR}/almanaque-${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

echo "=== Backup PostgreSQL ==="
echo "Origem:  ${DATABASE_URL:-postgresql://almanaque@localhost:5432/almanaque}"
echo "Destino: $FILENAME"
echo ""

pg_dump "${DATABASE_URL:-postgresql://almanaque:almanaque_dev_2025@localhost:5432/almanaque}" \
  --no-owner \
  --no-acl \
  | gzip > "$FILENAME"

echo "✅ Backup concluído: $(du -h "$FILENAME" | cut -f1)"

# Limpeza: apaga backups com mais de 30 dias
find "$OUTPUT_DIR" -name "almanaque-*.sql.gz" -mtime +30 -delete
echo "🗑️  Backups antigos (>30 dias) removidos"
