/**
 * T422 — Backup logico (JSON gzip) com verificacao e upload para S3-compativel.
 * Uso direto: tsx scripts/backup-to-s3.ts [bucket]. Exporta runBackup para o cron.
 */
import { PrismaClient } from '@prisma/client';
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  verifyBackupGzip,
  uploadBackupToS3,
  type BucketClient,
} from '../src/modules/observability/backup.js';

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
];

export interface BackupRunResult {
  ok: boolean;
  key: string | null;
  tables: number;
  rows: number;
  error?: string;
}

async function dumpDb(): Promise<Buffer> {
  const payload: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows = (await prisma
      .$queryRawUnsafe('SELECT * FROM "' + t + '"')
      .catch(() => [])) as unknown[];
    payload[t] = rows;
  }
  return gzipSync(JSON.stringify(payload));
}

/** Gera backup, verifica integridade e sobe para S3 (nao fabrica sucesso). */
export async function runBackup(bucket: string, client: BucketClient): Promise<BackupRunResult> {
  const content = await dumpDb();
  const verify = verifyBackupGzip(content);
  if (!verify.ok)
    return {
      ok: false,
      key: null,
      tables: 0,
      rows: 0,
      error: verify.error ?? 'verificacao falhou',
    };
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const key = 'backups/almanaque-' + ts + '.json.gz';
  if (!existsSync('backups')) mkdirSync('backups', { recursive: true });
  const tmp = 'backups/' + ts + '.json.gz';
  writeFileSync(tmp, content);
  await uploadBackupToS3(tmp, key, client, bucket);
  return { ok: true, key, tables: verify.tables, rows: verify.totalRows };
}

if (process.argv[1]?.endsWith('backup-to-s3.ts')) {
  const bucket = process.argv[2] ?? process.env.S3_BUCKET ?? 'almanaque-uploads';
  const client: BucketClient = {
    send: (input) =>
      new S3Client({
        endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
        region: process.env.S3_REGION ?? 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'almanaque',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'almanaque_dev_2025',
        },
        forcePathStyle: true,
      }).send(new PutObjectCommand(input)),
  };
  runBackup(bucket, client)
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.error('backup falhou:', (e as Error).message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
