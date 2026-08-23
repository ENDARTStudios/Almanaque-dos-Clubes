#!/usr/bin/env bash
# Deploy T322 — reparo de órfãos.
# ATENÇÃO: o entrypoint de reparo NÃO existe no repositório ainda.
# Este script falha rápido e instrui a implementar o reparo antes de rodar.
set -euo pipefail

SERVICE="${RAILWAY_SERVICE:-api}"
REPAIR_SCRIPT="${REPAIR_SCRIPT:-db:reparo:orfaos}"

if ! command -v railway >/dev/null 2>&1; then
  echo "ERRO: CLI 'railway' não encontrada. Instale: npm i -g @railway/cli" >&2
  exit 1
fi

if ! grep -q "\"$REPAIR_SCRIPT\"" apps/api/package.json 2>/dev/null; then
  echo "ERRO: script '$REPAIR_SCRIPT' não existe em apps/api/package.json." >&2
  echo "O reparo de órfãos (T322) ainda não foi implementado no repositório." >&2
  echo "Implemente o entrypoint e adicione o script ao package.json antes de executar." >&2
  exit 1
fi

echo "[T322] Executando '$REPAIR_SCRIPT' no serviço '$SERVICE'..."
railway run --service "$SERVICE" npm run "$REPAIR_SCRIPT"
echo "[T322] Reparo executado."
