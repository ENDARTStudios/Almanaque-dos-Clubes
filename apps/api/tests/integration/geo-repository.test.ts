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

const ISO = 'ZZ';
const CODE = 'ZZ-01';
const CITY_QID = 'Q9999001';
const CLUB_QID = 'Q9999002';
const CLUB_NAME = 'T466 Test Club';

async function cleanup(): Promise<void> {
  await prisma.club.deleteMany({ where: { qid: CLUB_QID } });
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

    const second = await syncGeo(prismaGeoRepository(), plan, new Date());
    expect(second.countries).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.states).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.cities).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(second.links).toEqual({ linked: 0, unchanged: 1, missing: 0 });
  });
});
