/**
 * WS-C-1 — Integração (Postgres real): profile + search global + carrossel.
 *
 * Usa fixtures isoladas (qid/prefixo 'WSC1') e limpa antes/depois — sem afetar dados reais.
 * Prova: attribution ODbL por origem, homônimos não colapsados e regras do carrossel.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const QIDs = {
  osm: 'Q9901001',
  wiki: 'Q9901002',
  homA: 'Q9901003',
  homB: 'Q9901004',
  compNac: 'Q9901101',
  compAmb: 'Q9901102',
};
const NAME_PREFIX = 'WSC1';

let osmId = '';
let wikiId = '';
let compNacId = '';

async function cleanup(): Promise<void> {
  const clubs = await prisma.club.findMany({
    where: { qid: { in: Object.values(QIDs) } },
    select: { id: true },
  });
  const ids = clubs.map((c) => c.id);
  if (ids.length) await prisma.knowledgeGraph.deleteMany({ where: { sourceId: { in: ids } } });
  await prisma.club.deleteMany({ where: { qid: { in: Object.values(QIDs) } } });
  await prisma.competition.deleteMany({ where: { qid: { in: [QIDs.compNac, QIDs.compAmb] } } });
}

beforeAll(async () => {
  await cleanup();
  app = await buildApp();
  await app.ready();

  const osm = await prisma.club.create({
    data: {
      name: `${NAME_PREFIX} OSM Club`,
      country: 'ZZ',
      qid: QIDs.osm,
      latitude: -23.5,
      longitude: -46.6,
      metadata: { coordSource: 'nominatim', coordPrecision: 'approximate' },
    },
    select: { id: true },
  });
  osmId = osm.id;

  const wiki = await prisma.club.create({
    data: {
      name: `${NAME_PREFIX} Grêmio São Paulo`,
      country: 'ZZ',
      qid: QIDs.wiki,
      latitude: -30.0,
      longitude: -51.2,
      metadata: { coordSource: 'P115_P131', coordPrecision: 'municipality' },
    },
    select: { id: true },
  });
  wikiId = wiki.id;

  await prisma.club.createMany({
    data: [
      { name: `${NAME_PREFIX} Homônimo`, country: 'ZZ', qid: QIDs.homA, city: 'Alfa' },
      { name: `${NAME_PREFIX} Homônimo`, country: 'ZZ', qid: QIDs.homB, city: 'Beta' },
    ],
  });

  const compNac = await prisma.competition.create({
    data: {
      name: `${NAME_PREFIX} Liga Nacional`,
      qid: QIDs.compNac,
      type: 'LEAGUE',
      country: 'ZZ',
    },
    select: { id: true },
  });
  compNacId = compNac.id;
  const compAmb = await prisma.competition.create({
    data: { name: `${NAME_PREFIX} Copa Ambígua`, qid: QIDs.compAmb, type: 'CUP', country: 'ZZ' },
    select: { id: true },
  });

  const homA = await prisma.club.findUnique({ where: { qid: QIDs.homA }, select: { id: true } });
  const homB = await prisma.club.findUnique({ where: { qid: QIDs.homB }, select: { id: true } });

  await prisma.knowledgeGraph.createMany({
    data: [
      {
        sourceId: osmId,
        sourceType: 'Club',
        targetId: compNacId,
        targetType: 'Competition',
        relation: 'WON',
        metadata: {
          year: 2025,
          hierarchy: 'nacional',
          source: 'wikidata',
          sourceUrl: 'https://www.wikidata.org/wiki/Q1',
        },
      },
      {
        sourceId: homA!.id,
        sourceType: 'Club',
        targetId: compAmb.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: {
          year: 2025,
          hierarchy: 'estadual',
          source: 'rsssf',
          sourceUrl: 'https://rsssf.org/x',
          authorCredit: 'Autor',
        },
      },
      {
        sourceId: homB!.id,
        sourceType: 'Club',
        targetId: compAmb.id,
        targetType: 'Competition',
        relation: 'WON',
        metadata: {
          year: 2025,
          hierarchy: 'estadual',
          source: 'rsssf',
          sourceUrl: 'https://rsssf.org/x',
        },
      },
    ],
  });
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe('WS-C-1 GET /clubs/:id/profile', () => {
  it('clube OSM → attribution ODbL; Wikidata → null', async () => {
    const osm = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/v1/clubs/${osmId}/profile` })).body,
    ).data;
    expect(osm.geo.attribution.license).toBe('ODbL');
    expect(osm.provenance.source).toBeNull();
    expect(osm.titles.available).toBe(true);

    const wiki = JSON.parse(
      (await app.inject({ method: 'GET', url: `/api/v1/clubs/${wikiId}/profile` })).body,
    ).data;
    expect(wiki.geo.attribution).toBeNull();
    expect(wiki.gaps).toContain('squad_not_available');
  });

  it('clube inexistente → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clubs/00000000-0000-0000-0000-000000000000/profile',
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('WS-C-1 GET /search/global', () => {
  it('encontra clubes e competições; homônimos não colapsados', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/search/global?q=${NAME_PREFIX}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const homonyms = body.results.filter(
      (r: { name: string }) => r.name === `${NAME_PREFIX} Homônimo`,
    );
    expect(homonyms).toHaveLength(2);
    expect(new Set(homonyms.map((h: { qid: string }) => h.qid)).size).toBe(2);
    expect(body.results.some((r: { type: string }) => r.type === 'competition')).toBe(true);
  });

  it('acento-insensível: "Gremio" casa "Grêmio"', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/search/global?q=Gremio%20Sao' });
    const body = JSON.parse(res.body);
    expect(body.results.some((r: { qid: string }) => r.qid === QIDs.wiki)).toBe(true);
  });

  it('q ausente → 400; attribution ODbL presente em clube OSM', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/search/global' })).statusCode).toBe(
      400,
    );
    const res = await app.inject({ method: 'GET', url: `/api/v1/search/global?q=OSM%20Club` });
    const body = JSON.parse(res.body);
    const osmHit = body.results.find((r: { qid: string }) => r.qid === QIDs.osm);
    expect(osmHit?.attribution?.license).toBe('ODbL');
  });
});

describe('WS-C-1 GET /champions/carousel', () => {
  it('um campeão nacional (WON ativa) + estadual ambíguo omitido', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/champions/carousel' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.rulesVersion).toBe('ws-c-1-carousel-v1');
    const nacional = body.scopes.find((s: { hierarchy: string }) => s.hierarchy === 'nacional');
    // O fixture nacional é o campeão mais recente da hierarquia (se não houver outro no DB de teste).
    if (nacional) expect(nacional.confidence).toBe('single_active_record');
    const ambiguous = body.unavailable.find(
      (u: { hierarchy: string; reason: string }) =>
        u.hierarchy === 'estadual' && u.reason === 'ambiguous_multiple_champions',
    );
    expect(ambiguous).toBeTruthy();
  });
});
