/**
 * T466 — Repositório Prisma da geografia (Postgres real, padrão champions.test).
 *
 * Prova: criação da hierarquia, vínculo clube→cidade→estado→país e IDEMPOTÊNCIA
 * (re-run ⇒ zero escrita) contra o banco de teste do CI. Usa chaves ZZ isoladas
 * e limpa antes/depois (sem afetar dados reais).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { planGeo, syncGeo } from '../../src/modules/etl/connectors/wikidata-geo.connector.js';
import { prismaGeoRepository } from '../../src/modules/etl/geo.repository.js';
import { clubsRepository } from '../../src/modules/clubs/repository.js';
import { OSM_GEO_ATTRIBUTION } from '../../src/lib/geocoding/geo-attribution.js';

const ISO = 'ZZ';
const CODE = 'ZZ-01';
const CITY_QID = 'Q9999001';
const CLUB_QID = 'Q9999002';
const CLUB_NAME = 'T466 Test Club';
const OSM_CLUB_QID = 'Q9999010';
const WIKI_CLUB_QID = 'Q9999011';

async function cleanup(): Promise<void> {
  await prisma.club.deleteMany({ where: { qid: { in: [CLUB_QID, OSM_CLUB_QID, WIKI_CLUB_QID] } } });
  await prisma.city.deleteMany({ where: { qid: CITY_QID } });
  await prisma.state.deleteMany({ where: { code: CODE } });
  await prisma.country.deleteMany({ where: { iso2: ISO } });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('T466 — prismaGeoRepository + syncGeo (Postgres real)', () => {
  it('cria hierarquia, vincula o clube e é idempotente na 2ª execução', async () => {
    await prisma.club.create({ data: { name: CLUB_NAME, country: ISO, qid: CLUB_QID } });

    const plan = planGeo([
      {
        clubQid: CLUB_QID,
        countryQid: 'Q9999000',
        countryIso2: ISO,
        countryName: 'Testland',
        continent: 'EU',
        adminQid: CITY_QID,
        adminName: 'Testville',
        stateQid: 'Q9999003',
        stateName: 'Testshire',
        stateCode: CODE,
        cityPoint: { lat: 1.5, lng: 2.5 },
        clubPoint: { lat: 3.5, lng: 4.5 },
      },
    ]);

    const first = await syncGeo(prismaGeoRepository(), plan, new Date());
    expect(first.countries.created).toBe(1);
    expect(first.states.created).toBe(1);
    expect(first.cities.created).toBe(1);
    expect(first.links.linked).toBe(1);

    const linked = await prisma.club.findUnique({
      where: { qid: CLUB_QID },
      select: {
        latitude: true,
        longitude: true,
        countryRef: { select: { iso2: true, name: true } },
        stateRef: { select: { code: true } },
        cityRef: { select: { qid: true, latitude: true, longitude: true, importedFrom: true } },
      },
    });
    expect(linked?.countryRef?.iso2).toBe(ISO);
    expect(linked?.stateRef?.code).toBe(CODE);
    expect(linked?.cityRef?.qid).toBe(CITY_QID);
    expect(linked?.cityRef?.latitude).toBeCloseTo(1.5);
    expect(linked?.cityRef?.importedFrom).toBe('wikidata-geo');
    // Coordenada P625 do clube gravada pelo mesmo seed.
    expect(linked?.latitude).toBeCloseTo(3.5);
    expect(linked?.longitude).toBeCloseTo(4.5);

    const second = await syncGeo(prismaGeoRepository(), plan, new Date());
    expect(second.countries).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.states).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.cities).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.links).toEqual({ linked: 0, unchanged: 1, missing: 0 });
  });
});

describe('WS-D M1a-3 — attribuição geo por origem (Postgres real)', () => {
  it('coordenada Nominatim/OSM → attribution ODbL; Wikidata → null', async () => {
    const osm = await prisma.club.create({
      data: {
        name: 'M1a3 OSM Club',
        country: ISO,
        qid: OSM_CLUB_QID,
        latitude: 1.1,
        longitude: 2.2,
        metadata: { coordSource: 'nominatim', coordPrecision: 'approximate' },
      },
      select: { id: true },
    });
    const wiki = await prisma.club.create({
      data: {
        name: 'M1a3 Wiki Club',
        country: ISO,
        qid: WIKI_CLUB_QID,
        latitude: 3.3,
        longitude: 4.4,
        metadata: { coordSource: 'P115_P131', coordPrecision: 'municipality' },
      },
      select: { id: true },
    });

    const osmGeo = await clubsRepository.findGeoById(osm.id);
    expect(osmGeo?.coordinates.latitude).toBeCloseTo(1.1);
    expect(osmGeo?.attribution).toEqual(OSM_GEO_ATTRIBUTION);

    const wikiGeo = await clubsRepository.findGeoById(wiki.id);
    expect(wikiGeo?.attribution).toBeNull();
  });
});
