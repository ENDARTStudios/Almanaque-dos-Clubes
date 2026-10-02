import { describe, it, expect } from 'vitest';
import { mapTeamToClub, normalizeTeamName } from '../../../src/lib/rsssf/map-team-to-club.js';
import type { ClubIndexEntry } from '../../../src/lib/rsssf/types.js';

// T448b-2b FASE 1 — time→clube determinístico (igualdade exata; sem fuzzy). Sem rede.

const atletico: ClubIndexEntry = {
  id: null,
  qid: 'Q270995',
  name: 'Atlético-MG',
  popularName: 'Atlético',
  officialName: 'Clube Atlético Mineiro',
  aliases: ['Galo', 'Atlético Mineiro'],
  active: true,
};

describe('T448b-2b FASE 1 — normalizeTeamName', () => {
  it('remove acento/pontuação e baixa caixa', () => {
    expect(normalizeTeamName('Atlético-MG')).toBe('atletico mg');
    expect(normalizeTeamName('  Águia  de  Marabá ')).toBe('aguia de maraba');
  });
});

describe('T448b-2b FASE 1 — mapTeamToClub', () => {
  it('match exato por nome popular/alias', () => {
    const r = mapTeamToClub('Atlético', [atletico]);
    expect(r.club?.qid).toBe('Q270995');
    expect(r.reasonCode).toBeNull();
  });

  it('match exato por nome oficial', () => {
    expect(mapTeamToClub('Clube Atlético Mineiro', [atletico]).club?.qid).toBe('Q270995');
  });

  it('T6 — clube ausente => missing_club', () => {
    const r = mapTeamToClub('Tombense', [atletico]);
    expect(r.club).toBeNull();
    expect(r.reasonCode).toBe('missing_club');
  });

  it('T5 — clube ambíguo (dois ativos) => ambiguous_club', () => {
    const dup: ClubIndexEntry = { ...atletico, qid: 'Q999', name: 'Atlético-MG' };
    const r = mapTeamToClub('Atlético', [atletico, dup]);
    expect(r.club).toBeNull();
    expect(r.reasonCode).toBe('ambiguous_club');
  });

  it('clube inativo (soft-deleted) => club_inactive (não reativa)', () => {
    const r = mapTeamToClub('Atlético', [{ ...atletico, active: false }]);
    expect(r.club).toBeNull();
    expect(r.reasonCode).toBe('club_inactive');
  });
});
