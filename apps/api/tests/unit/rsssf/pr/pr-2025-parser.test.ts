import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodePrTable,
  prFixtureToText,
  buildPrWonCandidate,
} from '../../../../src/lib/rsssf/pr/index.js';
import type {
  ClubIndexEntry,
  CompetitionIndexEntry,
  FixtureFile,
} from '../../../../src/lib/rsssf/types.js';

// T448b-2d PR 2025 (Operário Ferroviário / Q2580083). Puro; mock. Homônimo Q671621 NÃO casa.

const here = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(here, '../../../fixtures/rsssf/pr/2025');

const readJson = <T>(p: string): T =>
  JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')) as T;

const fx = readJson<FixtureFile>(join(FIX, 'pr-2025.fixture.json'));
const comps = readJson<CompetitionIndexEntry[]>(join(FIX, 'competitions-index.sample.json'));
const clubsWith = readJson<ClubIndexEntry[]>(join(FIX, 'clubs-index.sample.json'));
const clubsHomonym: ClubIndexEntry[] = [
  {
    id: null,
    qid: 'Q671621',
    name: 'Operário Futebol Clube',
    popularName: 'Operário',
    aliases: ['Operário'],
    active: true,
  },
];

function build(clubIndex: ClubIndexEntry[]) {
  return buildPrWonCandidate({
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
    clubIndex,
    competitionIndex: comps,
  });
}

describe('T448b-2d PR 2025 — parser (mock)', () => {
  it('T1 campeão Operário 2025 com clube no mock ⇒ candidate Q2580083', () => {
    const { candidate, pending } = build(clubsWith);
    expect(pending).toEqual([]);
    expect(candidate).toMatchObject({
      competitionQid: 'Q920397',
      clubQid: 'Q2580083',
      seasonYear: 2025,
      hierarchy: 'estadual',
      gender: 'men',
    });
    expect(candidate!.dedupKey).toBe('Q920397|2025|Q2580083|WON');
    expect(candidate!.metadataExtras.uf).toBe('PR');
    expect(candidate!.metadataExtras.pilotScope).toBe('pr-2025');
    expect(candidate!.parserVersion).toBe('t448b2d-pr-parser-v1');
    expect(candidate!.authorCredit).toContain('Moacir');
  });

  it('T2 homônimo "Operário" (Q671621) NÃO casa ⇒ missing_club', () => {
    const { candidate, pending } = build(clubsHomonym);
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_club')).toBe(true);
  });

  it('T3 clube ausente no índice ⇒ missing_club (apply bloqueado até seed)', () => {
    const { candidate, pending } = build([]);
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_club')).toBe(true);
  });

  it('T4 determinismo', () => {
    expect(build(clubsWith).candidate).toEqual(build(clubsWith).candidate);
  });
});
