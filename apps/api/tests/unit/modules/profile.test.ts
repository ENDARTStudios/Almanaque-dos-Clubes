import { describe, it, expect } from 'vitest';
import {
  buildGeo,
  buildProfile,
  buildTitlesSection,
  deriveProvenance,
  PROFILE_GAPS,
  type ProfileClubInput,
} from '../../../src/modules/clubs/profile.service.js';
import type { ClubGeoView } from '../../../src/modules/clubs/repository.js';

// WS-C-1 — perfil consolidado: atribuição ODbL, proveniência e gaps (vazio-honesto).

function club(over: Partial<ProfileClubInput> = {}): ProfileClubInput {
  return {
    id: 'c1',
    qid: 'Q1',
    name: 'Clube Teste',
    fullName: 'Clube Teste Futebol',
    shortName: null,
    status: 'ACTIVE',
    country: 'BR',
    state: 'SP',
    city: 'São Paulo',
    foundedYear: 1900,
    latitude: -23.5,
    longitude: -46.6,
    sourceUrl: 'https://www.wikidata.org/wiki/Q1',
    importedFrom: 'wikidata-expansion-v1',
    importedAt: new Date('2026-01-02T03:04:05Z'),
    metadata: null,
    ...over,
  };
}

const geoView: ClubGeoView = {
  country: null,
  state: null,
  city: null,
  coordinates: { latitude: -23.5, longitude: -46.6 },
  attribution: null,
};

describe('deriveProvenance', () => {
  it('detecta wikidata/rsssf/seed pelo importedFrom', () => {
    expect(
      deriveProvenance({ sourceUrl: 'u', importedFrom: 'wikidata-x', importedAt: null }).source,
    ).toBe('wikidata');
    expect(
      deriveProvenance({ sourceUrl: 'u', importedFrom: 'rsssf', importedAt: null }).source,
    ).toBe('rsssf');
    expect(
      deriveProvenance({ sourceUrl: 'u', importedFrom: 'my-seed-pack', importedAt: null }).source,
    ).toBe('seed');
    expect(
      deriveProvenance({ sourceUrl: null, importedFrom: null, importedAt: null }).source,
    ).toBeNull();
  });
  it('serializa retrievedAt em ISO', () => {
    const p = deriveProvenance({
      sourceUrl: null,
      importedFrom: null,
      importedAt: new Date('2026-01-02T03:04:05Z'),
    });
    expect(p.retrievedAt).toBe('2026-01-02T03:04:05.000Z');
  });
});

describe('buildGeo', () => {
  it('coordenada Nominatim → attribution ODbL', () => {
    const g = buildGeo(
      {
        latitude: 1,
        longitude: 2,
        metadata: { coordSource: 'nominatim', coordPrecision: 'approximate' },
      },
      geoView,
    );
    expect(g.coordSource).toBe('nominatim');
    expect(g.attribution?.license).toBe('ODbL');
  });
  it('coordenada Wikidata → attribution null', () => {
    const g = buildGeo(
      { latitude: 1, longitude: 2, metadata: { coordSource: 'P115_P131' } },
      geoView,
    );
    expect(g.attribution).toBeNull();
  });
});

describe('buildTitlesSection', () => {
  it('sem títulos → available=false + limitação', () => {
    expect(buildTitlesSection([])).toEqual({
      available: false,
      items: [],
      limitations: ['no_provenanced_titles'],
    });
  });
});

describe('buildProfile', () => {
  it('nunca inventa: sem títulos/rankings/competições → available=false e gaps declarados', () => {
    const p = buildProfile(club(), geoView, [], [], [], []);
    expect(p.titles.available).toBe(false);
    expect(p.rankings.available).toBe(false);
    expect(p.competitions.available).toBe(false);
    expect(p.related.available).toBe(false);
    for (const g of PROFILE_GAPS) expect(p.gaps).toContain(g);
    expect(p.gaps).toContain('history_not_available');
    expect(p.gaps).toContain('squad_not_available');
  });

  it('preserva identidade e proveniência', () => {
    const p = buildProfile(club(), geoView, [], [], [], []);
    expect(p.qid).toBe('Q1');
    expect(p.provenance.source).toBe('wikidata');
    expect(p.provenance.sourceUrl).toBe('https://www.wikidata.org/wiki/Q1');
  });
});
