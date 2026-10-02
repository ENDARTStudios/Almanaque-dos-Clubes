import { describe, it, expect } from 'vitest';
import {
  buildCountryPyramid,
  divisionWeight,
  COUNTRY_PYRAMID_FORMULA_VERSION,
  COUNTRY_PYRAMID_SCOPE,
  CountryPyramidError,
  type SourceRanking,
} from '../../../../src/lib/rankings/pyramid/country-pyramid.js';

// T449c-v2 — agregado cross-division (puro).

function entry(clubId: string, position: number | null, points: number | null) {
  return {
    clubId,
    position,
    points,
    baseMatches: 46,
    baseTitles: null,
    dataSourceIds: ['rsssf'],
    gender: 'men',
  };
}

describe('T449c-v2 — pesos e versão', () => {
  it('pesos lineares aprovados', () => {
    expect(COUNTRY_PYRAMID_SCOPE).toBe('country_pyramid');
    expect(COUNTRY_PYRAMID_FORMULA_VERSION).toBe('t449c-v2-country-pyramid-v1');
    expect([1, 2, 3, 4, 5].map(divisionWeight)).toEqual([1.0, 0.85, 0.7, 0.55, 0.4]);
    expect(divisionWeight(9)).toBeNull();
  });
});

describe('T449c-v2 — buildCountryPyramid', () => {
  const sources: SourceRanking[] = [
    {
      level: 1,
      divisionLabel: 'Premier League',
      gender: 'men',
      entries: [entry('a', 1, 100), entry('b', 2, 50)],
    },
    {
      level: 2,
      divisionLabel: 'Championship',
      gender: 'men',
      entries: [entry('c', 1, 100), entry('d', 2, 50)],
    },
  ];

  it('aplica o fator de divisão à nota existente', () => {
    const r = buildCountryPyramid(sources);
    const byClub = Object.fromEntries(r.rows.map((x) => [x.clubId, x.adjustedPoints]));
    expect(byClub).toEqual({ a: 100, c: 85, b: 50, d: 43 }); // 50*0.85=42.5→43
    expect(r.rankedCount).toBe(4);
  });

  it('preserva a ordem intra-divisão (peso uniforme por nível) e ordena por pontuação', () => {
    const r = buildCountryPyramid(sources);
    const order = r.rows.map((x) => x.clubId);
    expect(order).toEqual(['a', 'c', 'b', 'd']);
    const l1 = r.rows.filter((x) => x.level === 1).map((x) => x.clubId);
    expect(l1).toEqual(['a', 'b']); // ordem original preservada
    expect(r.rows.map((x) => x.position)).toEqual([1, 2, 3, 4]);
  });

  it('determinismo: mesma entrada ⇒ mesma saída', () => {
    const a = buildCountryPyramid(sources);
    const b = buildCountryPyramid(sources);
    expect(b.rows).toEqual(a.rows);
  });

  it('gênero isolado: posições reiniciam por gênero (level único por gênero)', () => {
    const r = buildCountryPyramid([
      { level: 1, divisionLabel: 'PL', gender: 'men', entries: [entry('m1', 1, 100)] },
      {
        level: 1,
        divisionLabel: 'WSL',
        gender: 'women',
        entries: [{ ...entry('w1', 1, 90), gender: 'women' }],
      },
    ]);
    expect(r.rows.find((x) => x.clubId === 'm1')?.position).toBe(1);
    expect(r.rows.find((x) => x.clubId === 'w1')?.position).toBe(1);
  });

  it('entradas sem posição/pontos são excluídas e contadas', () => {
    const r = buildCountryPyramid([
      {
        level: 1,
        divisionLabel: 'PL',
        gender: 'men',
        entries: [entry('a', 1, 100), entry('z', null, null)],
      },
    ]);
    expect(r.rankedCount).toBe(1);
    expect(r.excludedCount).toBe(1);
  });

  it('fail-fast: level inválido, level duplicado, clube em >1 divisão', () => {
    expect(() =>
      buildCountryPyramid([{ level: 9, divisionLabel: 'X', gender: 'men', entries: [] }]),
    ).toThrow(CountryPyramidError);
    expect(() =>
      buildCountryPyramid([
        { level: 1, divisionLabel: 'PL', gender: 'men', entries: [] },
        { level: 1, divisionLabel: 'PL2', gender: 'men', entries: [] },
      ]),
    ).toThrow(/level duplicado/);
    expect(() =>
      buildCountryPyramid([
        { level: 1, divisionLabel: 'PL', gender: 'men', entries: [entry('x', 1, 100)] },
        { level: 2, divisionLabel: 'CH', gender: 'men', entries: [entry('x', 1, 100)] },
      ]),
    ).toThrow(/clube em >1 divisão/);
  });
});
