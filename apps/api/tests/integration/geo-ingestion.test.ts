/**
 * T466 — Ingestão geográfica (Country/State/City) — integração SEM rede/banco.
 *
 * Usa um repositório em memória que implementa `GeoRepository` (mesmo contrato do
 * repositório Prisma) para provar: idempotência (re-run ⇒ zero escrita), proveniência
 * obrigatória por registro, vínculo clube→cidade→estado→país e "missing" honesto.
 * Nenhuma escrita em produção: banco e rede nunca são tocados.
 */
import { describe, it, expect } from 'vitest';
import {
  planGeo,
  syncGeo,
  GEO_DATASOURCE,
  type CityCreateInput,
  type ClubGeoUpdate,
  type CountryCreateInput,
  type GeoPlan,
  type GeoRepository,
  type GeoRow,
  type StateCreateInput,
} from '../../src/modules/etl/connectors/wikidata-geo.connector.js';

interface CountryRec {
  id: string;
  iso2: string;
  name: string;
  continent: string | null;
  qid: string | null;
  importedFrom: string;
  importedAt: Date;
  sourceUrl: string;
}
interface StateRec {
  id: string;
  code: string;
  name: string;
  countryId: string;
  qid: string | null;
  importedFrom: string;
  importedAt: Date;
  sourceUrl: string;
}
interface CityRec {
  id: string;
  qid: string | null;
  name: string;
  countryId: string;
  stateId: string | null;
  latitude: number | null;
  longitude: number | null;
  importedFrom: string;
  importedAt: Date;
  sourceUrl: string;
}
interface ClubRec {
  id: string;
  qid: string;
  countryId: string | null;
  stateId: string | null;
  cityId: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface MemRepo extends GeoRepository {
  countries: CountryRec[];
  states: StateRec[];
  cities: CityRec[];
  clubs: ClubRec[];
}

function makeRepo(clubs: ClubRec[] = []): MemRepo {
  const countries: CountryRec[] = [];
  const states: StateRec[] = [];
  const cities: CityRec[] = [];
  let seq = 0;
  return {
    countries,
    states,
    cities,
    clubs,
    async findCountryByIso2(iso2) {
      const c = countries.find((x) => x.iso2 === iso2);
      return c ? { id: c.id, name: c.name, continent: c.continent, qid: c.qid } : null;
    },
    async createCountry(input: CountryCreateInput) {
      const id = 'co-' + ++seq;
      countries.push({ id, ...input });
      return { id };
    },
    async updateCountry(iso2, input: CountryCreateInput) {
      const i = countries.findIndex((x) => x.iso2 === iso2);
      countries[i] = { ...countries[i], ...input };
    },
    async findStateByCode(code) {
      const s = states.find((x) => x.code === code);
      return s ? { id: s.id, name: s.name, countryId: s.countryId, qid: s.qid } : null;
    },
    async createState(input: StateCreateInput) {
      const id = 'st-' + ++seq;
      states.push({ id, ...input });
      return { id };
    },
    async updateState(code, input: StateCreateInput) {
      const i = states.findIndex((x) => x.code === code);
      states[i] = { ...states[i], ...input };
    },
    async findCityByQid(qid) {
      const c = cities.find((x) => x.qid === qid);
      return c ? { id: c.id, name: c.name, countryId: c.countryId, stateId: c.stateId } : null;
    },
    async createCity(input: CityCreateInput) {
      const id = 'ci-' + ++seq;
      cities.push({ id, ...input });
      return { id };
    },
    async updateCity(qid, input: CityCreateInput) {
      const i = cities.findIndex((x) => x.qid === qid);
      cities[i] = { ...cities[i], ...input };
    },
    async findClubByQid(qid) {
      const c = clubs.find((x) => x.qid === qid);
      return c
        ? {
            id: c.id,
            countryId: c.countryId,
            stateId: c.stateId,
            cityId: c.cityId,
            latitude: c.latitude,
            longitude: c.longitude,
          }
        : null;
    },
    async updateClubGeo(clubId: string, update: ClubGeoUpdate) {
      const i = clubs.findIndex((x) => x.id === clubId);
      clubs[i] = { ...clubs[i], ...update };
    },
  };
}

const base: Omit<GeoRow, 'clubQid'> = {
  countryQid: 'Q155',
  countryIso2: 'BR',
  countryName: 'Brazil',
  continent: 'SA',
  adminQid: 'Q8678',
  adminName: 'Rio de Janeiro',
  stateQid: 'Q41428',
  stateName: 'Rio de Janeiro',
  stateCode: 'BR-RJ',
  cityPoint: { lat: -22.9, lng: -43.2 },
  clubPoint: { lat: -22.91, lng: -43.21 },
};

function planOf(rows: GeoRow[]): GeoPlan {
  return planGeo(rows);
}

describe('syncGeo — criação e proveniência', () => {
  it('cria país/estado/cidade e vincula o clube; grava proveniência em cada registro', async () => {
    const repo = makeRepo([
      {
        id: 'c1',
        qid: 'Q100',
        countryId: null,
        stateId: null,
        cityId: null,
        latitude: null,
        longitude: null,
      },
    ]);
    const now = new Date('2026-09-22T00:00:00Z');
    const stats = await syncGeo(repo, planOf([{ ...base, clubQid: 'Q100' }]), now);

    expect(stats.countries.created).toBe(1);
    expect(stats.states.created).toBe(1);
    expect(stats.cities.created).toBe(1);
    expect(stats.links.linked).toBe(1);

    expect(repo.countries[0]).toMatchObject({
      iso2: 'BR',
      continent: 'SA',
      importedFrom: GEO_DATASOURCE,
      sourceUrl: 'https://www.wikidata.org/wiki/Q155',
    });
    expect(repo.states[0].importedFrom).toBe(GEO_DATASOURCE);
    expect(repo.cities[0]).toMatchObject({
      qid: 'Q8678',
      latitude: -22.9,
      longitude: -43.2,
      importedFrom: GEO_DATASOURCE,
    });

    // Hierarquia sem órfão: clube → cidade → estado → país, todos resolvidos.
    const club = repo.clubs[0];
    expect(club.countryId).toBe(repo.countries[0].id);
    expect(club.stateId).toBe(repo.states[0].id);
    expect(club.cityId).toBe(repo.cities[0].id);
    // Coordenada do clube (P625) gravada a partir da fonte.
    expect(club.latitude).toBeCloseTo(-22.91);
    expect(club.longitude).toBeCloseTo(-43.21);
    expect(repo.cities[0].countryId).toBe(repo.countries[0].id);
    expect(repo.cities[0].stateId).toBe(repo.states[0].id);
    expect(repo.states[0].countryId).toBe(repo.countries[0].id);
  });
});

describe('syncGeo — idempotência (re-run ⇒ zero escrita)', () => {
  it('segunda execução idêntica não cria nem atualiza nada', async () => {
    const repo = makeRepo([
      {
        id: 'c1',
        qid: 'Q100',
        countryId: null,
        stateId: null,
        cityId: null,
        latitude: null,
        longitude: null,
      },
    ]);
    const plan = planOf([{ ...base, clubQid: 'Q100' }]);
    const now = new Date('2026-09-22T00:00:00Z');

    await syncGeo(repo, plan, now);
    const second = await syncGeo(repo, plan, new Date('2026-09-22T01:00:00Z'));

    expect(second.countries).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.states).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.cities).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.links).toEqual({ linked: 0, unchanged: 1, missing: 0 });
  });

  it('detecta e conta mudança de nome como update', async () => {
    const repo = makeRepo([
      {
        id: 'c1',
        qid: 'Q100',
        countryId: null,
        stateId: null,
        cityId: null,
        latitude: null,
        longitude: null,
      },
    ]);
    const now = new Date('2026-09-22T00:00:00Z');
    await syncGeo(repo, planOf([{ ...base, clubQid: 'Q100' }]), now);
    const renamed = planOf([{ ...base, clubQid: 'Q100', countryName: 'Brasil' }]);
    const stats = await syncGeo(repo, renamed, now);
    expect(stats.countries.updated).toBe(1);
    expect(repo.countries[0].name).toBe('Brasil');
  });
});

describe('syncGeo — missing honesto (clube ausente não inventa vínculo)', () => {
  it('conta missing quando o clube não existe no repositório', async () => {
    const repo = makeRepo([]);
    const stats = await syncGeo(repo, planOf([{ ...base, clubQid: 'Q404' }]), new Date());
    expect(stats.links.missing).toBe(1);
    expect(stats.links.linked).toBe(0);
  });
});
