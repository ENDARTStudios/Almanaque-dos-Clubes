import { Queue, Worker, type Job } from 'bullmq';

// T388: BullMQ usava apenas REDIS_HOST/REDIS_PORT (fallback localhost:6379),
// ignorando REDIS_URL — em produção a fila caía em 127.0.0.1:6379 (ECONNREFUSED).
// Agora usa REDIS_URL/REDIS_PRIVATE_URL quando presentes (produção aponta para
// redis.railway.internal). Fail-fast em produção: sem Redis configurado a fila
// não deve tentar localhost silenciosamente.
const redisUrl = (process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || '').trim();
if (process.env.NODE_ENV === 'production' && !redisUrl && !process.env.REDIS_HOST) {
  throw new Error(
    'Redis não configurado em produção (REDIS_URL ausente). Configure REDIS_URL para habilitar as filas (BullMQ).',
  );
}
function redisConnectionFromUrl(url: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} {
  const u = new URL(url);
  const username = u.username ? decodeURIComponent(u.username) : undefined;
  const password = u.password ? decodeURIComponent(u.password) : undefined;
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
  };
}
const connection = {
  ...(redisUrl
    ? redisConnectionFromUrl(redisUrl)
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      }),
  // BullMQ EXIGE maxRetriesPerRequest: null na conexão compartilhada — sem isto,
  // o Worker não consome (blocking commands falham silenciosamente; T451: job
  // ficou 'waiting' em produção com worker "registrado").
  maxRetriesPerRequest: null,
} as const;

export const queues = {
  etl: new Queue('etl', { connection }),
  // T342: jobs de email carregam tokens (verificação/reset) em texto plano
  // apenas enquanto o worker monta o link. Jobs concluídos são removidos do
  // Redis imediatamente para não persistir tokens (revisão T342).
  email: new Queue('email', {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 0 },
      removeOnFail: { count: 100 },
    },
  }),
  export: new Queue('export', { connection }),
  // T425 — fila do Ranking 0-100 (job diário 03:00 UTC, idempotente por ano+escopo).
  ranking: new Queue('ranking', { connection }),
  // T451 — ingestão Wikidata incremental + verificação de integridade.
  // Scheduler opt-in (ETL_SCHEDULER_ENABLED=1); o job incremental só ESCREVE
  // com WIKIDATA_DRY_RUN=false (default 'true' = dry-run).
  dataRefresh: new Queue('data-refresh', {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  }),
} as const;

export type QueueName = keyof typeof queues;

export async function addJob(
  queue: QueueName,
  name: string,
  data: Record<string, unknown>,
  opts?: { attempts?: number; backoff?: { type: 'exponential'; delay: number } },
) {
  return queues[queue].add(name, data, opts);
}

export function createWorker(queue: QueueName, handler: (job: Job) => Promise<void>) {
  // Worker usa o NOME REAL da fila no Redis (`queues[queue].name`), não a chave do
  // registry — para 'dataRefresh' a chave é camelCase mas a fila é 'data-refresh'
  // (T451: worker na fila errada = jobs 'waiting' para sempre; no ranking a
  // coincidência chave==nome escondeu o bug desde o T388).
  const worker = new Worker(
    queues[queue].name,
    async (job) => {
      await handler(job);
    },
    { connection },
  );
  // Fail-loud: erro de conexão do worker NÃO pode ficar silencioso (T451 —
  // worker sem consumir só foi percebido porque o job não saía de 'waiting').
  worker.on('error', (err) => {
    console.error(`[Worker/${queue}] erro de conexão/execução:`, err);
  });
  worker.on('failed', (job, err) => {
    console.error(`[Worker/${queue}] Job ${job?.id} failed:`, err);
  });
  return worker;
}
