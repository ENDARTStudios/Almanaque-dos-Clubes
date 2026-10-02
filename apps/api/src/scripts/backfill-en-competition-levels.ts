/**
 * T449c-v1 — Backfill de `Competition.level` para o piloto EN (Grã-Bretanha).
 *
 * Default = DRY-RUN. `--apply` grava (produção exige `--allow-production`).
 * `--validate-only` só confere o mapeamento/DB sem escrever.
 *
 * Fonte do mapeamento = módulo TS versionado (`lib/rankings/tiers/en-pyramid.ts`) — sem asset
 * JSON (lição de container: `tsc` não copia JSON). Não cria/renomeia competições; não usa now();
 * não altera sourceUrl/importedFrom/name/type/country/qid. Reversível por `level = NULL`.
 *
 * Uso:
 *   tsx src/scripts/backfill-en-competition-levels.ts --dry-run
 *   tsx src/scripts/backfill-en-competition-levels.ts --apply --allow-production
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { EN_PYRAMID_TIERS, EN_PYRAMID_TIER_VERSION } from '../lib/rankings/tiers/en-pyramid.js';
import {
  planEnLevelBackfill,
  type ExistingCompetition,
} from '../lib/rankings/tiers/plan-backfill.js';
import { applyEnLevelBackfill } from '../lib/rankings/tiers/apply-backfill.js';

async function main(): Promise<void> {
  const validateOnly = process.argv.includes('--validate-only');
  const apply =
    process.argv.includes('--apply') && !process.argv.includes('--dry-run') && !validateOnly;
  const allowProduction = process.argv.includes('--allow-production');

  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: este backfill exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const qids = EN_PYRAMID_TIERS.map((t) => t.competitionQid);
    const rows = (await prisma.competition.findMany({
      where: { qid: { in: qids } },
      select: { id: true, qid: true, level: true },
    })) as ExistingCompetition[];
    const plan = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);

    if (plan.errors.length > 0) {
      console.log(
        JSON.stringify(
          {
            mode: validateOnly ? 'VALIDATE' : apply ? 'APPLY' : 'DRY',
            tierVersion: EN_PYRAMID_TIER_VERSION,
            totalMapped: plan.totalMapped,
            wouldUpdate: plan.wouldUpdate,
            noop: plan.noop,
            missingCompetitions: plan.missingCompetitions,
            ambiguousCompetitions: plan.ambiguousCompetitions,
            errors: plan.errors,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }

    if (!apply) {
      console.log(
        JSON.stringify(
          {
            mode: validateOnly ? 'VALIDATE' : 'DRY',
            tierVersion: EN_PYRAMID_TIER_VERSION,
            totalMapped: plan.totalMapped,
            wouldUpdate: plan.wouldUpdate,
            noop: plan.noop,
            missingCompetitions: 0,
            ambiguousCompetitions: 0,
            errors: [],
          },
          null,
          2,
        ),
      );
      return;
    }

    let updated = 0;
    let noop = 0;
    await prisma.$transaction(
      async (tx) => {
        const res = await applyEnLevelBackfill(tx, plan);
        updated = res.updated;
        noop = res.noop;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    console.log(
      JSON.stringify(
        {
          mode: 'APPLY',
          tierVersion: EN_PYRAMID_TIER_VERSION,
          totalMapped: plan.totalMapped,
          updated,
          noop,
          errors: 0,
          hardDeletes: 0,
          migrations: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

const invokedAsScript = /scripts\/backfill-en-competition-levels\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invokedAsScript) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
