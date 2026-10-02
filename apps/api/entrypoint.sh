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
  echo "WARNING: SKIP_MIGRATIONS=true — pulando prisma migrate deploy. Documente em DECISOES.md se usado em produção." >&2
else
  echo "Applying pending migrations (T430 entrypoint)..."
  # Caminho explícito e determinístico (verificado na imagem em 2026-09-07
  # e 2026-09-14): o binário do Prisma vive no node_modules do pacote, não
  # no .bin da raiz do workspace. Sem fallback: layout diferente deve falhar
  # alto aqui e no gate de CI (scripts/ci/check-entrypoint.mjs), nunca
  # silenciosamente.
  PRISMA_BIN="./apps/api/node_modules/.bin/prisma"
  if [ ! -x "$PRISMA_BIN" ]; then
    echo "FATAL: prisma CLI not found at $PRISMA_BIN — container will not start." >&2
    exit 1
  fi
  if ! "$PRISMA_BIN" migrate deploy --schema=apps/api/prisma/schema.prisma; then
    echo "FATAL: Migration failed — container will not start (fail-fast policy)." >&2
    exit 1
  fi
  echo "Migrations up to date."
fi

exec node apps/api/dist/server.js
