#!/usr/bin/env bash
# Deploy T342 — mailer auth (verificação de email + reset via mailer provider-agnostic).
# Idempotente: `railway up` implanta o HEAD atual do serviço.
set -euo pipefail

SERVICE="${RAILWAY_SERVICE:-api}"

if ! command -v railway >/dev/null 2>&1; then
  echo "ERRO: CLI 'railway' não encontrada. Instale: npm i -g @railway/cli" >&2
  exit 1
fi

echo "[T342] Deploy do serviço '$SERVICE' (mailer auth + verificação de email)..."
railway up --service "$SERVICE" --detach
echo "[T342] Deploy disparado. Verifique o build no dashboard do Railway."
