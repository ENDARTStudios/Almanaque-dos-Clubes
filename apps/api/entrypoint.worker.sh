#!/bin/sh
set -e
# T543 — entrypoint do serviço `media-worker`.
#
# Diferenças em relação ao entrypoint da API (de propósito):
#  - NÃO aplica `prisma migrate deploy`: quem migra é o deploy da API. Duas réplicas
#    migrando ao mesmo tempo é corrida (e o worker não deve travar o boot por schema).
#  - Sobe o consumidor da fila DEDICADA de mídia (`media-enrich`), não o servidor HTTP.
#
# T575 — o MESMO image (e o mesmo serviço) também sobe o bot de enriquecimento contínuo,
# escolhido por variável: `MEDIA_WORKER_MODE=enrich-bot`. Não há `startCommand` possível
# no Railway porque o ENTRYPOINT do image é exec-form (argumento viraria parâmetro do
# entrypoint) — daí o modo ser decidido AQUI. Sem a variável, o comportamento é
# exatamente o de antes (default `media-worker`).
if [ "${MEDIA_WORKER_MODE:-media-worker}" = "enrich-bot" ]; then
  echo "media-worker: MEDIA_WORKER_MODE=enrich-bot — subindo o bot de enriquecimento contínuo"
  exec node apps/api/dist/scripts/enrich-bot.js
fi

echo "media-worker: iniciando (sem migrations) — consumindo a fila media-enrich"
exec node apps/api/dist/scripts/media-worker.js
