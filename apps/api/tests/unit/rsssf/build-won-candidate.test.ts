import { describe, it, expect } from 'vitest';
import { decodeLegacyTable } from '../../../src/lib/rsssf/decode-legacy-table.js';
import {
  buildWonCandidate,
  sha256Hex,
  type BuildInput,
} from '../../../src/lib/rsssf/build-won-candidate.js';
import type { ClubIndexEntry, CompetitionIndexEntry } from '../../../src/lib/rsssf/types.js';

// T448b-2b FASE 1 — candidate WON (R1 dedup factual; R4 atribuição). Sem rede.

const TEXT =
  '1.Atlético 15 10 4 1 28-9 34 Champions\n** Atlético are Minas Gerais champions of 2023 **';

const clubIndex: ClubIndexEntry[] = [
  {
    id: null,
    qid: 'Q270995',
    name: 'Atlético-MG',
    popularName: 'Atlético',
    officialName: 'Clube Atlético Mineiro',
    aliases: [],
    active: true,
  },
];
const competitionIndex: CompetitionIndexEntry[] = [
  { id: null, qid: 'Q731877', name: 'Campeonato Mineiro', hierarchy: 'estadual', gender: 'men' },
];

function makeInput(over: Partial<BuildInput> = {}): BuildInput {
  return {
    season: 2023,
    competitionName: 'Campeonato Mineiro',
    text: TEXT,
    table: decodeLegacyTable(TEXT),
    meta: {
      sourceUrl: 'https://rsssfbrasil.com/tablesfq/mg2023.htm',
      retrievedAt: '2026-09-23T22:59:09Z',
      authorCredit: '(C) Copyright Claudio Freati, RSSSF and RSSSF Brazil 2022-2023.',
      licenseText:
        'You are free to copy this document in whole or part provided that proper acknowledgement is given to the author. All rights reserved.',
    },
    clubIndex,
    competitionIndex,
    ...over,
  };
}

describe('T448b-2b FASE 1 — candidate válido', () => {
  it('T1 — campeão explícito + tabela => candidate completo', () => {
    const { candidate, pending } = buildWonCandidate(makeInput());
    expect(pending).toHaveLength(0);
    expect(candidate).not.toBeNull();
    expect(candidate!.relation).toBe('WON');
    expect(candidate!.dedupKey).toBe('Q731877|2023|Q270995|WON');
    expect(candidate!.externalId).toMatch(/^[0-9a-f]{16}$/);
    expect(candidate!.source).toBe('rsssf');
    expect(candidate!.attributionRequired).toBe(true);
    expect(candidate!.metadataExtras.parserVersion).toBe('t448b2b-fase1-v1');
    expect(candidate!.metadataExtras.sourcePageUrlHash).toBe(
      sha256Hex('https://rsssfbrasil.com/tablesfq/mg2023.htm'),
    );
  });
});

describe('T448b-2b FASE 1 — bloqueios', () => {
  it('T8 — sem licenseText => missing_attribution, sem candidate', () => {
    const { candidate, pending } = buildWonCandidate(
      makeInput({ meta: { ...makeInput().meta, licenseText: '' } }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_attribution')).toBe(true);
  });

  it('T7 — competição ausente => missing_competition', () => {
    const { candidate, pending } = buildWonCandidate(makeInput({ competitionIndex: [] }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_competition')).toBe(true);
  });

  it('T7 — competição ambígua => ambiguous_competition', () => {
    const dup = [...competitionIndex, { ...competitionIndex[0], qid: 'Q999' }];
    const { candidate, pending } = buildWonCandidate(makeInput({ competitionIndex: dup }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'ambiguous_competition')).toBe(true);
  });

  it('T3 — conflito frase×tabela => sem candidate', () => {
    const text = '1.Atlético 15 10 4 1 28-9 34\nCampeão: Cruzeiro';
    const { candidate, pending } = buildWonCandidate(
      makeInput({ text, table: decodeLegacyTable(text) }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'conflicting_champion')).toBe(true);
  });

  it('T6 — clube ausente => missing_club, sem candidate', () => {
    const { candidate, pending } = buildWonCandidate(makeInput({ clubIndex: [] }));
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'missing_club')).toBe(true);
  });

  it('T10 — gender unknown => gender_unknown, não assume men', () => {
    const unknownGender = [{ ...competitionIndex[0], gender: 'unknown' as const }];
    const { candidate, pending } = buildWonCandidate(
      makeInput({ competitionIndex: unknownGender }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'gender_unknown')).toBe(true);
  });

  it('T11 — tabela malformada (sem posição 1) => pending malformed_table', () => {
    const text = '2.Cruzeiro 10 5 3 2 20-10 18\n3.América 10 4 4 2 18-12 16';
    const { candidate, pending } = buildWonCandidate(
      makeInput({ text, table: decodeLegacyTable(text) }),
    );
    expect(candidate).toBeNull();
    expect(pending.some((p) => p.reasonCode === 'malformed_table')).toBe(true);
  });

  it('gênero derivado EXPLICITAMENTE (feminino) => candidate gender women', () => {
    const text =
      '1.Atlético 15 10 4 1 28-9 34\n** Atlético are Minas Gerais Feminino champions of 2023 **';
    const unknown = [{ ...competitionIndex[0], gender: 'unknown' as const }];
    const { candidate } = buildWonCandidate(
      makeInput({ text, table: decodeLegacyTable(text), competitionIndex: unknown }),
    );
    expect(candidate?.gender).toBe('women');
  });
});

describe('T448b-2b FASE 1 — R1 dedup factual vs hash de URL', () => {
  it('T9 — mesma tríade com sourceUrl diferente => mesmo dedupKey', () => {
    const a = buildWonCandidate(makeInput()).candidate!;
    const b = buildWonCandidate(
      makeInput({ meta: { ...makeInput().meta, sourceUrl: 'https://espelho.example/mg2023' } }),
    ).candidate!;
    expect(a.dedupKey).toBe(b.dedupKey); // factual — não inclui URL
    expect(a.externalId).not.toBe(b.externalId); // rastreabilidade difere
    expect(a.metadataExtras.sourcePageUrlHash).not.toBe(b.metadataExtras.sourcePageUrlHash);
  });

  it('T12 — determinismo: duas execuções => candidate idêntico', () => {
    const a = buildWonCandidate(makeInput()).candidate;
    const b = buildWonCandidate(makeInput()).candidate;
    expect(a).toEqual(b);
  });
});
