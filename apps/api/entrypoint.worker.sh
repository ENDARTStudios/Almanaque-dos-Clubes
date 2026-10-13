#!/bin/sh
set -e
# T543 — entrypoint do serviço `media-worker`.
#
# Diferenças em relação ao entrypoint da API (de propósito):
#  - NÃO aplica `prisma migrate deploy`: quem migra é o deploy da API. Duas réplicas
#    migrando ao mesmo tempo é corrida (e o worker não deve travar o boot por schema).
#  - Sobe o consumidor da fila DEDICADA de mídia (`media-enrich`), não o servidor HTTP.
echo "media-worker: iniciando (sem migrations) — consumindo a fila media-enrich"
exec node apps/api/dist/scripts/media-worker.js
