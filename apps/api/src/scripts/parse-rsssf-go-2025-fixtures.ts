/**
 * T448b-2d GO 2025 (Vila Nova / Q1513287) — DRY offline, SEM rede no CI.
 * Resolve o clube por QID contra o índice MOCK (prova que o parser funciona
 * quando o clube existe). Apply real só após micro-seed de Q1513287.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeGoTable, goFixtureToText } from '../lib/rsssf/go/decode-go-table.js';
import { buildGoWonCandidate } from '../lib/rsssf/go/build-go-won-candidate.js';
import { goCountsByReason } from '../lib/rsssf/go/pending-review.js';
import { GO_PARSER_VERSION, type GoPendingReview } from '../lib/rsssf/go/types.js';
import type { ClubIndexEntry, CompetitionIndexEntry, FixtureFile } from '../lib/rsssf/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(here, '../../tests/fixtures/rsssf/go/2025');
const readJson = <T>(p: string): T =>
  JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')) as T;

function main(): void {
  const fx = readJson<FixtureFile>(join(FIX, 'go-2025.fixture.json'));
  const clubs = readJson<ClubIndexEntry[]>(join(FIX, 'clubs-index.sample.json'));
  const comps = readJson<CompetitionIndexEntry[]>(join(FIX, 'competitions-index.sample.json'));

  const { candidate, pending } = buildGoWonCandidate({
    season: fx.season,
    competitionName: 'Campeonato Goiano de Futebol',
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
    options: {
      expectedCompetitionQid: 'Q931386',
      expectedChampionQid: 'Q1513287',
      pilotScope: 'go-2025',
      uf: 'GO',
    },
  });

  const pendingReview: GoPendingReview[] = pending;
  console.log(
    JSON.stringify(
      {
        parserVersion: GO_PARSER_VERSION,
        pilotScope: 'go-2025',
        parsedSeasons: [2025],
        candidatesValid: candidate ? 1 : 0,
        pendingReview: pendingReview.length,
        countsByReason: goCountsByReason(pendingReview),
        candidate: candidate
          ? {
              dedupKey: candidate.dedupKey,
              clubQid: candidate.clubQid,
              sourceUrl: candidate.sourceUrl,
            }
          : null,
        seedRequirement: candidate ? 'apply_blocked_until_seed_Q1513287' : 'missing_club',
        pendingReviewItems: pendingReview,
      },
      null,
      2,
    ),
  );
}

main();
