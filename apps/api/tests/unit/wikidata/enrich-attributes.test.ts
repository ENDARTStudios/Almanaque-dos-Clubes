import { describe, it, expect } from 'vitest';
import {
  extractCoordinate,
  extractP131Qid,
  extractCityLabel,
  extractFullName,
  isCity,
} from '../../../src/lib/wikidata/enrich-attributes.js';
import type { WikidataEntity } from '../../../src/lib/wikidata/wikidata-client.js';

// WS-D M1a — extratores puros.

const coord = (lat: number, lng: number) => ({
  mainsnak: { datavalue: { value: { latitude: lat, longitude: lng } } },
});
const idClaim = (id: string) => ({ mainsnak: { datavalue: { value: { id } } } });
const ent = (
  claims: Record<string, unknown[]>,
  labels?: Record<string, { value: string }>,
  aliases?: Record<string, Array<{ value: string }>>,
): WikidataEntity => ({ id: 'Q1', claims: claims as never, labels, aliases });

describe('WS-D M1a — extractCoordinate', () => {
  it('P625 presente → lat/lng', () => {
    expect(extractCoordinate(ent({ P625: [coord(-22.9, -43.2)] }))).toEqual({
      lat: -22.9,
      lng: -43.2,
    });
  });
  it('P625 ausente → null', () => {
    expect(extractCoordinate(ent({ P131: [idClaim('Q8678')] }))).toBeNull();
    expect(extractCoordinate(null)).toBeNull();
  });
});

describe('WS-D M1a — P131 / cidade', () => {
  it('extractP131Qid', () => {
    expect(extractP131Qid(ent({ P131: [idClaim('Q8678')] }))).toBe('Q8678');
    expect(extractP131Qid(ent({}))).toBeNull();
  });
  it('isCity: Q515/Q3957/Q1549591 → true; estado → false', () => {
    expect(isCity(ent({ P31: [idClaim('Q515')] }))).toBe(true);
    expect(isCity(ent({ P31: [idClaim('Q3957')] }))).toBe(true);
    expect(isCity(ent({ P31: [idClaim('Q1071')] }))).toBe(false); // subdivisão/estado
    expect(isCity(null)).toBe(false);
  });
  it('extractCityLabel pt → en → null', () => {
    expect(extractCityLabel(ent({}, { pt: { value: 'Rio de Janeiro' } }))).toBe('Rio de Janeiro');
    expect(extractCityLabel(ent({}, { en: { value: 'Rio de Janeiro' } }))).toBe('Rio de Janeiro');
    expect(extractCityLabel(ent({}))).toBeNull();
    expect(extractCityLabel(null)).toBeNull();
  });
});

describe('WS-D M1a — extractFullName', () => {
  it('label pt → en → aliases → null', () => {
    expect(extractFullName(ent({}, { pt: { value: 'Clube de Regatas do Flamengo' } }))).toBe(
      'Clube de Regatas do Flamengo',
    );
    expect(extractFullName(ent({}, { en: { value: 'CR Flamengo' } }))).toBe('CR Flamengo');
    expect(extractFullName(ent({}, undefined, { pt: [{ value: 'Flamengo' }] }))).toBe('Flamengo');
    expect(extractFullName(ent({}))).toBeNull();
    expect(extractFullName(null)).toBeNull();
  });
});
