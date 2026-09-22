/**
 * T467 — `/clubs/geo-stats` (agregação derivada) + filtro por hierarquia geo.
 * Autocontido: cria país/estado/clube com continente e limpa ao final.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

let app: FastifyInstance;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let dbOk = true;
const ISO = 'ZZ';
const CODE = 'ZZ-01';
const clubName = `T467 Test Club ${Date.now()}`;
let stateId = '';

async function cleanup(): Promise<void> {
  await prisma.club.deleteMany({ where: { name: clubName } });
  await prisma.state.deleteMany({ where: { code: CODE } });
  await prisma.country.deleteMany({ where: { iso2: ISO } });
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
    return;
  }
  await cleanup();
  const country = await prisma.country.create({
    data: { iso2: ISO, name: 'T467 Land', continent: 'EU', qid: `Q${randomUUID().slice(0, 8)}` },
  });
  const state = await prisma.state.create({
    data: { code: CODE, name: 'T467 State', countryId: country.id },
  });
  stateId = state.id;
  await prisma.club.create({
    data: { name: clubName, country: ISO, countryId: country.id, stateId: state.id },
  });
});

afterAll(async () => {
  if (dbOk) await cleanup();
  await app.close();
});

describe('T467 — /clubs/geo-stats', () => {
  it('retorna COUNT derivado por continente→país→estado', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs/geo-stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: {
        source: string;
        totals: { clubsWithCountry: number };
        continents: Array<{
          code: string;
          countries: Array<{
            iso2: string;
            clubs: number;
            states: Array<{ code: string; clubs: number }>;
          }>;
        }>;
      };
    };
    expect(body.data.source).toBe('derived');
    expect(body.data.totals.clubsWithCountry).toBeGreaterThanOrEqual(1);
    const zz = body.data.continents
      .find((c) => c.code === 'EU')
      ?.countries.find((c) => c.iso2 === ISO);
    expect(zz?.clubs).toBeGreaterThanOrEqual(1);
    expect(zz?.states.find((s) => s.code === CODE)?.clubs).toBe(1);
  });

  it('filtra /clubs por stateId (hierarquia geo)', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs?stateId=${stateId}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: Array<{ name: string }>; total: number };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data.some((c) => c.name === clubName)).toBe(true);
  });
});
