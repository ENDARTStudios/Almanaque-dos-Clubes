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
const connection = redisUrl
  ? redisConnectionFromUrl(redisUrl)
  : { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379 };

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
} as const;

export type QueueName = keyof typeof queues;

export async function addJob(queue: QueueName, name: string, data: Record<string, unknown>) {
  return queues[queue].add(name, data);
}

export function createWorker(queue: QueueName, handler: (job: Job) => Promise<void>) {
  const worker = new Worker(
    queue,
    async (job) => {
      await handler(job);
    },
    { connection },
  );
  worker.on('failed', (job, err) => {
    console.error(`[Worker/${queue}] Job ${job?.id} failed:`, err);
  });
  return worker;
}
