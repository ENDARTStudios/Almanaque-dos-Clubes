/**
 * T449EN C2 — `deletedAt` = remoção por admin/ruído (NÃO clube extinto).
 * Prova que clube soft-deleted NÃO aparece em NENHUMA superfície pública:
 * /clubs (lista), count, /clubs/:id, busca, geo-stats.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { cache } from '../../src/services/cache.js';

let app: FastifyInstance;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let dbOk = true;
const ISO = 'GX';
const activeName = `EN Active ${randomUUID().slice(0, 8)}`;
const deletedName = `EN Deleted ${randomUUID().slice(0, 8)}`;
let deletedId = '';

async function cleanup(): Promise<void> {
  await prisma.club.deleteMany({ where: { name: { in: [activeName, deletedName] } } });
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
    if (process.env.TEST_REQUIRE_DB === 'true') throw new Error('[R1] banco ausente no CI');
    return;
  }
  await cleanup();
  const country = await prisma.country.create({
    data: { iso2: ISO, name: 'T449EN Land', continent: 'EU' },
  });
  await prisma.club.create({ data: { name: activeName, country: ISO, countryId: country.id } });
  const del = await prisma.club.create({
    data: { name: deletedName, country: ISO, countryId: country.id, deletedAt: new Date() },
  });
  deletedId = del.id;
});

afterAll(async () => {
  if (dbOk) await cleanup();
  await app.close();
});

describe('T449EN C2 — soft-deleted fora das views públicas', () => {
  it('não aparece na lista (e o count reflete)', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs?country=${ISO}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: Array<{ name: string }>; total: number };
    expect(body.data.some((c) => c.name === deletedName)).toBe(false);
    expect(body.data.some((c) => c.name === activeName)).toBe(true);
    expect(body.total).toBe(1);
  });

  it('detalhe público do soft-deleted → 404', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/clubs/${deletedId}` });
    expect(res.statusCode).toBe(404);
  });

  it('busca não encontra o soft-deleted', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs?search=${encodeURIComponent(deletedName)}`,
    });
    const body = JSON.parse(res.body) as { data: Array<{ name: string }> };
    expect(body.data.some((c) => c.name === deletedName)).toBe(false);
  });

  it('geo-stats não conta o soft-deleted', async () => {
    if (!dbOk) return;
    // geo-stats é cacheado (TTL curto); invalida a chave exata p/ verificar o dado vivo.
    await cache.invalidate('clubs:geo-stats');
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs/geo-stats' });
    const body = JSON.parse(res.body) as {
      data: { continents: Array<{ countries: Array<{ iso2: string; clubs: number }> }> };
    };
    const gx = body.data.continents.flatMap((c) => c.countries).find((c) => c.iso2 === ISO);
    expect(gx?.clubs).toBe(1); // apenas o ativo
  });
});
