import { describe, it, expect } from 'vitest';
import {
  isFootballClubEntity,
  foundedYearOf,
  pickName,
  pickVenue,
  claimIds,
  TARGET_CLUBS,
  TARGET_CLUBS_T513,
  TARGET_CLUBS_T514,
  TARGET_CLUBS_T515,
  TARGET_CLUBS_T516,
  ALL_TARGET_CLUBS,
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
  it('usa o idioma do PAÍS (convenção já existente no acervo)', () => {
    const liverpool: Entity = {
      labels: { en: { value: 'Liverpool F.C.' }, pt: { value: 'Liverpool Football Club' } },
    };
    // GB → en (consistente com "Manchester City F.C." do acervo)
    expect(pickName(liverpool, 'GB')).toBe('Liverpool F.C.');
    const girona: Entity = {
      labels: { es: { value: 'Girona Fútbol Club' }, pt: { value: 'Girona Futbol Club' } },
    };
    // ES → es (consistente com "Real Madrid Club de Fútbol", "Getafe Club de Fútbol")
    expect(pickName(girona, 'ES')).toBe('Girona Fútbol Club');
    // AR → es → "Club Atlético Boca Juniors" (mesma forma do "Club Atlético River Plate")
    const boca: Entity = {
      labels: { es: { value: 'Club Atlético Boca Juniors' }, en: { value: 'Boca Juniors' } },
    };
    expect(pickName(boca, 'AR')).toBe('Club Atlético Boca Juniors');
  });

  it('sem país cai em pt → en → es; sem rótulo devolve null', () => {
    expect(
      pickName({ labels: { pt: { value: 'Club Libertad' }, en: { value: 'Libertad' } } } as Entity),
    ).toBe('Club Libertad');
    expect(pickName({ labels: { en: { value: 'The Strongest' } } } as Entity)).toBe(
      'The Strongest',
    );
    expect(pickName({} as Entity)).toBeNull();
  });
});

describe('pickVenue', () => {
  const venue = (capacity: number | null) => ({ entity: {}, capacity, image: null });
  const venues = new Map<string, unknown>([
    ['Q_old', venue(75000)],
    ['Q_new', venue(47964)],
    ['Q_campnou', venue(105000)],
  ]);

  it('prefere o rank `preferred` (FC Barcelona marca o Camp Nou assim)', () => {
    const club = {
      claims: {
        P115: [
          { mainsnak: { datavalue: { value: { id: 'Q_old' } } }, rank: 'normal' },
          { mainsnak: { datavalue: { value: { id: 'Q_campnou' } } }, rank: 'preferred' },
        ],
      },
    } as Entity;
    expect(pickVenue(club, venues as never)?.qid).toBe('Q_campnou');
  });

  it('sem preferred, usa o P580 MAIS RECENTE (San Lorenzo: Nuevo Gasómetro, não o Gasómetro antigo)', () => {
    // FORMA REAL: qualificador é snak cru (`datavalue` direto, SEM `mainsnak`)
    const qual = (start: string) => ({
      P580: [{ datavalue: { value: { time: start } } }],
    });
    const club = {
      claims: {
        P115: [
          {
            mainsnak: { datavalue: { value: { id: 'Q_old' } } },
            rank: 'normal',
            qualifiers: qual('+1916-00-00T00:00:00Z'),
          },
          {
            mainsnak: { datavalue: { value: { id: 'Q_new' } } },
            rank: 'normal',
            qualifiers: qual('+1993-00-00T00:00:00Z'),
          },
        ],
      },
    } as Entity;
    // mesmo com o antigo tendo MAIOR capacidade (75k vs 47k)
    expect(pickVenue(club, venues as never)?.qid).toBe('Q_new');
  });

  it('desempata por capacidade e descarta claims `deprecated`', () => {
    const club = {
      claims: {
        P115: [
          { mainsnak: { datavalue: { value: { id: 'Q_old' } } }, rank: 'deprecated' },
          { mainsnak: { datavalue: { value: { id: 'Q_new' } } }, rank: 'normal' },
        ],
      },
    } as Entity;
    expect(pickVenue(club, venues as never)?.qid).toBe('Q_new');
  });
});

describe('claimIds', () => {
  it('extrai os QIDs de uma propriedade', () => {
    expect(claimIds(ent({ P17: [id('Q29')] }), 'P17')).toEqual(['Q29']);
    expect(claimIds(ent({}), 'P17')).toEqual([]);
  });
});

describe('listas curadas (ondas)', () => {
  it('T513 (Bundesliga/Ligue 1) tem os 10 clubes ausentes, com idioma e artigo', () => {
    expect(TARGET_CLUBS_T513).toHaveLength(10);
    for (const t of TARGET_CLUBS_T513) {
      expect(['de', 'fr']).toContain(t.lang);
      expect(t.article.length).toBeGreaterThan(3);
      expect(t.note).toMatch(/Bundesliga|Ligue 1/);
    }
  });

  it('T514 (UCL/UEL/Primeira Liga) tem 14 clubes, com idioma e artigo', () => {
    expect(TARGET_CLUBS_T514).toHaveLength(14);
    for (const t of TARGET_CLUBS_T514) {
      expect(['en', 'pt']).toContain(t.lang);
      expect(t.article.length).toBeGreaterThan(3);
      expect(t.note).toMatch(/UCL|UEL|Primeira Liga/);
    }
  });

  it('T515 (Série B/MLS/Liga MX) tem 57 clubes, com idioma e artigo', () => {
    expect(TARGET_CLUBS_T515).toHaveLength(57);
    for (const t of TARGET_CLUBS_T515) {
      expect(['en', 'pt']).toContain(t.lang);
      expect(t.article.length).toBeGreaterThan(3);
      expect(t.note).toMatch(/Série B|MLS|Liga MX/);
    }
  });

  it('T516 (Sudamericana/Recopa/Mundial) tem 26 clubes, sem país/federação/árbitro', () => {
    expect(TARGET_CLUBS_T516).toHaveLength(26);
    for (const t of TARGET_CLUBS_T516) {
      expect(t.lang).toBe('pt');
      expect(t.note).toMatch(/Sudamericana|Recopa|Mundial/);
      // a curadoria NÃO inclui país, federação nem pessoa
      expect(t.article).not.toMatch(/Venezuela|Asociación del Fútbol|Confederação|FIFA|Tello/);
    }
  });

  it('ALL_TARGET_CLUBS é a união das cinco ondas', () => {
    expect(ALL_TARGET_CLUBS.length).toBe(
      TARGET_CLUBS.length +
        TARGET_CLUBS_T513.length +
        TARGET_CLUBS_T514.length +
        TARGET_CLUBS_T515.length +
        TARGET_CLUBS_T516.length,
    );
  });

  it('não há artigo duplicado dentro da mesma onda', () => {
    const keys = ALL_TARGET_CLUBS.map((t) => `${t.lang}|${t.article}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
