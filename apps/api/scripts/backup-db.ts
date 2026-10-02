/**
 * WS-O — Backup lógico do PostgreSQL (sem depender de pg_dump).
 * Despeja as tabelas de conteúdo para um arquivo gzip JSON com retenção de 30 dias.
 *
 * Seleciona apenas colunas escalares (exclui tsvector/geometry — derivadas) para o Prisma
 * conseguir desserializar e a restauração via Prisma funcionar.
 *
 * Uso: pnpm --filter @almanaque/api exec tsx scripts/backup-db.ts [output-dir]
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const prisma = new PrismaClient();
const OUT_DIR = process.argv[2] ?? './backups';
const RETENTION_DAYS = 30;

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
] as const;

function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  return value;
}

async function main(): Promise<void> {
  const payload: Record<string, unknown[]> = {};
  for (const name of TABLES) {
    const cols = (await prisma.$queryRawUnsafe(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      'public',
      name,
    )) as Array<{ column_name: string; data_type: string }>;
    const kept = cols
      .filter((c) => !['tsvector', 'geometry'].includes(c.data_type))
      .map((c) => c.column_name);
    if (kept.length === 0) {
      console.log('  ' + name + ': (sem colunas escalares)');
      continue;
    }
    const select = kept.map((k) => '"' + k + '"').join(', ');
    const rows = (await prisma.$queryRawUnsafe(
      'SELECT ' + select + ' FROM "' + name + '"',
    )) as Record<string, unknown>[];
    payload[name] = rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, serialize(v)])),
    );
    console.log('  ' + name + ': ' + rows.length + ' linhas');
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = OUT_DIR + '/almanaque-' + ts + '.json.gz';
  const gz = gzipSync(JSON.stringify(payload));
  writeFileSync(file, gz);
  console.log('Backup: ' + file + ' (' + (gz.length / (1024 * 1024)).toFixed(2) + ' MB)');

  const now = Date.now();
  for (const f of readdirSync(OUT_DIR)) {
    if (f.startsWith('almanaque-') && f.endsWith('.json.gz')) {
      const age = (now - statSync(OUT_DIR + '/' + f).mtimeMs) / 86400000;
      if (age > RETENTION_DAYS) {
        unlinkSync(OUT_DIR + '/' + f);
        console.log('  removed old: ' + f);
      }
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
