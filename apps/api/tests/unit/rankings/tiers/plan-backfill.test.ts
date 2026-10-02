import { describe, it, expect } from 'vitest';
import {
  planEnLevelBackfill,
  validateEnPyramidMapping,
  type ExistingCompetition,
} from '../../../../src/lib/rankings/tiers/plan-backfill.js';
import {
  EN_PYRAMID_TIERS,
  type EnDivisionTier,
} from '../../../../src/lib/rankings/tiers/en-pyramid.js';

// T449c-v1 — plano puro de backfill (sem DB).

function rowsClean(): ExistingCompetition[] {
  return EN_PYRAMID_TIERS.map((t, i) => ({
    id: `c${i}`,
    qid: t.competitionQid,
    level: null,
  }));
}

describe('T449c-v1 — planEnLevelBackfill', () => {
  it('estado limpo ⇒ wouldUpdate=5, noop=0, sem erros', () => {
    const p = planEnLevelBackfill(EN_PYRAMID_TIERS, rowsClean());
    expect(p).toMatchObject({ totalMapped: 5, wouldUpdate: 5, noop: 0, errors: [] });
  });

  it('estado já atualizado ⇒ noop=5, wouldUpdate=0', () => {
    const rows = EN_PYRAMID_TIERS.map((t, i) => ({
      id: `c${i}`,
      qid: t.competitionQid,
      level: t.level,
    }));
    const p = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);
    expect(p).toMatchObject({ wouldUpdate: 0, noop: 5 });
  });

  it('estado parcial ⇒ atualiza só o divergente', () => {
    const rows = EN_PYRAMID_TIERS.map((t, i) => ({
      id: `c${i}`,
      qid: t.competitionQid,
      level: t.level,
    }));
    rows[1].level = 7; // divergente
    const p = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);
    expect(p.wouldUpdate).toBe(1);
    expect(p.noop).toBe(4);
    expect(p.items.find((i) => i.competitionId === 'c1')?.action).toBe('update');
  });

  it('competição ausente ⇒ missing + erro', () => {
    const p = planEnLevelBackfill(EN_PYRAMID_TIERS, rowsClean().slice(1));
    expect(p.missingCompetitions).toEqual(['Q9448']);
    expect(p.errors.some((e) => e.startsWith('missing_competition:'))).toBe(true);
  });

  it('competição ambígua ⇒ ambiguous + erro', () => {
    const rows = rowsClean();
    rows.push({ id: 'dup', qid: EN_PYRAMID_TIERS[0].competitionQid, level: null });
    const p = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);
    expect(p.ambiguousCompetitions).toEqual([EN_PYRAMID_TIERS[0].competitionQid]);
    expect(p.errors.some((e) => e.startsWith('ambiguous_competition:'))).toBe(true);
  });

  it('ignora competições fora do mapeamento', () => {
    const rows = rowsClean();
    rows.push({ id: 'outside', qid: 'Q0000', level: 1 });
    const p = planEnLevelBackfill(EN_PYRAMID_TIERS, rows);
    expect(p.items.every((i) => i.competitionId !== 'outside')).toBe(true);
    expect(p.wouldUpdate).toBe(5);
  });
});

describe('T449c-v1 — validateEnPyramidMapping', () => {
  const base: EnDivisionTier = EN_PYRAMID_TIERS[0];

  it('rejeita qid duplicado, level inválido/duplicado, label/source vazio', () => {
    expect(validateEnPyramidMapping([base, { ...base, level: 2 }])).toContain(
      `qid_duplicado:${base.competitionQid}`,
    );
    expect(validateEnPyramidMapping([{ ...base, level: 9 }])).toContain(
      `level_fora_de_1_5:${base.competitionQid}:9`,
    );
    expect(validateEnPyramidMapping([base, { ...EN_PYRAMID_TIERS[1], level: 1 }])).toContain(
      'level_duplicado:1',
    );
    expect(validateEnPyramidMapping([{ ...base, divisionLabel: '  ' }])).toContain(
      `label_vazio:${base.competitionQid}`,
    );
    expect(validateEnPyramidMapping(EN_PYRAMID_TIERS)).toEqual([]);
  });
});
