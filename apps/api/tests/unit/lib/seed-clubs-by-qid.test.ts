import { describe, it, expect } from 'vitest';
import {
  isFootballClubEntity,
  foundedYearOf,
  pickName,
  claimIds,
} from '../../../src/scripts/seed-clubs-by-qid.js';

// T512 — regra de aceitação da ingestão por QID. As formas abaixo são as REAIS
// observadas no Wikidata (10/10): FC Barcelona, Boca Juniors e San Lorenzo NÃO
// têm P31=Q476028 (association football club), então a regra precisa aceitar o
// formato "clube poliesportivo" — e ainda assim rejeitar ligas, seleções e pessoas.

type Entity = Parameters<typeof isFootballClubEntity>[0];

const ent = (claims: Record<string, unknown[]>): Entity => ({ claims }) as unknown as Entity;

const id = (v: string) => ({ mainsnak: { datavalue: { value: { id: v } } } });
const time = (t: string) => ({ mainsnak: { datavalue: { value: { time: t } } } });

describe('isFootballClubEntity', () => {
  it('aceita clube dedicado (P31 = association football club)', () => {
    expect(isFootballClubEntity(ent({ P31: [id('Q476028')] }))).toBe(true);
  });

  it('aceita clube poliesportivo com P641=futebol e estádio (FC Barcelona, Boca, San Lorenzo)', () => {
    expect(
      isFootballClubEntity(
        ent({
          P31: [id('Q103229495'), id('Q20639856'), id('Q10651067')],
          P641: [id('Q2736')],
          P115: [id('Q9368373')],
        }),
      ),
    ).toBe(true);
    expect(
      isFootballClubEntity(
        ent({ P31: [id('Q847017')], P641: [id('Q2736')], P115: [id('Q499855')] }),
      ),
    ).toBe(true);
  });

  it('REJEITA liga (futebol, mas sem estádio)', () => {
    expect(isFootballClubEntity(ent({ P31: [id('Q15991303')], P641: [id('Q2736')] }))).toBe(false);
  });

  it('REJEITA pessoa, ano, banda e clube de outro esporte', () => {
    expect(isFootballClubEntity(ent({ P31: [id('Q5')] }))).toBe(false);
    expect(isFootballClubEntity(ent({ P31: [id('Q577')] }))).toBe(false);
    expect(isFootballClubEntity(ent({ P31: [id('Q215380')] }))).toBe(false);
    // clube poliesportivo cujo esporte NÃO é futebol
    expect(
      isFootballClubEntity(ent({ P31: [id('Q847017')], P641: [id('Q847')], P115: [id('Q1')] })),
    ).toBe(false);
  });
});

describe('foundedYearOf', () => {
  it('extrai o ano de P571 (formato wikibase "+1899-11-29T00:00:00Z")', () => {
    expect(foundedYearOf(ent({ P571: [time('+1899-11-29T00:00:00Z')] }))).toBe(1899);
    expect(foundedYearOf(ent({ P571: [time('+1905-00-00T00:00:00Z')] }))).toBe(1905);
    expect(foundedYearOf(ent({}))).toBeNull();
  });

  it('com vários P571 usa o MAIS ANTIGO (os primeiros valores costumam ser ruído)', () => {
    // forma real de Q29 (Espanha): 1715, 1812, 1931, 1978, 1516
    const many = ent({
      P571: [
        time('+1715-00-00T00:00:00Z'),
        time('+1931-12-09T00:00:00Z'),
        time('+1516-03-14T00:00:00Z'),
      ],
    });
    expect(foundedYearOf(many)).toBe(1516);
  });
});

describe('pickName', () => {
  it('prefere o rótulo pt (produto PT-first), com fallback en', () => {
    expect(
      pickName({
        labels: { pt: { value: 'Club Atlético Boca Juniors' }, en: { value: 'Boca Juniors' } },
      } as Entity),
    ).toBe('Club Atlético Boca Juniors');
    expect(pickName({ labels: { en: { value: 'Liverpool F.C.' } } } as Entity)).toBe(
      'Liverpool F.C.',
    );
    expect(pickName({} as Entity)).toBeNull();
  });
});

describe('claimIds', () => {
  it('extrai os QIDs de uma propriedade', () => {
    expect(claimIds(ent({ P17: [id('Q29')] }), 'P17')).toEqual(['Q29']);
    expect(claimIds(ent({}), 'P17')).toEqual([]);
  });
});
