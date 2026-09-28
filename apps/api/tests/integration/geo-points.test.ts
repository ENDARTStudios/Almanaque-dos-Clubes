/**
 * WS-C-3 FASE 2 — Integração (Postgres real): GET /geo/points.
 * Fixtures isoladas ('WSC3'); limpa antes/depois. Prova attribution por origem, exclusão de
 * clubes sem coord e homônimos separados. Zero escrita.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const QIDS = {
  osm: 'Q9910001',
  wiki: 'Q9910002',
  nocoord: 'Q9910003',
  homA: 'Q9910004',
  homB: 'Q9910005',
};
const PREFIX = 'WSC3';

async function cleanup(): Promise<void> {
  await prisma.club.deleteMany({ where: { qid: { in: Object.values(QIDS) } } });
}

beforeAll(async () => {
  await cleanup();
  app = await buildApp();
  await app.ready();
  await prisma.club.createMany({
    data: [
      {
        name: `${PREFIX} OSM`,
        country: 'ZZ',
        qid: QIDS.osm,
        latitude: -23.5,
        longitude: -46.6,
        city: 'SP',
        metadata: { coordSource: 'nominatim' },
      },
      {
        name: `${PREFIX} Wiki`,
        country: 'ZZ',
        qid: QIDS.wiki,
        latitude: -30.0,
        longitude: -51.2,
        city: 'POA',
        metadata: { coordSource: 'P115_P131' },
      },
      { name: `${PREFIX} SemCoord`, country: 'ZZ', qid: QIDS.nocoord, city: 'X' },
      {
        name: `${PREFIX} Homônimo`,
        country: 'ZZ',
        qid: QIDS.homA,
        city: 'Alfa',
        latitude: 1.0,
        longitude: 1.0,
      },
      {
        name: `${PREFIX} Homônimo`,
        country: 'ZZ',
        qid: QIDS.homB,
        city: 'Beta',
        latitude: 2.0,
        longitude: 2.0,
      },
    ],
  });
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe('WS-C-3 FASE 2 GET /geo/points', () => {
  it('retorna features com atribuição; sem-coord fora; homônimos separados', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/geo/points?country=ZZ&limit=200' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.rulesVersion).toBe('ws-c3-geo-v1');
    expect(body.attributions.osm).toMatch(/OpenStreetMap/);

    const byQid = new Map(
      body.features.map((f: { qid: string; attribution: { license: string } | null }) => [
        f.qid,
        f,
      ]),
    );
    expect(byQid.get(QIDS.osm).attribution.license).toBe('ODbL');
    expect(byQid.get(QIDS.wiki).attribution).toBeNull();
    expect(byQid.has(QIDS.nocoord)).toBe(false); // sem coord não vira ponto
    expect(byQid.has(QIDS.homA)).toBe(true);
    expect(byQid.has(QIDS.homB)).toBe(true); // homônimos não colapsados
    expect(body.withoutLocation.count).toBeGreaterThanOrEqual(1);
    expect(body.limitations).toContain('clubs_without_coordinates_are_not_plotted');
  });

  it('bbox filtra por viewport', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/geo/points?country=ZZ&minLat=-25&maxLat=-20&minLng=-50&maxLng=-40',
    });
    const body = JSON.parse(res.body);
    expect(body.features.every((f: { lat: number }) => f.lat >= -25 && f.lat <= -20)).toBe(true);
    expect(body.features.some((f: { qid: string }) => f.qid === QIDS.osm)).toBe(true);
  });

  it('parâmetros inválidos → 400', async () => {
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/geo/points?country=BRA' })).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/geo/points?minLat=-20&maxLat=-30&minLng=0&maxLng=1',
        })
      ).statusCode,
    ).toBe(400);
  });
});
