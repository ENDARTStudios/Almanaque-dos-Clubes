/**
 * T471 onda 1 — Unit: extractors Wikidata + fallback chain com provider fake.
 * Fixtures no formato real Special:EntityData (globecoordinate, P131/P115/P1083).
 */
import { describe, it, expect } from 'vitest';
import {
  extractP625,
  extractQids,
  extractCapacity,
  extractStadium,
  resolveClubGeo,
  type WikidataEntity,
  type WikidataEntities,
} from '../../../src/scripts/enrich-clubs-geo-wikidata.js';

function entityWith(qid: string, claims: WikidataEntity['claims']): WikidataEntity {
  return { labels: { pt: { value: qid } }, claims };
}

const coord = (lat: number, lng: number) => ({
  mainsnak: { datavalue: { value: { latitude: lat, longitude: lng, precision: 0.0001 } } },
});
const itemRef = (qid: string) => ({ mainsnak: { datavalue: { value: { id: qid } } } });
const amountRef = (n: number) => ({ mainsnak: { datavalue: { value: { amount: `+${n}` } } } });

describe('T471 — extractP625', () => {
  it('extrai latitude/longitude válidas', () => {
    const e = entityWith('Q1', { P625: [coord(-23.55, -46.63)] });
    expect(extractP625(e)).toMatchObject({ latitude: -23.55, longitude: -46.63 });
  });

  it('rejeita coordenada fora da faixa (lat > 90 / lng > 180) — sanity', () => {
    expect(extractP625(entityWith('Q1', { P625: [coord(95, 200)] }))).toBeNull();
  });

  it('retorna null sem P625', () => {
    expect(extractP625(entityWith('Q1', {}))).toBeNull();
    expect(extractP625(undefined)).toBeNull();
  });
});

describe('T471 — extractQids / extractCapacity', () => {
  it('extrai QIDs de P131 e P115', () => {
    const e = entityWith('Q1', { P131: [itemRef('Q10'), itemRef('Q20')], P115: [itemRef('Q30')] });
    expect(extractQids(e, 'P131')).toEqual(['Q10', 'Q20']);
    expect(extractQids(e, 'P115')).toEqual(['Q30']);
  });

  it('extrai capacidade P1083 como número', () => {
    expect(extractCapacity(entityWith('Q1', { P1083: [amountRef(43000)] }))).toBe(43000);
    expect(extractCapacity(entityWith('Q1', {}))).toBeNull();
  });
});

describe('T471 — resolveClubGeo (fallback chain P625 → P131 → P115)', () => {
  const clubDirect = entityWith('Qclub', { P625: [coord(-10, -20)] });

  it('P625 direto vence sem consultar provider', async () => {
    let called = false;
    const provider = async () => {
      called = true;
      return {};
    };
    const r = await resolveClubGeo('Qclub', { Qclub: clubDirect }, provider);
    expect(r.source).toBe('P625');
    expect(called).toBe(false);
  });

  it('sem P625 → P131 do território com coordenada', async () => {
    const club = entityWith('Qclub', { P131: [itemRef('Qcity')] });
    const entities: WikidataEntities = { Qcity: entityWith('Qcity', { P625: [coord(1, 2)] }) };
    const r = await resolveClubGeo(
      'Qclub',
      { Qclub: club, Qcity: entities.Qcity },
      async (qids) => {
        expect(qids).toEqual(['Qcity']);
        return entities;
      },
    );
    expect(r.source).toBe('P131');
    expect(r.latitude).toBe(1);
  });

  it('sem P131 com coords → P115 (venue) com coords + nome/capacidade', async () => {
    const club = entityWith('Qclub', { P115: [itemRef('Qstadium')] });
    const stadium = entityWith('Qstadium', {
      P625: [coord(3, 4)],
      P1083: [amountRef(42000)],
    });
    const r = await resolveClubGeo('Qclub', { Qclub: club, Qstadium: stadium }, async () => ({
      Qstadium: stadium,
    }));
    expect(r.source).toBe('P115');
    expect(r.venueQid).toBe('Qstadium');
    expect(r.latitude).toBe(3);
  });

  it('nada resolvível → source null (gap declarado, nunca inventado)', async () => {
    const club = entityWith('Qclub', {});
    const r = await resolveClubGeo('Qclub', { Qclub: club }, async () => ({}));
    expect(r.source).toBeNull();
  });
});

describe('T471 — extractStadium', () => {
  it('extrai name/coords/capacity e vincula clubId; dedupe por QID é responsabilidade do chamador', () => {
    const stadium = entityWith('Qstadium', {
      P625: [coord(-5, -6)],
      P1083: [amountRef(30000)],
    });
    const row = extractStadium('Qstadium', stadium, 'club-1');
    expect(row).toMatchObject({
      qid: 'Qstadium',
      name: 'Qstadium',
      latitude: -5,
      longitude: -6,
      capacity: 30000,
      clubId: 'club-1',
    });
  });

  it('entidade vazia → null (nada inventado)', () => {
    expect(extractStadium('Qx', undefined, 'club-1')).toBeNull();
  });
});
