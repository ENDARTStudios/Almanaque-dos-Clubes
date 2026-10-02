import { describe, it, expect } from 'vitest';
import { countryIso, normalizeCountries, normalizeCountry, parseGeoJson } from '@/lib/map-geojson';

// WS-C-3 FASE 1 — parser/normalizador GeoJSON (network-free).

const fc = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { iso_a2: 'BR', iso_a3: 'BRA', NAME: 'Brasil' },
      geometry: { type: 'Polygon', coordinates: [] },
    },
    {
      type: 'Feature',
      properties: { ISO_A2: '-99', iso_a3: 'ARG', name: 'Argentina' },
      geometry: null,
    },
    { type: 'Feature', properties: { ADM0_A3: 'USA', NAME: 'United States' }, geometry: null },
  ],
};

describe('parseGeoJson', () => {
  it('valida FeatureCollection e normaliza features', () => {
    const out = parseGeoJson(fc);
    expect(out).toHaveLength(3);
    expect(out[0].properties.iso_a2).toBe('BR');
  });
  it('rejeita shape inválido', () => {
    expect(() => parseGeoJson(null)).toThrow();
    expect(() => parseGeoJson({ type: 'Feature' })).toThrow();
    expect(() => parseGeoJson({ type: 'FeatureCollection' })).toThrow();
  });
  it('declara TopoJSON não suportado (sem inventar)', () => {
    expect(() => parseGeoJson({ type: 'Topology', objects: {} })).toThrow(/TopoJSON/);
  });
});

describe('countryIso / normalizeCountry', () => {
  it('usa iso_a2; ignora -99 e cai para iso_a3', () => {
    expect(countryIso({ iso_a2: 'BR' })).toBe('BR');
    expect(countryIso({ iso_a2: '-99', iso_a3: 'ARG' })).toBe('ARG');
    expect(countryIso({ ADM0_A3: 'USA' })).toBe('USA');
    expect(countryIso({})).toBeNull();
  });
  it('normaliza iso2/iso3/name', () => {
    expect(
      normalizeCountry({
        type: 'Feature',
        properties: { ISO_A2: 'PT', ADM0_A3: 'PRT', NAME: 'Portugal' },
        geometry: null,
      }),
    ).toEqual({
      iso2: 'PT',
      iso3: 'PRT',
      name: 'Portugal',
    });
  });
});

describe('normalizeCountries', () => {
  it('mapeia todas as features preservando a ordem', () => {
    const out = normalizeCountries(fc);
    expect(out.map((c) => c.iso2)).toEqual(['BR', null, null]);
    expect(out.map((c) => c.iso3)).toEqual(['BRA', 'ARG', 'USA']);
  });
});
