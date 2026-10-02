import { describe, it, expect } from 'vitest';
import {
  selectCanonical,
  normalizeCompetitionName,
  buildRedirectPlan,
  type CompetitionRow,
} from '../../../src/lib/identity/competition-dedupe.js';

const row = (
  id: string,
  qid: string | null,
  name = 'x',
  deletedAt: Date | null = null,
): CompetitionRow => ({
  id,
  name,
  qid,
  deletedAt,
});

describe('T448b-2i — selectCanonical', () => {
  it('qid vence duplicata sem qid', () => {
    const s = selectCanonical([row('a', 'Q1'), row('b', null)]);
    expect(s).toMatchObject({ status: 'ok', canonicalId: 'a', canonicalQid: 'Q1' });
    expect(s.duplicates.map((d) => d.id)).toEqual(['b']);
  });
  it('dois qids diferentes → ambiguous_multiple_qid', () => {
    expect(selectCanonical([row('a', 'Q1'), row('b', 'Q2')]).status).toBe('ambiguous_multiple_qid');
  });
  it('mesmo qid em duas → duplicate_qid', () => {
    expect(selectCanonical([row('a', 'Q1'), row('b', 'Q1')]).status).toBe('duplicate_qid');
  });
  it('nenhum qid → ambiguous_no_qid', () => {
    expect(selectCanonical([row('a', null), row('b', null)]).status).toBe('ambiguous_no_qid');
  });
  it('ignora soft-deleted', () => {
    const s = selectCanonical([row('a', 'Q1'), row('b', null, 'x', new Date())]);
    expect(s.status).toBe('ok');
    expect(s.duplicates).toHaveLength(0);
  });
});

describe('T448b-2i — normalize/plan', () => {
  it('normaliza acentos/caixa/espaços (diagnóstico)', () => {
    expect(normalizeCompetitionName('  Copa  do  BRASIL ')).toBe('copa do brasil');
    expect(normalizeCompetitionName('Série A')).toBe('serie a');
  });
  it('buildRedirectPlan soma referências', () => {
    const p = buildRedirectPlan(row('b', null), 'a', 'Q1', [
      { table: 'rankings', column: 'competitionId', count: 1 },
      { table: 'knowledge_graph', column: 'targetId', count: 0 },
    ]);
    expect(p).toMatchObject({
      canonicalId: 'a',
      duplicateId: 'b',
      referencesTotal: 1,
      softDeleteDuplicate: true,
    });
  });
});
