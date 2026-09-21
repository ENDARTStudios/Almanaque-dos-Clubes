/**
 * T448b-1 — Unit: seletor de mães-copa (classes validadas ao vivo + fallback
 * por rótulo) e plano de semente idempotente.
 */
import { describe, it, expect } from 'vitest';
import {
  buildCupClassQuery,
  buildMothersCountryQuery,
  isCupByLabel,
  parseQids,
  planCupSeed,
  CUP_CLASS_QIDS,
} from '../../../src/scripts/seed-competitions-cups.js';

describe('T448b-1 — classes de copa (validação ao vivo registrada no cabeçalho do seeder)', () => {
  it('conjunto de classes contém as 5 validadas contra o gap real', () => {
    expect([...CUP_CLASS_QIDS]).toEqual([
      'Q8463186', // national association football cup (FA Cup, DFB-Pokal, del Rey)
      'Q1824674', // league cup
      'Q34262807', // super cup (Supercopa de España, Trophée des Champions)
      'Q34542757', // international clubs cup (UEFA Champions League)
      'Q123856943', // club world championship (FIFA Club World Cup)
    ]);
  });
});

describe('isCupByLabel — fallback para mães modeladas com classe genérica', () => {
  it('reconhece marcadores de copa em vários idiomas', () => {
    expect(isCupByLabel('Coppa Italia')).toBe(true); // classe genérica no Wikidata!
    expect(isCupByLabel('Copa Libertadores')).toBe(true);
    expect(isCupByLabel('FA Cup')).toBe(true);
    expect(isCupByLabel('DFB-Pokal')).toBe(true);
    expect(isCupByLabel('Svenska Cupen')).toBe(true);
    expect(isCupByLabel('Trophée des Champions')).toBe(true);
    expect(isCupByLabel('Recopa Sudamericana')).toBe(true);
  });

  it('NÃO marca ligas/campeonatos (o Carioca fica para o T448b-2 por design)', () => {
    expect(isCupByLabel('Campeonato Carioca')).toBe(false);
    expect(isCupByLabel('Ligue 1')).toBe(false);
    expect(isCupByLabel('Allsvenskan')).toBe(false);
    expect(isCupByLabel('Elitettan')).toBe(false);
    expect(isCupByLabel('Campeonato Brasileiro Série A')).toBe(false);
    expect(isCupByLabel('')).toBe(false);
    expect(isCupByLabel(null)).toBe(false);
  });
});

describe('buildCupClassQuery / buildMothersCountryQuery / parseQids', () => {
  it('query de classe usa VALUES com as classes validadas', () => {
    const q = buildCupClassQuery(['Q10', 'Q20']);
    expect(q).toContain('VALUES ?mother { wd:Q10 wd:Q20 }');
    expect(q).toContain('wd:Q8463186');
    expect(q).toContain('wd:Q123856943');
    expect(q).toContain('wdt:P31/wdt:P279*');
  });

  it('query de país é opcional (internacional fica sem país)', () => {
    const q = buildMothersCountryQuery(['Q10']);
    expect(q).toContain('OPTIONAL');
    expect(q).toContain('P297');
  });

  it('parseQids extrai QIDs de URIs e rejeita lixo', () => {
    const set = parseQids(
      {
        results: {
          bindings: [
            { mother: { value: 'http://www.wikidata.org/entity/Q11151' } },
            { mother: { value: 'http://www.wikidata.org/entity/not-a-qid' } },
            { other: { value: 'http://www.wikidata.org/entity/Q99' } },
          ],
        },
      },
      'mother',
    );
    expect(set.has('Q11151')).toBe(true);
    expect(set.has('not-a-qid')).toBe(false);
    expect(set.has('Q99')).toBe(false);
  });
});

describe('planCupSeed — classe ∪ rótulo − existente', () => {
  const mothers = [
    { qid: 'Q11151', name: 'FA Cup' }, // classe
    { qid: 'Q1115855', name: 'Coppa Italia' }, // só rótulo (classe genérica)
    { qid: 'Q765749', name: 'Campeonato Carioca' }, // NEM classe NEM rótulo → fora
    { qid: 'Q483794', name: 'Copa del Rey' }, // já existe no acervo → skip
  ];

  it('seleciona por classe ∪ rótulo, pula existentes e projeta hierarquia/gênero', () => {
    const plan = planCupSeed(mothers, new Set(['Q11151']), new Set(['Q483794']));
    const qids = plan.map((p) => p.qid);
    expect(qids).toContain('Q11151');
    expect(qids).toContain('Q1115855');
    expect(qids).not.toContain('Q765749');
    expect(qids).not.toContain('Q483794');
    const fa = plan.find((p) => p.qid === 'Q11151')!;
    expect(fa.via).toBe('class');
    expect(fa.hierarchy).toBe('nacional'); // FA Cup sem keyword → default nacional
    expect(fa.gender).toBe('men');
    const coppa = plan.find((p) => p.qid === 'Q1115855')!;
    expect(coppa.via).toBe('label');
  });

  it('projeção de hierarquia usa a MESMA resolveHierarchy (Libertadores → continental)', () => {
    const plan = planCupSeed(
      [{ qid: 'Q184795', name: 'Copa Libertadores' }],
      new Set(['Q184795']),
      new Set(),
    );
    expect(plan[0].hierarchy).toBe('continental');
  });

  it('dedup em lote: QID repetido gera uma linha só', () => {
    const plan = planCupSeed(
      [
        { qid: 'Q11151', name: 'FA Cup' },
        { qid: 'Q11151', name: 'FA Cup' },
      ],
      new Set(['Q11151']),
      new Set(),
    );
    expect(plan).toHaveLength(1);
  });
});
