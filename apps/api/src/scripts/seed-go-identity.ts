/**
 * T448b-2d GO — Seed de IDENTIDADE (reduzido 2023–2024).
 * DRY por padrão; `--apply` escreve (só a competição-mãe); produção exige `--allow-production`.
 * NÃO faz parser RSSSF, NÃO cria arestas WON, NÃO cria/altera clubes, NÃO faz migration.
 *
 * Uso:
 *   DATABASE_URL=... node dist/scripts/seed-go-identity.js            # DRY
 *   DATABASE_URL=... node dist/scripts/seed-go-identity.js --apply --allow-production
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
  applyGoSeed,
  createPrismaGoSeedRepo,
  loadGoSeedPack,
  planGoSeed,
} from '../lib/rsssf/go/index.js';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: este seed exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const pack = loadGoSeedPack();
  const prisma = new PrismaClient();
  try {
    if (apply) {
      const result = await prisma.$transaction(
        (tx) => applyGoSeed(pack, createPrismaGoSeedRepo(tx as unknown as PrismaClient)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      console.log(
        JSON.stringify(
          {
            mode: 'APPLY',
            pilotScope: pack.pilotScope,
            competition: {
              qid: pack.competition.qid,
              created: result.created,
              competitionId: result.competitionId,
            },
            clubs: pack.clubs.map((c) => ({ qid: c.qid, action: 'noop' })),
            counts: {
              competitionCreated: result.created,
              clubsCreated: 0,
              clubsUpdated: 0,
              clubsNoop: result.noop,
              errors: 0,
              conflicts: 0,
              hardDeletes: 0,
              migrations: 0,
            },
          },
          null,
          2,
        ),
      );
    } else {
      const plan = await planGoSeed(pack, createPrismaGoSeedRepo(prisma));
      console.log(JSON.stringify(plan, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

const invokedAsScript = /scripts\/seed-go-identity\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invokedAsScript) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
