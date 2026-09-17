/**
 * T446 — Backup primário: pg_dump → R2 (formato custom, completo, imune a
 * tipos Prisma não-suportados como tsvector/PostGIS).
 *
 * Executa pg_dump in-container no serviço API (que tem DATABASE_URL para o
 * Postgres owner) e faz upload do dump para R2 via AWS SDK S3-compatível.
 * Fail-loud: qualquer erro → exit 1, NENHUM upload, gauge backup_last_success
 * NÃO atualiza (alerta >26h do T443 cobre).
 *
 * Uso in-container:
 *   node dist/scripts/backup-to-r2.js
 *
 * Pós-upload: HEAD check (tamanho R2 == local) + gauge backup_last_size_bytes.
 * Importante: pg_dump usa DATABASE_URL (superuser — FORCE RLS não se aplica).
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { metrics } from '../modules/observability/metrics.js';

const prisma = new PrismaClient();

const BUCKET = process.env.R2_BUCKET ?? '';
const ENDPOINT = process.env.R2_ENDPOINT ?? '';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';

if (!BUCKET || !ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
  console.error(JSON.stringify({ ok: false, error: 'vars R2_* ausentes' }));
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: 'auto',
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

function pgDump(): Buffer {
  return execSync(
    `pg_dump --format=custom --no-owner --no-privileges --dbname="${process.env.DATABASE_URL}"`,
    { maxBuffer: 512 * 1024 * 1024, timeout: 300_000 },
  );
}

async function manifestCounts(): Promise<Record<string, number>> {
  const tables = ['clubs', 'players', 'competitions', 'users', 'rankings'];
  const out: Record<string, number> = {};
  for (const t of tables) {
    const r = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT count(*) as c FROM "${t}"`,
    );
    out[t] = Number(r[0]?.c ?? 0);
  }
  return out;
}

async function r2Head(key: string): Promise<number | null> {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const counts = await manifestCounts();
  if (counts.clubs === 0) {
    console.error(JSON.stringify({ ok: false, error: 'clubs=0 — abortando (auto-validação)' }));
    process.exit(1);
  }
  console.log(JSON.stringify({ step: 'manifest', counts }));

  const dump = await pgDump();
  if (dump.length < 1_000_000) {
    console.error(JSON.stringify({ ok: false, error: `dump suspeito: ${dump.length} bytes < 1MB` }));
    process.exit(1);
  }
  console.log(JSON.stringify({ step: 'pg_dump', bytes: dump.length }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `backups/almanaque-${ts}.dump`;
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: dump, ContentType: 'application/octet-stream' }),
  );

  const remoteSize = await r2Head(key);
  if (remoteSize === null || remoteSize !== dump.length) {
    console.error(JSON.stringify({ ok: false, error: `pós-upload HEAD: R2=${remoteSize} local=${dump.length}` }));
    process.exit(1);
  }

  metrics.set('backup_last_success_timestamp', undefined, Math.floor(Date.now() / 1000));
  metrics.set('backup_last_size_bytes', undefined, dump.length);

  console.log(JSON.stringify({ ok: true, key, bytes: dump.length, counts, remoteSize }));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(JSON.stringify({ ok: false, error: (err as Error).message }));
    await prisma.$disconnect();
    process.exit(1);
  });
