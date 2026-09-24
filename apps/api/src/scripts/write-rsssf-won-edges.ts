/**
 * T448b-2b/2d — Writer de arestas WON estaduais (RSSSF) → KnowledgeGraph.
 *
 * Default = DRY (transação revertida — contagens reais, zero persistência). `--apply` grava
 * (produção exige `--allow-production`). Requer Postgres.
 *
 * Packs: `--pack=mg` (default) | `--pack=go` (Campeonato Goiano 2023–2024).
 * Uso:
 *   DATABASE_URL=... node dist/scripts/write-rsssf-won-edges.js --pack=go --dry-run
 *   DATABASE_URL=... node dist/scripts/write-rsssf-won-edges.js --pack=go --apply --allow-production
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeLegacyTable, fixtureToText } from '../lib/rsssf/decode-legacy-table.js';
import { buildWonCandidate } from '../lib/rsssf/build-won-candidate.js';
import { loadClubIndex, loadCompetitionIndex, loadFixtures } from '../lib/rsssf/fixtures-loader.js';
import type { WonCandidate } from '../lib/rsssf/types.js';
import { loadPilotCandidates } from '../lib/rsssf/candidates-pack.js';
import { loadGoPack } from '../lib/rsssf/go/index.js';
import {
  createPrismaRsssfWonRepo,
  syncRsssfWonEdges,
} from '../modules/etl/rsssf-won-edges.service.js';
import {
  createPrismaGoWonRepo,
  syncGoWonEdges,
} from '../modules/etl/rsssf-won-edges-go.service.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(here, '../../tests/fixtures/rsssf/mg');

/** MG dev: candidatos a partir das fixtures locais. */
export function buildCandidatesFromFixtures(): WonCandidate[] {
  const fixtures = loadFixtures(FIX_DIR);
  const clubIndex = loadClubIndex(resolve(FIX_DIR, 'clubs-index.sample.json'));
  const competitionIndex = loadCompetitionIndex(resolve(FIX_DIR, 'competitions-index.sample.json'));
  const out: WonCandidate[] = [];
  for (const fx of fixtures) {
    const { candidate } = buildWonCandidate({
      season: fx.season,
      competitionName: fx.meta.expectedCompetitionName,
      text: fixtureToText(fx),
      table: decodeLegacyTable(fx),
      meta: fx.meta,
      clubIndex,
      competitionIndex,
    });
    if (candidate) out.push(candidate);
  }
  return out;
}

function argValue(prefix: string): string | null {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: este writer exige DATABASE_URL postgres (não SQLite).');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }
  const pack = (argValue('--pack=') ?? 'mg').toLowerCase();
  const prisma = new PrismaClient();
  const ROLLBACK = Symbol('dry-run-rollback');

  if (pack === 'go') {
    const goPack = loadGoPack();
    let goResult: Awaited<ReturnType<typeof syncGoWonEdges>> | undefined;
    try {
      const run = (client: PrismaClient) =>
        syncGoWonEdges(goPack.candidates, createPrismaGoWonRepo(client), {});
      if (apply) {
        goResult = await prisma.$transaction((tx) => run(tx as unknown as PrismaClient), {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } else {
        try {
          await prisma.$transaction(async (tx) => {
            goResult = await run(tx as unknown as PrismaClient);
            throw ROLLBACK;
          });
        } catch (err) {
          if (err !== ROLLBACK) throw err;
        }
      }
    } finally {
      await prisma.$disconnect();
    }
    console.log(
      JSON.stringify(
        {
          mode: apply ? 'APPLY' : 'DRY(rolled-back)',
          pack: 'go',
          pilotScope: goPack.pilotScope,
          candidates: goPack.candidates.length,
          result: {
            counts: goResult!.counts,
            created: goResult!.created,
            restored: goResult!.restored,
            failures: goResult!.failures,
            competitionsCreated: [],
            clubsCreated: [],
            clubsUpdated: [],
            errors: [],
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  // ---- MG (default) ----
  const fromFixtures = process.argv.includes('--from-fixtures');
  const candidates = fromFixtures ? buildCandidatesFromFixtures() : loadPilotCandidates();
  let result: Awaited<ReturnType<typeof syncRsssfWonEdges>> | undefined;
  try {
    const run = (client: PrismaClient) =>
      syncRsssfWonEdges(candidates, createPrismaRsssfWonRepo(client), {});
    if (apply) {
      result = await prisma.$transaction((tx) => run(tx as unknown as PrismaClient), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } else {
      try {
        await prisma.$transaction(async (tx) => {
          result = await run(tx as unknown as PrismaClient);
          throw ROLLBACK;
        });
      } catch (err) {
        if (err !== ROLLBACK) throw err;
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'APPLY' : 'DRY(rolled-back)',
        pack: 'mg',
        candidatesSource: fromFixtures ? 'fixtures(dev)' : 'pack(prod)',
        candidates: candidates.length,
        result,
      },
      null,
      2,
    ),
  );
}

const invokedAsScript = /scripts\/write-rsssf-won-edges\.(ts|js)$/.test(
  (process.argv[1] ?? '').replace(/\\/g, '/'),
);
if (invokedAsScript) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
