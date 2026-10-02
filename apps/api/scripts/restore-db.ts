/**
 * WS-O — Restaura um backup lógico (.json.gz) gerado por scripts/backup-db.ts.
 * Uso: pnpm --filter @almanaque/api exec tsx scripts/restore-db.ts [file.json.gz]
 * Ordem por dependência; idempotente (skipDuplicates).
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const prisma = new PrismaClient();
const file = process.argv[2];

const TABLE_TO_MODEL: Record<string, string> = {
  clubs: 'club',
  players: 'player',
  competitions: 'competition',
  rankings: 'ranking',
  ranking_entries: 'rankingEntry',
  users: 'user',
  sessions: 'session',
  roles: 'role',
  permissions: 'permission',
  user_roles: 'userRole',
  role_permissions: 'rolePermission',
  subscriptions: 'subscription',
  billings: 'billing',
  seasons: 'season',
  stadiums: 'stadium',
  matches: 'match',
  knowledge_graph: 'knowledgeGraph',
  audit_logs: 'auditLog',
};

const ORDER = [
  'clubs',
  'competitions',
  'seasons',
  'stadiums',
  'roles',
  'permissions',
  'users',
  'sessions',
  'user_roles',
  'role_permissions',
  'subscriptions',
  'billings',
  'players',
  'matches',
  'rankings',
  'ranking_entries',
  'knowledge_graph',
  'audit_logs',
] as const;

async function main(): Promise<void> {
  if (!file) {
    console.error('Informe o arquivo .json.gz');
    process.exit(1);
  }
  const payload = JSON.parse(gunzipSync(readFileSync(file)).toString()) as Record<
    string,
    unknown[]
  >;
  let total = 0;
  for (const table of ORDER) {
    const rows = payload[table] ?? [];
    if (!rows.length) continue;
    const model = TABLE_TO_MODEL[table] as keyof typeof prisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (prisma[model] as any).createMany({ data: rows, skipDuplicates: true });
    total += res.count;
    console.log('  ' + table + ': +' + res.count);
  }
  console.log('Restaurados: ' + total + ' registros.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Erro:', (e as Error).message);
  process.exit(1);
});
