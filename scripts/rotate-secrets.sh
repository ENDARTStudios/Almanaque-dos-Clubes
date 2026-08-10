#!/usr/bin/env bash
# rotate-secrets.sh — Rotação automática de segredos JWT
# Uso: ./scripts/rotate-secrets.sh [--apply]
# Sem --apply: apenas gera novos segredos e exibe
# Com --apply: atualiza .env.production e recarrega a aplicação

set -euo pipefail

generate_secret() {
  openssl rand -base64 48
}

echo "=== Rotação de Segredos JWT ==="
echo "Data: $(date -I)"
echo ""

JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)

echo "Novos segredos gerados (NÃO compartilhe):"
echo "  JWT_SECRET=$JWT_SECRET"
echo "  JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

if [[ "${1:-}" == "--apply" ]]; then
  ENV_FILE="${2:-.env.production}"
  if [[ -f "$ENV_FILE" ]]; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" "$ENV_FILE"
    echo "✅ Segredos atualizados em $ENV_FILE"
    echo "⚠️  Recarregue a aplicação para aplicar os novos segredos"
  else
    echo "⚠️  $ENV_FILE não encontrado. Segredos não foram persistidos."
    echo "   Adicione manualmente ao .env:"
    echo "   JWT_SECRET=$JWT_SECRET"
    echo "   JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
  fi
else
  echo "Modo preview (sem --apply). Para aplicar:"
  echo "  ./scripts/rotate-secrets.sh --apply .env.production"
fi
