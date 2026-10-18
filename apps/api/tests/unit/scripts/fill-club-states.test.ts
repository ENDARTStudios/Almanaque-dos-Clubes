/**
 * T-24/28 — matcher P131 do bot `fill-club-states` (Wikidata CC0).
 *
 * Fixtures no shape real do wbgetentities (`claims.P131[].mainsnak.datavalue.value.id`).
 * Cobre: match direto por `states.qid` (1 salto), cadeia de saltos (2 e 3), teto de
 * saltos (cadeia mais funda que MAX_HOPS = null), GUARDA DE PAÍS (estado de outro
 * país = descartado + flag, e a busca continua em outros ramos) e fixtures malformadas
 * (sem claims, snak sem datavalue, entidade ausente = contador `missingEntities`).
 *
 * O módulo do bot NÃO instancia PrismaClient no import (guarda de invocação direta) —
 * o teste importa sem mock de banco.
 */
import { describe, it, expect } from 'vitest';
import {
  extractP131Qids,
  resolveStateViaP131,
  type StateRef,
} from '../../../src/scripts/fill-club-states.js';

/** Entidade com UMA P131 (shape mínimo do wbgetentities). */
const p131 = (target: string) => ({
  claims: { P131: [{ mainsnak: { datavalue: { value: { 'entity-type': 'item', id: target } } } }] },
});

/** Índice states.qid → StateRef (a chave É o QID do estado no Wikidata). */
const states = new Map<string, StateRef>([
  ['Q175', { id: 'state-sp', countryIso2: 'BR' }], // São Paulo (estado)
  ['Q41428', { id: 'state-rj', countryIso2: 'BR' }], // Rio de Janeiro (estado)
  ['Q133604', { id: 'state-uy-md', countryIso2: 'UY' }], // Montevidéu (departamento)
]);

describe('T-24/28 — extractP131Qids', () => {
  it('coleta só QIDs válidos; ignora novalue/somevalue e lixo', () => {
    expect(
      extractP131Qids({
        claims: {
          P131: [
            { mainsnak: { datavalue: { value: { id: 'Q175' } } } },
            { mainsnak: { snaktype: 'novalue' } }, // sem datavalue
            { mainsnak: { datavalue: { value: { id: 'lixo' } } } },
            { mainsnak: { datavalue: { value: 'Q175' } } }, // string, não entity-id
          ],
        },
      }),
    ).toEqual(['Q175']);
  });

  it('sem claims / entidade ausente = []', () => {
    expect(extractP131Qids({ claims: {} })).toEqual([]);
    expect(extractP131Qids(undefined)).toEqual([]);
  });
});

describe('T-24/28 — resolveStateViaP131 (match por states.qid)', () => {
  const run = (
    clubQid: string,
    entityMap: Record<string, unknown>,
    clubCountryIso2: string | null = 'BR',
    maxHops?: number,
  ) =>
    resolveStateViaP131({
      clubQid,
      clubCountryIso2,
      entities: new Map(Object.entries(entityMap)),
      statesByQid: states,
      maxHops,
    });

  it('1 salto: P131 do clube JÁ é um states.qid', () => {
    const r = run('Q984424', { Q984424: p131('Q175') }); // Botafogo-SP → SP
    expect(r.stateId).toBe('state-sp');
    expect(r.hopsUsed).toBe(1);
    expect(r.visited).toBe(1);
    expect(r.crossCountryDiscard).toBe(false);
  });

  it('2 saltos: P131 aponta para intermediário desconhecido → P131 dele é o estado', () => {
    const r = run('Q213994', {
      Q213994: p131('Q130309'), // clube → microrregião (desconhecida)
      Q130309: p131('Q175'), // microrregião → SP
    });
    expect(r.stateId).toBe('state-sp');
    expect(r.hopsUsed).toBe(2);
    expect(r.visited).toBe(2);
  });

  it('3 saltos ainda resolvem (teto do bot)', () => {
    const r = run('Q1', {
      Q1: p131('Q2'),
      Q2: p131('Q3'),
      Q3: p131('Q175'),
    });
    expect(r.stateId).toBe('state-sp');
    expect(r.hopsUsed).toBe(3);
  });

  it('cadeia mais funda que o teto = null (gap declarado, não fabrica)', () => {
    const r = run('Q1', {
      Q1: p131('Q2'),
      Q2: p131('Q3'),
      Q3: p131('Q4'),
      Q4: p131('Q175'), // só no 4º salto — fora do teto de 3
    });
    expect(r.stateId).toBeNull();
    expect(r.hopsUsed).toBeNull();
  });

  it('GUARDA DE PAÍS: estado de OUTRO país = descartado + flag', () => {
    // Clube brasileiro cujo P131 direto cai num departamento uruguaio.
    const r = run('Q252615', { Q252615: p131('Q133604') });
    expect(r.stateId).toBeNull();
    expect(r.crossCountryDiscard).toBe(true);
  });

  it('GUARDA DE PAÍS: ramo cross-country descartado NÃO impede o ramo válido (P131 múltiplo)', () => {
    const multi = run('Q1', {
      Q1: {
        claims: {
          P131: [
            { mainsnak: { datavalue: { value: { id: 'Q133604' } } } }, // UY: descarta
            { mainsnak: { datavalue: { value: { id: 'Q175' } } } }, // BR: aceita
          ],
        },
      },
    });
    expect(multi.stateId).toBe('state-sp');
    expect(multi.hopsUsed).toBe(1);
    expect(multi.crossCountryDiscard).toBe(true);
  });

  it('clube SEM país (null) não aceita estado nenhum (guarda a tripla)', () => {
    const r = run('Q1', { Q1: p131('Q175') }, null);
    expect(r.stateId).toBeNull();
    expect(r.crossCountryDiscard).toBe(true);
  });

  it('entidade ausente do Wikidata = contador missingEntities, sem crash', () => {
    const r = run('Q1', {}); // nem o clube foi obtido
    expect(r.stateId).toBeNull();
    expect(r.missingEntities).toBe(1);
    expect(r.visited).toBe(1);
  });

  it('intermediário ausente encerra o ramo (missingEntities conta só a fronteira obtida)', () => {
    const r = run('Q1', { Q1: p131('Q404') }); // Q404 nunca buscado
    expect(r.stateId).toBeNull();
    expect(r.missingEntities).toBe(1);
  });
});
