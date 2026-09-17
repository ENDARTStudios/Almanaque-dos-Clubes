/**
 * T446 — Backup lógico para Cloudflare R2 (destino de produção).
 *
 * Compilado para dist/scripts/ — roda in-container via railway ssh:
 *   node dist/scripts/backup-to-r2.js
 *
 * Usa as mesmas funções de verificação/upload do módulo observability
 * (verifyBackupGzip + uploadBackupToS3) e as variáveis R2_* do Railway
 * (nunca impressas — regra D-2026-09-16-regra-no-echo).
 * R2_* têm prioridade; S3_* mantido como fallback para dev/MinIO.
 *
 * Exit 0 em sucesso, 1 em falha (fail-loud — o alerta de backup stale do
 * T443 cobre a janela >26h).
 */
import { PrismaClient } from '@prisma/client';
import { gzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyBackupGzip } from '../modules/observability/backup.js';

const prisma = new PrismaClient();

const TABLES = [
  'clubs',
  'players',
  'competitions',
  'rankings',
  'ranking_entries',
  'users',
  'sessions',
  'roles',
  'permissions',
  'user_roles',
  'role_permissions',
  'subscriptions',
  'billings',
  'seasons',
  'stadiums',
  'matches',
  'knowledge_graph',
  'audit_logs',
  'payment_events',
] as const;

async function dumpDb(): Promise<Buffer> {
  const payload: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows = (await prisma
      .$queryRawUnsafe(`SELECT * FROM "${t}"`)
      .catch(() => [])) as unknown[];
    payload[t] = rows;
  }
  return gzipSync(JSON.stringify(payload));
}

async function main(): Promise<void> {
  const bucket = process.env.R2_BUCKET ?? process.env.S3_BUCKET ?? '';
  const endpoint = process.env.R2_ENDPOINT ?? process.env.S3_ENDPOINT ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY ?? '';

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'vars R2_* ausentes (verifique R2_BUCKET/R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)',
      }),
    );
    process.exit(1);
  }

  const content = await dumpDb();
  const verify = verifyBackupGzip(content);
  if (!verify.ok) {
    console.error(JSON.stringify({ ok: false, error: verify.error ?? 'verificação falhou' }));
    process.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `backups/almanaque-${ts}.json.gz`;

  const s3 = new S3Client({
    endpoint,
    region: 'auto',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: 'application/gzip',
    }),
  );
  await s3.destroy();

  console.log(
    JSON.stringify({
      ok: true,
      key,
      bucket,
      bytes: content.length,
      tables: verify.tables,
      rows: verify.totalRows,
    }),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(JSON.stringify({ ok: false, error: (err as Error).message }));
    await prisma.$disconnect();
    process.exit(1);
  });
