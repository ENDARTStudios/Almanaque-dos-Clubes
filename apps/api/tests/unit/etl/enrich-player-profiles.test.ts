/**
 * T-22.3 — extratores puros do bot `enrich-player-profiles` (Wikidata CC0).
 *
 * Cada guarda que existe por uma razão tem teste: precisão de dia no P569 (data
 * de precisão menor fabricaria dia/mês), unit do P2048 (metros ≠ cm), faixa de
 * apps/goals (coluna errada na fonte), merge zero-overwrite do metadata da aresta
 * e dedup de prêmios (re-run = noop).
 *
 * O módulo do bot NÃO instancia PrismaClient no import (guarda de invocação
 * direta) — o teste importa sem mock de banco.
 */
import { describe, it, expect } from 'vitest';
import {
  positionFromLabel,
  footFromLabel,
  yearFromWikidataTime,
  extractHeightCm,
  extractBirthDate,
  extractStints,
  extractAwards,
  mergeStintMetadata,
  mergeAwards,
} from '../../../src/scripts/enrich-player-profiles.js';

describe('T-22.3 — positionFromLabel (P413 → PlayerPosition)', () => {
  it('mapeia os rótulos canônicos (en/pt) para as 4 posições', () => {
    expect(positionFromLabel('centre forward')).toBe('FORWARD');
    expect(positionFromLabel('striker')).toBe('FORWARD');
    expect(positionFromLabel('winger')).toBe('FORWARD');
    expect(positionFromLabel('goalkeeper')).toBe('GOALKEEPER');
    expect(positionFromLabel('goleiro')).toBe('GOALKEEPER');
    expect(positionFromLabel('centre-back')).toBe('DEFENDER');
    expect(positionFromLabel('zagueiro')).toBe('DEFENDER');
    expect(positionFromLabel('attacking midfielder')).toBe('MIDFIELDER');
    expect(positionFromLabel('volante')).toBe('MIDFIELDER');
  });

  it('não-mapeável = null (o bot ignora + loga — nunca inventa)', () => {
    expect(positionFromLabel('politician')).toBeNull();
    expect(positionFromLabel('')).toBeNull();
  });
});

describe('T-22.3 — footFromLabel (P423 → left/right/both)', () => {
  it('resolve por palavra-chave nos três idiomas', () => {
    expect(footFromLabel('right-footed fit')).toBe('right');
    expect(footFromLabel('destro')).toBe('right');
    expect(footFromLabel('left-footed fit')).toBe('left');
    expect(footFromLabel('esquerda')).toBe('left');
    expect(footFromLabel('Ambidestros')).toBe('both');
    expect(footFromLabel('ambidextrous')).toBe('both');
  });

  it('sem pista = null (gap declarado)', () => {
    expect(footFromLabel('unknown')).toBeNull();
  });
});

describe('T-22.3 — yearFromWikidataTime', () => {
  it('parseia o time Wikidata e aplica a faixa 1850..atual+1', () => {
    expect(yearFromWikidataTime('+1956-09-01T00:00:00Z')).toBe(1956);
    expect(yearFromWikidataTime('-0500-01-01T00:00:00Z')).toBeNull(); // antes de 1850
    expect(yearFromWikidataTime('+99999-01-01T00:00:00Z')).toBeNull(); // fora do padrão
    expect(yearFromWikidataTime({ time: '+1956-09-01T00:00:00Z' })).toBeNull(); // não é string
    expect(yearFromWikidataTime(undefined)).toBeNull();
  });
});

describe('T-22.3 — extractHeightCm (P2048)', () => {
  it('unit Q1747289 (cm) → inteiro', () => {
    expect(
      extractHeightCm({
        claims: {
          P2048: [
            {
              mainsnak: {
                datavalue: {
                  value: { amount: '+173', unit: 'http://www.wikidata.org/entity/Q1747289' },
                },
              },
            },
          ],
        },
      }),
    ).toBe(173);
  });

  it('outra unidade (Q11573 = metro) é recusada — gap declarado', () => {
    expect(
      extractHeightCm({
        claims: {
          P2048: [
            {
              mainsnak: {
                datavalue: {
                  value: { amount: '+1.73', unit: 'http://www.wikidata.org/entity/Q11573' },
                },
              },
            },
          ],
        },
      }),
    ).toBeNull();
  });

  it('fora da faixa plausível (130–250) é recusado', () => {
    expect(
      extractHeightCm({
        claims: { P2048: [{ mainsnak: { datavalue: { value: { amount: '+88' } } } }] },
      }),
    ).toBeNull();
  });
});

describe('T-22.3 — extractBirthDate (P569)', () => {
  it('precisão 11 (dia) → Date UTC', () => {
    const d = extractBirthDate({
      claims: {
        P569: [
          { mainsnak: { datavalue: { value: { time: '+1940-10-23T00:00:00Z', precision: 11 } } } },
        ],
      },
    });
    expect(d?.toISOString().startsWith('1940-10-23')).toBe(true);
  });

  it('precisão menor (ano/mês) é recusada — preencheria dia/mês fabricado', () => {
    expect(
      extractBirthDate({
        claims: {
          P569: [
            { mainsnak: { datavalue: { value: { time: '+1940-00-00T00:00:00Z', precision: 9 } } } },
          ],
        },
      }),
    ).toBeNull();
  });
});

describe('T-22.3 — extractStints (P54 + P580/P582/P1350/P1351)', () => {
  const entity = {
    claims: {
      P54: [
        {
          mainsnak: { datavalue: { value: { id: 'Q1948' } } },
          qualifiers: {
            P580: [{ datavalue: { value: { time: '+1956-09-01T00:00:00Z' } } }],
            P582: [{ datavalue: { value: { time: '+1974-10-01T00:00:00Z' } } }],
            P1350: [{ datavalue: { value: { amount: '+638' } } }],
            P1351: [{ datavalue: { value: { amount: '+619' } } }],
          },
        },
        { mainsnak: { datavalue: { value: { id: 'Qnaoid' } } } }, // não é QID
        {
          mainsnak: { datavalue: { value: { id: 'Q99999' } } },
          qualifiers: {
            P1350: [{ datavalue: { value: { amount: '+99999' } } }], // guarda de faixa
          },
        },
      ],
    },
  };

  it('extrai o stint com qualificadores e descarta o inválido', () => {
    const stints = extractStints(entity);
    expect(stints).toHaveLength(2);
    expect(stints[0]).toEqual({
      clubQid: 'Q1948',
      year: 1956,
      endYear: 1974,
      apps: 638,
      goals: 619,
    });
    expect(stints[1]).toEqual({
      clubQid: 'Q99999',
      year: null,
      endYear: null,
      apps: null,
      goals: null,
    });
  });

  it('metadata novo recebe todas as chaves com proveniência', () => {
    const { metadata, added } = mergeStintMetadata(undefined, extractStints(entity)[0]);
    expect(added).toEqual(['year', 'endYear', 'apps', 'goals', 'profileSource']);
    expect(metadata.profileSource).toBe('wikidata:P54');
  });

  it('ZERO OVERWRITE: apps/goals de outra fonte sobrevivem; só entram chaves ausentes', () => {
    const { metadata, added } = mergeStintMetadata(
      { apps: 700, goals: 700 },
      extractStints(entity)[0],
    );
    expect(metadata.apps).toBe(700);
    expect(metadata.goals).toBe(700);
    expect(added).toEqual(['year', 'endYear', 'profileSource']);
  });
});

describe('T-22.3 — extractAwards (P166 + P585) e mergeAwards', () => {
  it('extrai prêmio com ano do qualifier e proveniência', () => {
    const awards = extractAwards(
      {
        claims: {
          P166: [
            {
              mainsnak: { datavalue: { value: { id: 'Q163921' } } },
              qualifiers: { P585: [{ datavalue: { value: { time: '+2020-01-01T00:00:00Z' } } }] },
            },
          ],
        },
      },
      new Map([['Q163921', 'Bola de Ouro']]),
    );
    expect(awards).toEqual([
      {
        qid: 'Q163921',
        label: 'Bola de Ouro',
        year: 2020,
        sourceUrl: 'https://www.wikidata.org/wiki/Q163921',
      },
    ]);
  });

  it('merge dedup por (qid, year) — re-run não duplica', () => {
    const award = { qid: 'Q163921', label: 'Bola de Ouro', year: 2020, sourceUrl: 's' };
    expect(mergeAwards(undefined, [award]).added).toBe(1);
    expect(mergeAwards([award], [award]).added).toBe(0);
  });

  it('merge ordena por year desc (null por último)', () => {
    const { merged } = mergeAwards(undefined, [
      { qid: 'Q1', label: 'A', year: null, sourceUrl: 's' },
      { qid: 'Q2', label: 'B', year: 2022, sourceUrl: 's' },
      { qid: 'Q3', label: 'C', year: 2020, sourceUrl: 's' },
    ]);
    expect(merged.map((a) => a.qid)).toEqual(['Q2', 'Q3', 'Q1']);
  });
});
