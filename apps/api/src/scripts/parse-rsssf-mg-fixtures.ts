/**
 * T448b-2b FASE 1 — DRY-RUN do parser MG (fixtures locais). NÃO escreve.
 * Não importa Prisma. Sem rede. Emite JSON de resumo (stdout / arquivo).
 *
 * Uso: pnpm --filter @almanaque/api exec tsx src/scripts/parse-rsssf-mg-fixtures.ts [out.json]
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARSER_VERSION } from '../lib/rsssf/types.js';
import { decodeLegacyTable, fixtureToText } from '../lib/rsssf/decode-legacy-table.js';
import { buildWonCandidate } from '../lib/rsssf/build-won-candidate.js';
import { countsByReason } from '../lib/rsssf/pending-review.js';
import { loadClubIndex, loadCompetitionIndex, loadFixtures } from '../lib/rsssf/fixtures-loader.js';
import type { PendingReviewItem, WonCandidate } from '../lib/rsssf/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(here, '../../tests/fixtures/rsssf/mg');

function main(): void {
  const fixtures = loadFixtures(FIX_DIR);
  const clubIndex = loadClubIndex(resolve(FIX_DIR, 'clubs-index.sample.json'));
  const competitionIndex = loadCompetitionIndex(resolve(FIX_DIR, 'competitions-index.sample.json'));

  const candidatesValid: WonCandidate[] = [];
  const pendingReview: PendingReviewItem[] = [];

  for (const fx of fixtures) {
    const table = decodeLegacyTable(fx);
    const { candidate, pending } = buildWonCandidate({
      season: fx.season,
      competitionName: fx.meta.expectedCompetitionName,
      text: fixtureToText(fx),
      table,
      meta: fx.meta,
      clubIndex,
      competitionIndex,
    });
    if (candidate) candidatesValid.push(candidate);
    pendingReview.push(...pending);
  }

  const summary = {
    parserVersion: PARSER_VERSION,
    parsedSeasons: fixtures.map((f) => f.season),
    candidatesValid: candidatesValid.length,
    pendingReview: pendingReview.length,
    countsByReason: countsByReason(pendingReview),
    candidates: candidatesValid.map((c) => ({
      dedupKey: c.dedupKey,
      externalId: c.externalId,
      competitionQid: c.competitionQid,
      seasonYear: c.seasonYear,
      clubQid: c.clubQid,
      gender: c.gender,
      sourceUrl: c.sourceUrl,
      authorCredit: c.authorCredit,
      tablePosition: c.metadataExtras.tablePosition,
      pageChampionPhrase: c.metadataExtras.pageChampionPhrase,
    })),
    pendingReviewItems: pendingReview,
    fixturesMeta: fixtures.map((f) => f.meta),
  };

  const out = process.argv[2];
  if (out) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- destino parametrizado por design
    writeFileSync(out, JSON.stringify(summary, null, 2));
  }
  console.log(JSON.stringify(summary, null, 2));
}

main();
