import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeGoTable, goFixtureToText } from '../../../../src/lib/rsssf/go/decode-go-table.js';
import { buildGoWonCandidate } from '../../../../src/lib/rsssf/go/build-go-won-candidate.js';
import { loadGoSeedPack } from '../../../../src/lib/rsssf/go/seed-plan.js';
import type {
  ClubIndexEntry,
  CompetitionIndexEntry,
  FixtureFile,
} from '../../../../src/lib/rsssf/types.js';

// T448b-2d GO 2025 (Vila Nova / Q1513287). Puro; mock index. Sem rede/DB.

const here = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(here, '../../../fixtures/rsssf/go/2025');
const readJson = <T>(p: string): T =>
  JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')) as T;

const fx = readJson<FixtureFile>(join(FIX, 'go-2025.fixture.json'));
const comps = readJson<CompetitionIndexEntry[]>(join(FIX, 'competitions-index.sample.json'));
const clubsWith = readJson<ClubIndexEntry[]>(join(FIX, 'clubs-index.sample.json'));
const clubsWithout: ClubIndexEntry[] = [
  {
    id: null,
    qid: 'Q198034',
    name: 'Atlético Clube Goianiense',
    popularName: 'Atlético',
    aliases: ['ATLÉTICO'],
    active: true,
  },
];

const OPTS = {
  expectedCompetitionQid: 'Q931386',
  expectedChampionQid: 'Q1513287',
  pilotScope: 'go-2025',
  uf: 'GO',
};

function build(clubIndex: ClubIndexEntry[]) {
  return buildGoWonCandidate({
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
    clubIndex,
    competitionIndex: comps,
    options: OPTS,
  });
}

describe('T448b-2d GO 2025 — parser (mock)', () => {
  it('T1 campeão VILA NOVA 2025 com clube no mock ⇒ candidate válido Q1513287', () => {
    const { candidate, pending } = build(clubsWith);
    expect(pending).toEqual([]);
    expect(candidate).toMatchObject({
      competitionQid: 'Q931386',
      clubQid: 'Q1513287',
      seasonYear: 2025,
      hierarchy: 'estadual',
      gender: 'men',
    });
    expect(candidate!.dedupKey).toBe('Q931386|2025|Q1513287|WON');
    expect(candidate!.metadataExtras.uf).toBe('GO');
    expect(candidate!.metadataExtras.pilotScope).toBe('go-2025');
    expect(candidate!.authorCredit).toContain('Rivera');
  });

  it('T2 clube ausente no índice ⇒ missing_club (apply bloqueado até seed)', () => {
    const { candidate, pending } = build(clubsWithout);
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_club')).toBe(true);
  });

  it('T3 gender unknown ⇒ gender_unknown', () => {
    const c = [{ ...comps[0], gender: 'unknown' as const }];
    const r = buildGoWonCandidate({
      season: 2025,
      competitionName: 'Campeonato Goiano de Futebol',
      text: goFixtureToText(fx),
      table: decodeGoTable(fx),
      meta: {
        sourceUrl: fx.meta.sourceUrl,
        retrievedAt: fx.meta.retrievedAt,
        authorCredit: fx.meta.authorCredit,
        licenseText: fx.meta.licenseText,
      },
      clubIndex: clubsWith,
      competitionIndex: c,
      options: OPTS,
    });
    expect(r.candidate).toBeNull();
    expect(r.pending.some((p) => p.reasonCode === 'gender_unknown')).toBe(true);
  });

  it('T4 determinismo', () => {
    expect(build(clubsWith).candidate).toEqual(build(clubsWith).candidate);
  });

  it('seed pack (2023–2024) não interfere (piloto separado)', () => {
    expect(loadGoSeedPack().pilotScope).toBe('go-2023-2024');
  });
});
