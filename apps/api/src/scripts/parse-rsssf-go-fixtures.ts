/**
 * T448b-2d GO — DRY-RUN do parser (fixtures locais). NÃO escreve, SEM rede em CI.
 * Uso: tsx src/scripts/parse-rsssf-go-fixtures.ts [--validate-live-urls]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeGoTable, goFixtureToText } from '../lib/rsssf/go/decode-go-table.js';
import { buildGoWonCandidate } from '../lib/rsssf/go/build-go-won-candidate.js';
import { goCountsByReason } from '../lib/rsssf/go/pending-review.js';
import {
  GO_EXCLUDED_SEASONS,
  GO_PARSER_VERSION,
  GO_PILOT_SCOPE,
  type GoPendingReview,
} from '../lib/rsssf/go/types.js';
import type { ClubIndexEntry, CompetitionIndexEntry, FixtureFile } from '../lib/rsssf/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(here, '../../tests/fixtures/rsssf/go');
const COMP_NAME = 'Campeonato Goiano de Futebol';

const readJson = <T>(p: string): T =>
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- caminho de fixtures parametrizado (dev)
  JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')) as T;

function main(): void {
  const clubs = readJson<ClubIndexEntry[]>(join(FIX, 'clubs-index.sample.json'));
  const comps = readJson<CompetitionIndexEntry[]>(join(FIX, 'competitions-index.sample.json'));
  const files = readdirSync(FIX)
    .filter((f) => f.endsWith('.fixture.json'))
    .sort();

  const candidates = [];
  const pendingReview: GoPendingReview[] = [];
  const fixturesMeta: unknown[] = [];
  const parsedSeasons: number[] = [];

  for (const f of files) {
    const fx = readJson<FixtureFile>(join(FIX, f));
    parsedSeasons.push(fx.season);
    fixturesMeta.push(fx.meta);
    const { candidate, pending } = buildGoWonCandidate({
      season: fx.season,
      competitionName: COMP_NAME,
      text: goFixtureToText(fx),
      table: decodeGoTable(fx),
      meta: {
        sourceUrl: fx.meta.sourceUrl,
        retrievedAt: fx.meta.retrievedAt,
        authorCredit: fx.meta.authorCredit,
        licenseText: fx.meta.licenseText,
      },
      clubIndex: clubs,
      competitionIndex: comps,
    });
    if (candidate) candidates.push(candidate);
    pendingReview.push(...pending);
  }

  // Guardas: nunca 2025; nunca Q1513287.
  for (const c of candidates) {
    if (GO_EXCLUDED_SEASONS.includes(c.seasonYear))
      throw new Error(`candidate 2025 proibido: ${c.dedupKey}`);
    if (c.clubQid === 'Q1513287') throw new Error(`candidate Q1513287 proibido: ${c.dedupKey}`);
  }

  console.log(
    JSON.stringify(
      {
        parserVersion: GO_PARSER_VERSION,
        pilotScope: GO_PILOT_SCOPE,
        parsedSeasons,
        candidatesValid: candidates.length,
        pendingReview: pendingReview.length,
        excludedSeasons: [{ seasonYear: 2025, reason: 'club_name_unique_conflict' }],
        countsByReason: goCountsByReason(pendingReview),
        candidates: candidates.map((c) => ({
          dedupKey: c.dedupKey,
          clubQid: c.clubQid,
          sourceUrl: c.sourceUrl,
        })),
        pendingReviewItems: pendingReview,
        fixturesMeta,
      },
      null,
      2,
    ),
  );
  if (candidates.length < 2) console.error('AVISO: candidatesValid < 2 — parser NÃO pronto.');
}

main();
