/**
 * T448b-2b FASE 2 — Writer de arestas WON estaduais (RSSSF) → KnowledgeGraph.
 *
 * Default = DRY (roda tudo dentro de uma transação e REVERTE — contagens reais,
 * zero persistência). `--apply` grava. Bloqueado em produção sem `--allow-production`.
 * Requer Postgres. Reusa o parser puro da FASE 1 (fixtures locais).
 *
 * Uso:
 *   DATABASE_URL=... tsx src/scripts/write-rsssf-won-edges.ts            # DRY
 *   DATABASE_URL=... tsx src/scripts/write-rsssf-won-edges.ts --apply    # grava
 */
import { PrismaClient } from '@prisma/client';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeLegacyTable, fixtureToText } from '../lib/rsssf/decode-legacy-table.js';
import { buildWonCandidate } from '../lib/rsssf/build-won-candidate.js';
import { loadClubIndex, loadCompetitionIndex, loadFixtures } from '../lib/rsssf/fixtures-loader.js';
import type { WonCandidate } from '../lib/rsssf/types.js';
import { loadPilotCandidates } from '../lib/rsssf/candidates-pack.js';
import {
  createPrismaRsssfWonRepo,
  syncRsssfWonEdges,
} from '../modules/etl/rsssf-won-edges.service.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(here, '../../tests/fixtures/rsssf/mg');

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

async function main(): Promise<void> {
  // DRY é o default; `--dry-run` apenas torna explícito. `--apply` grava.
  const apply = process.argv.includes('--apply') && !process.argv.includes('--dry-run');
  const allowProduction = process.argv.includes('--allow-production');
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('BLOQUEADO: este writer exige DATABASE_URL postgres (não SQLite).');
    process.exit(1);
  }
  // DRY (rolled-back) é read-only e sempre permitido; só `--apply` em produção exige a trava.
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  // Produção: pack EMBUTIDO em src/ (empacotado no Docker). Dev/teste: `--from-fixtures`.
  const fromFixtures = process.argv.includes('--from-fixtures');
  const candidates = fromFixtures ? buildCandidatesFromFixtures() : loadPilotCandidates();
  const prisma = new PrismaClient();
  const ROLLBACK = Symbol('dry-run-rollback');
  let result: Awaited<ReturnType<typeof syncRsssfWonEdges>> | undefined;

  try {
    if (apply) {
      result = await syncRsssfWonEdges(candidates, createPrismaRsssfWonRepo(prisma), {});
    } else {
      // DRY: transação revertida — contagens reais, nada persiste.
      try {
        await prisma.$transaction(async (tx) => {
          result = await syncRsssfWonEdges(
            candidates,
            createPrismaRsssfWonRepo(tx as unknown as PrismaClient),
            {},
          );
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
