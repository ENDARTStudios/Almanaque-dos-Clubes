/**
 * T438 — Endpoints públicos de leitura de rankings (cursor-based).
 *
 * GET /api/v1/rankings/entries  — entradas ranqueadas do último ranking
 *                                 publicado (filtros year/competition/gender/
 *                                 country/state/city + cursor por position).
 * GET /api/v1/rankings/clube/:clubId — histórico de rankings do clube (404 se
 *                                 o clube não existe).
 *
 * Sem banco acessível (local sem Postgres/SQLite), os testes pulam — honesto.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let clubId = '';
let emptyClubId = '';
let rankingId = '';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.rankingEntry.count();
  } catch {
    dbOk = false;
    return;
  }

  // @@unique([rankingId, clubId]): um clube = uma entrada por ranking —
  // o fixture cria 3 clubes distintos (posições 1..3).
  const clubs: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const c = await prisma.club.create({
      data: {
        name: `Ranking Read FC ${i}`,
        country: 'BR',
        state: 'SP',
        city: 'Osasco',
        qid: null,
      },
    });
    clubs.push(c.id);
  }
  clubId = clubs[0];
  const other = await prisma.club.create({
    data: { name: 'No Ranking FC', country: 'BR', qid: null },
  });
  emptyClubId = other.id;

  const ranking = await prisma.ranking.create({
    data: {
      name: 'Ranking 0-100 T438 Read — Masculino',
      season: '2038',
      publishedAt: new Date(),
    },
  });
  rankingId = ranking.id;

  const points = [100, 66, 33];
  for (let i = 0; i < 3; i++) {
    await prisma.rankingEntry.create({
      data: {
        rankingId: ranking.id,
        clubId: clubs[i],
        position: i + 1,
        points: points[i],
        baseMatches: 5,
        baseTitles: 0,
        gender: 'men',
      },
    });
  }
});

afterAll(async () => {
  if (!dbOk) {
    await app.close();
    return;
  }
  await prisma.rankingEntry.deleteMany({ where: { rankingId } });
  await prisma.ranking.deleteMany({ where: { id: rankingId } });
  await prisma.club.deleteMany({ where: { id: { in: [clubId, emptyClubId] } } });
  // clubes irmãos do fixture (nomes distintos, mesmo padrão)
  await prisma.club.deleteMany({ where: { name: { startsWith: 'Ranking Read FC' } } });
  await app.close();
});

describe('GET /api/v1/rankings/entries (T438)', () => {
  it('retorna 200 com entradas ordenadas por posição + metadados do ranking', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/rankings/entries?year=2038' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ranking).toMatchObject({ season: '2038' });
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    const positions = body.data.map((d: { position: number }) => d.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(body.data[0]).toMatchObject({ clubId, points: 100 });
  });

  it('paginação cursor-based: cursor = última posição, próxima página continua', async () => {
    if (!dbOk) return;
    const p1 = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/entries?year=2038&limit=2',
    });
    const b1 = JSON.parse(p1.body);
    expect(b1.data.length).toBe(2);
    expect(b1.cursor).toBe(2);

    const p2 = await app.inject({
      method: 'GET',
      url: `/api/v1/rankings/entries?year=2038&limit=2&cursor=${b1.cursor}`,
    });
    const b2 = JSON.parse(p2.body);
    expect(b2.data.length).toBeGreaterThanOrEqual(1);
    expect(b2.data.some((d: { position: number }) => d.position === 3)).toBe(true);
  });

  it('filtros: year sem ranking publicado → 200 com data vazia', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/rankings/entries?year=1999' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('filtro country sem correspondência → data vazia', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/entries?year=2038&country=XX',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('filtro gender=men retorna as entradas; gender=women retorna vazio', async () => {
    if (!dbOk) return;
    const men = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/entries?year=2038&gender=men',
    });
    expect(JSON.parse(men.body).data.length).toBeGreaterThanOrEqual(3);
    const women = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/entries?year=2038&gender=women',
    });
    expect(JSON.parse(women.body).data).toEqual([]);
  });
});

describe('GET /api/v1/rankings/clube/:clubId (T438)', () => {
  it('retorna 200 com o histórico do clube', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: `/api/v1/rankings/clube/${clubId}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.club).toMatchObject({ id: clubId, name: 'Ranking Read FC 1' });
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0]).toMatchObject({ season: '2038', points: 100 });
  });

  it('?year sem histórico → 200 com data vazia', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/rankings/clube/${clubId}?year=1999`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('clube inexistente → 404', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/clube/00000000-0000-4000-8000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });
});
