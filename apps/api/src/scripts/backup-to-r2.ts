/**
 * T446 — Backup primário: pg_dump → R2 (formato custom, completo, imune a
 * tipos Prisma não-suportados como tsvector/PostGIS).
 *
 * Segurança (D-2026-09-16-eco-4): a connection string NUNCA entra em argv.
 * spawn decompõe DATABASE_URL em PG* env vars herdadas pelo processo filho
 * — o segredo vive apenas no env, invisível em `ps`, logs e error messages.
 *
 * Fail-loud: qualquer erro → exit 1, NENHUM upload, gauge backup_last_success
 * NÃO atualiza (alerta >26h do T443 cobre). Dump < 1MB → aborta (baseline
 * ~1.8-3.2MB; 21KB = backup vazio, lição do incidente T446).
 *
 * Uso in-container:
 *   node dist/scripts/backup-to-r2.js
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, unlinkSync } from 'node:fs';
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

/** Decompõe DATABASE_URL em PG* env vars — pg_dump lê do env, nunca de argv. */
function pgDumpEnv(): NodeJS.ProcessEnv {
  const url = new URL(process.env.DATABASE_URL ?? '');
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
  };
}

function pgDump(dumpPath: string): void {
  const result = spawnSync(
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-privileges', '--file', dumpPath],
    { env: pgDumpEnv(), stdio: ['ignore', 'ignore', 'pipe'], timeout: 300_000 },
  );
  if (result.status !== 0 || result.error) {
    console.error(
      JSON.stringify({
        step: 'pg_dump',
        ok: false,
        exitCode: result.status,
        stderr: result.stderr?.toString().slice(0, 300),
      }),
    );
    process.exit(1);
  }
  // Validar dump: < 1MB é anomalia (baseline 1.8-3.2MB; 21KB = backup vazio)
  const size = statSync(dumpPath).size;
  if (size < 1_000_000) {
    console.error(JSON.stringify({ step: 'pg_dump_size', ok: false, bytes: size }));
    unlinkSync(dumpPath);
    process.exit(1);
  }
  console.log(JSON.stringify({ step: 'pg_dump', ok: true, bytes: size }));
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
  const dumpPath = `/tmp/almanaque-backup-${Date.now()}.dump`;

  // 1. Manifest de counts (query direta — para auto-validação)
  const counts = await manifestCounts();
  if (counts.clubs === 0) {
    console.error(JSON.stringify({ ok: false, error: 'clubs=0 — abortando (auto-validação)' }));
    process.exit(1);
  }
  console.log(JSON.stringify({ step: 'manifest', counts }));

  // 2. pg_dump (spawnSync com env herdado — credencial nunca em argv)
  pgDump(dumpPath);

  // 3. Upload para R2
  const dump = readFileSync(dumpPath);
  const fileSize = dump.length;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `backups/almanaque-${ts}.dump`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: dump,
      ContentType: 'application/octet-stream',
    }),
  );

  // 4. Verificação pós-upload (HEAD: tamanho R2 == local)
  const remoteSize = await r2Head(key);
  if (remoteSize === null || remoteSize !== fileSize) {
    console.error(
      JSON.stringify({ ok: false, error: `pós-upload HEAD: R2=${remoteSize} local=${fileSize}` }),
    );
    process.exit(1);
  }

  // 5. Limpar dump temporário
  unlinkSync(dumpPath);

  // 6. Métricas
  metrics.set('backup_last_success_timestamp', undefined, Math.floor(Date.now() / 1000));
  metrics.set('backup_last_size_bytes', undefined, fileSize);

  console.log(JSON.stringify({ ok: true, key, bytes: fileSize, counts, remoteSize }));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(JSON.stringify({ ok: false, error: (err as Error).message }));
    await prisma.$disconnect();
    process.exit(1);
  });
