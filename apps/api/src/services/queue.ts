import { Queue, Worker, type Job } from 'bullmq';

const connection = { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379 };

export const queues = {
  etl: new Queue('etl', { connection }),
  email: new Queue('email', { connection }),
  export: new Queue('export', { connection }),
} as const;

export type QueueName = keyof typeof queues;

export async function addJob(queue: QueueName, name: string, data: Record<string, unknown>) {
  return queues[queue].add(name, data);
}

export function createWorker(queue: QueueName, handler: (job: Job) => Promise<void>) {
  const worker = new Worker(queue, async (job) => { await handler(job); }, { connection });
  worker.on('failed', (job, err) => { console.error(`[Worker/${queue}] Job ${job?.id} failed:`, err); });
  return worker;
}
