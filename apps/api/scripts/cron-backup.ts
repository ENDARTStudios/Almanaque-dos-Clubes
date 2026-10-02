/**
 * T422 — Cron diario de backup: executa 1x agora e reagenda para 03:00 UTC.
 * Em producao, prefira um scheduler externo (cron/k8s); este script e o fallback.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { runBackup } from './backup-to-s3.js';
import type { BucketClient } from '../src/modules/observability/backup.js';

function buildClient(): BucketClient {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'almanaque',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'almanaque_dev_2025',
    },
    forcePathStyle: true,
  });
  return { send: (input) => client.send(new PutObjectCommand(input)) };
}

function msUntilNext0300UTC(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0),
  );
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

async function schedule(): Promise<void> {
  const client = buildClient();
  const bucket = process.env.S3_BUCKET ?? 'almanaque-uploads';
  const delay = msUntilNext0300UTC();
  console.log('proximo backup em ' + Math.round(delay / 3600000) + 'h (03:00 UTC)');
  setTimeout(async () => {
    const r = await runBackup(bucket, client).catch((e) => ({
      ok: false,
      key: null,
      tables: 0,
      rows: 0,
      error: (e as Error).message,
    }));
    console.log('backup:', JSON.stringify(r));
    await schedule();
  }, delay);
}

schedule().catch((e) => console.error('cron backup erro:', (e as Error).message));
