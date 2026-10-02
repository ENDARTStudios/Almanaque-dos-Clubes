import { describe, it, expect } from 'vitest';
import { resolveCompetitionQid } from '../../../src/lib/rsssf/resolve-competition-qid.js';
import type { CompetitionIndexEntry } from '../../../src/lib/rsssf/types.js';

// T448b-2b FASE 1 — competição-mãe por QID/alias auditável. Sem rede.

const index: CompetitionIndexEntry[] = [
  {
    id: null,
    qid: 'Q731877',
    name: 'Campeonato Mineiro',
    aliases: ['Campeonato Mineiro de Futebol'],
    hierarchy: 'estadual',
    gender: 'men',
  },
];

describe('T448b-2b FASE 1 — resolveCompetitionQid', () => {
  it('resolve por nome/alias exato', () => {
    const r = resolveCompetitionQid(
      { expectedCompetitionName: 'Campeonato Mineiro de Futebol' },
      index,
    );
    expect(r.competition?.qid).toBe('Q731877');
    expect(r.reasonCode).toBeNull();
  });

  it('resolve por QID explícito (auditável)', () => {
    const r = resolveCompetitionQid({ expectedCompetitionName: 'qualquer' }, index, {
      qid: 'Q731877',
    });
    expect(r.competition?.qid).toBe('Q731877');
  });

  it('T7 — ausente => missing_competition', () => {
    const r = resolveCompetitionQid({ expectedCompetitionName: 'Campeonato Carioca' }, index);
    expect(r.competition).toBeNull();
    expect(r.reasonCode).toBe('missing_competition');
  });

  it('T7 — ambígua => ambiguous_competition', () => {
    const r = resolveCompetitionQid({ expectedCompetitionName: 'Campeonato Mineiro' }, [
      index[0],
      { ...index[0], qid: 'Q999' },
    ]);
    expect(r.reasonCode).toBe('ambiguous_competition');
  });
});
