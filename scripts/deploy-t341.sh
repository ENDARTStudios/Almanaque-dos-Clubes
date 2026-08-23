#!/usr/bin/env bash
# Deploy T341 — mailer transacional (fila email BullMQ + email-worker + templates).
# Idempotente: `railway up` implanta o HEAD atual do serviço.
set -euo pipefail

SERVICE="${RAILWAY_SERVICE:-Almanaque-dos-Clubes}"

if ! command -v railway >/dev/null 2>&1; then
  echo "ERRO: CLI 'railway' não encontrada. Instale: npm i -g @railway/cli" >&2
  exit 1
fi

echo "[T341] Deploy do serviço '$SERVICE' (mailer transacional)..."
railway up --service "$SERVICE" --detach
echo "[T341] Deploy disparado. Verifique o build no dashboard do Railway."
