#!/bin/sh
# =============================================================================
# T430 — entrypoint da API: aplica migrations pendentes antes de subir o servidor.
#
# Fail-fast: se o `migrate deploy` falhar, o container NÃO sobe (exit != 0) —
# nunca servir app com schema incompatível (a causa raiz do incidente P2022).
#
# Escape hatch (somente recuperação de incidente): SKIP_MIGRATIONS=true pula o
# deploy, com aviso alto no log e registro obrigatório em DECISOES. Default off.
#
# Forward-only consciente: revert de código NÃO reverte migrations (aditivas);
# colunas órfãs são seguras. Rollback = revert + redeploy (ver DECISOES).
#
# Escala futura: `migrate deploy` concorrente é guardado por advisory lock do
# Prisma; com 1 réplica hoje é não-issue (revisar ao replicar).
# =============================================================================
set -e

if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "WARNING: SKIP_MIGRATIONS=true — pulando prisma migrate deploy." >&2
  echo "WARNING: usar somente em recuperação de incidente; registrar em DECISOES." >&2
else
  echo "Applying pending database migrations..."
  # Caminho explícito (verificado na imagem): o binário do Prisma vive no
  # node_modules do pacote, não no .bin da raiz do workspace.
  ./apps/api/node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma
  echo "Migrations up to date."
fi

exec node apps/api/dist/server.js
