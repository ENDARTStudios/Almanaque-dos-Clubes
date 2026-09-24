import { describe, it, expect } from 'vitest';
import { decodeGoTable } from '../../../../src/lib/rsssf/go/decode-go-table.js';
import { buildGoWonCandidate } from '../../../../src/lib/rsssf/go/build-go-won-candidate.js';
import { loadGoPack, validateGoPack } from '../../../../src/lib/rsssf/go/pack.js';
import type { ClubIndexEntry, CompetitionIndexEntry } from '../../../../src/lib/rsssf/types.js';

// T448b-2d GO — parser puro 2023–2024. Sem rede/DB.

const COMP_NAME = 'Campeonato Goiano de Futebol';
const PHRASE_2023 = '*** ATLÉTICO are Goiás State 2023 champions ***';
const META = {
  sourceUrl: 'https://rsssfbrasil.com/tablesfq/go2023.htm',
  retrievedAt: '2026-09-24T20:03:52Z',
  authorCredit: '(C) Copyright Guillermo Alexander Rivera, RSSSF and RSSSF Brazil 2023.',
  licenseText:
    'You are free to copy this document in whole or part provided that proper acknowledgement is given to the author. All rights reserved.',
};
const comps: CompetitionIndexEntry[] = [
  {
    id: '3063bf26-d069-430d-817c-6423831e52d3',
    qid: 'Q931386',
    name: COMP_NAME,
    aliases: ['Campeonato Goiano', 'Goiás State League'],
    hierarchy: 'estadual',
    gender: 'men',
  },
];
const clubs: ClubIndexEntry[] = [
  {
    id: null,
    qid: 'Q198034',
    name: 'Atlético Clube Goianiense',
    popularName: 'Atlético',
    officialName: 'Atlético Clube Goianiense',
    aliases: ['ATLÉTICO', 'Atlético'],
    active: true,
  },
];

function input(over: Record<string, unknown> = {}) {
  return {
    season: 2023,
    competitionName: COMP_NAME,
    text: PHRASE_2023,
    table: decodeGoTable(PHRASE_2023),
    meta: META,
    clubIndex: clubs,
    competitionIndex: comps,
    ...over,
  } as Parameters<typeof buildGoWonCandidate>[0];
}

describe('T448b-2d GO — parser', () => {
  it('T1 campeão explícito 2023 ⇒ candidate válido', () => {
    const { candidate, pending } = buildGoWonCandidate(input());
    expect(pending).toEqual([]);
    expect(candidate).toMatchObject({
      competitionQid: 'Q931386',
      clubQid: 'Q198034',
      seasonYear: 2023,
      hierarchy: 'estadual',
      gender: 'men',
    });
    expect(candidate!.dedupKey).toBe('Q931386|2023|Q198034|WON');
    expect(candidate!.retrievedAt).toBe('2026-09-24T20:03:52Z');
    expect(candidate!.parserVersion).toBe('t448b2d-go-parser-v1');
  });

  it('T2 campeão explícito 2024 ⇒ candidate válido', () => {
    const { candidate } = buildGoWonCandidate(
      input({
        season: 2024,
        text: '*** ATLÉTICO are Goiás State 2024 champions ***',
        table: decodeGoTable(''),
      }),
    );
    expect(candidate!.dedupKey).toBe('Q931386|2024|Q198034|WON');
  });

  it('T3 conflito frase×tabela ⇒ conflicting_champion', () => {
    const txt = '1.Goiás 11 8 2 1 20-8 26 Qualified\n' + PHRASE_2023;
    const { candidate, pending } = buildGoWonCandidate(
      input({ text: txt, table: decodeGoTable(txt) }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'conflicting_champion')).toBe(true);
  });

  it('T4 múltiplos campeões ⇒ multiple_champions', () => {
    const { candidate, pending } = buildGoWonCandidate(
      input({ text: 'Campeões: ATLÉTICO e Goiás', table: decodeGoTable('') }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'multiple_champions')).toBe(true);
  });

  it('T5 clube ambíguo ⇒ ambiguous_club', () => {
    const dup = [...clubs, { ...clubs[0], qid: 'Q999' }];
    const { candidate, pending } = buildGoWonCandidate(input({ clubIndex: dup }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'ambiguous_club')).toBe(true);
  });

  it('T6 clube ausente ⇒ missing_club', () => {
    const { candidate, pending } = buildGoWonCandidate(input({ clubIndex: [] }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_club')).toBe(true);
  });

  it('T7 competição ausente/ambígua ⇒ missing/ambiguous_competition', () => {
    expect(
      buildGoWonCandidate(input({ competitionIndex: [] })).pending.some(
        (p) => p.reasonCode === 'missing_competition',
      ),
    ).toBe(true);
    const dup = [...comps, { ...comps[0], qid: 'Q999' }];
    expect(
      buildGoWonCandidate(input({ competitionIndex: dup })).pending.some(
        (p) => p.reasonCode === 'ambiguous_competition',
      ),
    ).toBe(true);
  });

  it('T8 atribuição ausente ⇒ missing_attribution', () => {
    const { candidate, pending } = buildGoWonCandidate(
      input({ meta: { ...META, licenseText: '' } }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_attribution')).toBe(true);
  });

  it('T9 dedup factual não inclui hash de URL', () => {
    const a = buildGoWonCandidate(input()).candidate!;
    const b = buildGoWonCandidate(
      input({ meta: { ...META, sourceUrl: 'https://mirror.example/go2023.htm' } }),
    ).candidate!;
    expect(a.dedupKey).toBe(b.dedupKey);
    expect(a.externalId).not.toBe(b.externalId);
    expect(a.metadataExtras.sourcePageUrlHash).not.toBe(b.metadataExtras.sourcePageUrlHash);
  });

  it('T10 gender unknown ⇒ gender_unknown', () => {
    const c = [{ ...comps[0], gender: 'unknown' as const }];
    const { candidate, pending } = buildGoWonCandidate(input({ competitionIndex: c }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'gender_unknown')).toBe(true);
  });

  it('T11 hierarchy unknown ⇒ hierarchy_unknown', () => {
    const c = [{ ...comps[0], hierarchy: 'nacional' as const }];
    const { candidate, pending } = buildGoWonCandidate(input({ competitionIndex: c }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'hierarchy_unknown')).toBe(true);
  });

  it('T12 tabela malformada ⇒ malformed_table', () => {
    const txt = '2.X 10 5 3 2 20-10 18\n3.Y 10 4 4 2 18-12 16';
    const { candidate, pending } = buildGoWonCandidate(
      input({ text: txt, table: decodeGoTable(txt) }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'malformed_table')).toBe(true);
  });

  it('T13 determinismo', () => {
    expect(buildGoWonCandidate(input()).candidate).toEqual(buildGoWonCandidate(input()).candidate);
  });

  it('T14 2025 nunca entra (excluded_season_in_candidates)', () => {
    const { candidate, pending } = buildGoWonCandidate(input({ season: 2025 }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'excluded_season_in_candidates')).toBe(true);
  });

  it('T15 pack GO: 2 candidates, sem 2025/Q1513287, atribuição completa', () => {
    const pack = loadGoPack();
    expect(pack.pilotScope).toBe('go-2023-2024');
    expect(pack.parserVersion).toBe('t448b2d-go-parser-v1');
    expect(pack.candidates).toHaveLength(2);
    expect(pack.candidates.map((c) => c.seasonYear)).toEqual([2023, 2024]);
    expect(
      pack.candidates.every((c) => c.clubQid === 'Q198034' && c.competitionQid === 'Q931386'),
    ).toBe(true);
    expect(new Set(pack.candidates.map((c) => c.dedupKey)).size).toBe(2);
    expect(pack.excluded.find((e) => e.seasonYear === 2025)?.reason).toBe(
      'club_name_unique_conflict',
    );
    expect(pack.doNotTouch).toEqual(expect.arrayContaining(['Q10391045', 'Q10391046', 'Q1513287']));
  });

  it('T15b pack: rejeita 2025 e Q1513287', () => {
    const pack = loadGoPack();
    expect(() =>
      validateGoPack({
        ...pack,
        candidates: [...pack.candidates, { ...pack.candidates[0], seasonYear: 2025 }],
      }),
    ).toThrow(/2025/);
    expect(() =>
      validateGoPack({ ...pack, candidates: [{ ...pack.candidates[0], clubQid: 'Q1513287' }] }),
    ).toThrow();
  });
});
