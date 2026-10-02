/**
 * T448b-2d PR 2025 (Operário Ferroviário / Q2580083) — DRY offline, SEM rede no CI.
 * Resolve o clube por QID contra índice MOCK. Apply real só após micro-seed de Q2580083.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodePrTable,
  prFixtureToText,
  buildPrWonCandidate,
  PR_PARSER_VERSION,
} from '../lib/rsssf/pr/index.js';
import { goCountsByReason } from '../lib/rsssf/go/pending-review.js';
import type { ClubIndexEntry, CompetitionIndexEntry, FixtureFile } from '../lib/rsssf/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(here, '../../tests/fixtures/rsssf/pr/2025');

const readJson = <T>(p: string): T =>
  JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')) as T;

function main(): void {
  const fx = readJson<FixtureFile>(join(FIX, 'pr-2025.fixture.json'));
  const clubs = readJson<ClubIndexEntry[]>(join(FIX, 'clubs-index.sample.json'));
  const comps = readJson<CompetitionIndexEntry[]>(join(FIX, 'competitions-index.sample.json'));

  const { candidate, pending } = buildPrWonCandidate({
    season: fx.season,
    competitionName: 'Campeonato Paranaense de Futebol',
    text: prFixtureToText(fx),
    table: decodePrTable(fx),
    meta: {
      sourceUrl: fx.meta.sourceUrl,
      retrievedAt: fx.meta.retrievedAt,
      authorCredit: fx.meta.authorCredit,
      licenseText: fx.meta.licenseText,
    },
    clubIndex: clubs,
    competitionIndex: comps,
  });

  console.log(
    JSON.stringify(
      {
        parserVersion: PR_PARSER_VERSION,
        pilotScope: 'pr-2025',
        parsedSeasons: [2025],
        candidatesValid: candidate ? 1 : 0,
        pendingReview: pending.length,
        countsByReason: goCountsByReason(pending),
        candidate: candidate
          ? {
              dedupKey: candidate.dedupKey,
              clubQid: candidate.clubQid,
              sourceUrl: candidate.sourceUrl,
            }
          : null,
        seedRequirement: candidate ? 'apply_blocked_until_seed_Q2580083' : 'missing_club',
        pendingReviewItems: pending,
      },
      null,
      2,
    ),
  );
}

main();
