/**
 * T542 — WORKER DEDICADO DE MÍDIA (serviço `media-worker`).
 *
 * Por que existe: o lote de mídia é intensivo em rede (wikitext da Wikipédia + Commons)
 * e em CPU (parse/JSON). Rodando no mesmo container da API, ele subiu a latência p50 da
 * API de **2 ms para 67 ms** (medido no T535) — inaceitável para a Beta com usuários.
 *
 * Este processo consome SOMENTE a fila `media-enrich` e roda num serviço Railway
 * separado, com o MESMO image da API (não precisa de app novo nem Dockerfile: o
 * entrypoint é este arquivo). A API deixa de consumir essa fila quando recebe
 * `MEDIA_WORKER_LOCAL=0` — migração sem janela.
 *
 * O job é o MESMO handler do cron (`dataRefreshJobHandler`), então não há caminho de
 * escrita paralelo: mesma idempotência (cursor de tentativa), mesma proveniência.
 *
 *   node dist/scripts/media-worker.js            # fica vivo consumindo a fila
 *   MEDIA_WORKER_ONCE=1 node dist/scripts/media-worker.js   # processa o que há e sai
 */
import { createWorker, queues } from '../services/queue.js';
import { dataRefreshJobHandler } from '../jobs/data-refresh.scheduler.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/prisma.js';

const JOB_NAME = 'enrich-all-media';

async function main(): Promise<void> {
  logger.info({ queue: queues.mediaEnrich.name }, 'media-worker: consumindo a fila de mídia');
  const worker = createWorker('mediaEnrich', (job) => dataRefreshJobHandler(job));

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'media-worker: encerrando (aguarda o job atual)');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Keepalive: o processo precisa continuar vivo mesmo ocioso (senão o serviço
  // reinicia e o BullMQ devolve o job à fila — funciona, mas gera churn).
  setInterval(() => {
    void queues.mediaEnrich
      .getJobCounts('waiting', 'active')
      .then((c) => logger.debug({ ...c, job: JOB_NAME }, 'media-worker: heartbeat'))
      .catch(() => undefined);
  }, 60_000);

  if (process.env.MEDIA_WORKER_ONCE === '1') {
    const counts = await queues.mediaEnrich.getJobCounts('waiting', 'active');
    logger.info({ ...counts }, 'media-worker: modo --once, saindo após drenar');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

if (process.argv[1]?.includes('media-worker')) {
  main().catch((err) => {
    logger.error({ err: String(err).slice(0, 300) }, 'media-worker: falha fatal');
    process.exit(1);
  });
}
