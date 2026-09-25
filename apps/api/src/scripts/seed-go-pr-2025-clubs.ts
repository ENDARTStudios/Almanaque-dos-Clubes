/**
 * T448b-2d GO/PR 2025 — Micro-seed de IDENTIDADE de clubes (só clubes, por QID).
 * DRY por padrão; `--apply` escreve; produção exige `--allow-production`.
 * NÃO faz parser RSSSF, NÃO cria arestas WON, NÃO toca homônimos, NÃO faz migration.
 *
 * Uso:
 *   DATABASE_URL=... node dist/scripts/seed-go-pr-2025-clubs.js
 *   DATABASE_URL=... node dist/scripts/seed-go-pr-2025-clubs.js --apply --allow-production
 */
import { Prisma, PrismaClient } from '@prisma/client';
// Import ESTÁTICO do JSON: o tsc emite o pack no `dist` (empacotado na imagem Docker).
import goSeedPackRaw from '../lib/rsssf/data/go-2025-seed-pack.json' with { type: 'json' };
import prSeedPackRaw from '../lib/rsssf/data/pr-2025-seed-pack.json' with { type: 'json' };
import {
  applyClubSeed,
  createPrismaClubSeedRepo,
  planClubSeed,
  validateClubSeedPack,
} from '../lib/rsssf/seeds/club-seed.js';

const readPack = (raw: unknown) => validateClubSeedPack(raw);

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

  const packs = [readPack(goSeedPackRaw), readPack(prSeedPackRaw)];
  const prisma = new PrismaClient();
  try {
    const repo = createPrismaClubSeedRepo(prisma);
    const results: unknown[] = [];
    let totalCreated = 0;
    for (const pack of packs) {
      if (apply) {
        const r = await prisma.$transaction(() => applyClubSeed(pack, repo), {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        totalCreated += r.created;
        results.push({ scope: pack.pilotScope, created: r.created, noop: r.noop, conflicts: [] });
      } else {
        const plan = await planClubSeed(pack, repo);
        results.push({
          scope: plan.scope,
          entries: plan.entries.map((e) => ({
            qid: e.qid,
            action: e.action,
            conflicts: e.conflicts,
          })),
        });
      }
    }
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'APPLY' : 'DRY',
          scopes: packs.map((p) => p.pilotScope),
          results,
          counts: { created: totalCreated, hardDeletes: 0, migrations: 0 },
          errors: [],
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invoked = /scripts\/seed-go-pr-2025-clubs\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invoked) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
