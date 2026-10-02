import { describe, it, expect } from 'vitest';
import {
  clampGeoLimit,
  GEO_ATTRIBUTIONS,
  GEO_DEFAULT_LIMIT,
  GEO_MAX_LIMIT,
  isValidBbox,
  isValidCountry,
  mapGeoFeature,
} from '../../../src/modules/geo/geo.service.js';

// WS-C-3 FASE 2 — mappers/validadores puros do endpoint geo.

describe('clampGeoLimit', () => {
  it('default, máx e mín', () => {
    expect(clampGeoLimit(undefined)).toBe(GEO_DEFAULT_LIMIT);
    expect(clampGeoLimit(99999)).toBe(GEO_MAX_LIMIT);
    expect(clampGeoLimit(0)).toBe(GEO_DEFAULT_LIMIT);
    expect(clampGeoLimit(10)).toBe(10);
  });
});

describe('isValidCountry', () => {
  it('aceita ISO2/ausente e rejeita o resto', () => {
    expect(isValidCountry('BR')).toBe(true);
    expect(isValidCountry('pt')).toBe(true);
    expect(isValidCountry(undefined)).toBe(true);
    expect(isValidCountry('BRA')).toBe(false);
    expect(isValidCountry('1')).toBe(false);
  });
});

describe('isValidBbox', () => {
  it('valida ordem e faixas', () => {
    expect(isValidBbox({ minLat: -30, maxLat: -20, minLng: -50, maxLng: -40 })).toBe(true);
    expect(isValidBbox({ minLat: -20, maxLat: -30, minLng: -50, maxLng: -40 })).toBe(false);
    expect(isValidBbox({ minLat: -100, maxLat: 0, minLng: 0, maxLng: 10 })).toBe(false);
    expect(isValidBbox(null)).toBe(false);
    expect(isValidBbox({ minLat: 'x' })).toBe(false);
  });
});

describe('mapGeoFeature', () => {
  const base = {
    id: 'c1',
    qid: 'Q1',
    name: 'Clube',
    city: 'Cidade',
    state: 'SP',
    country: 'BR',
    latitude: -23.5,
    longitude: -46.6,
  };
  it('OSM/Nominatim → attribution ODbL', () => {
    const f = mapGeoFeature({ ...base, metadata: { coordSource: 'nominatim' } });
    expect(f.attribution?.license).toBe('ODbL');
    expect(f.coordSource).toBe('nominatim');
  });
  it('Wikidata → attribution null (não mistura ODbL)', () => {
    expect(
      mapGeoFeature({ ...base, metadata: { coordSource: 'P115_P131' } }).attribution,
    ).toBeNull();
  });
});

describe('GEO_ATTRIBUTIONS', () => {
  it('tem as 4 fontes com licenças corretas', () => {
    expect(GEO_ATTRIBUTIONS.osm).toMatch(/OpenStreetMap/);
    expect(GEO_ATTRIBUTIONS.wikidata).toBe('Wikidata CC0');
    expect(GEO_ATTRIBUTIONS.naturalEarth).toMatch(/Natural Earth/);
    expect(GEO_ATTRIBUTIONS.rsssf).toMatch(/RSSSF/);
  });
});
