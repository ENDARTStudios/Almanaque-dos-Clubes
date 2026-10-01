/**
 * WS-C-6 — Favoritos: lista com totalTitles/paginação e feed de conquistas.
 * Fluxo completo (favoritar → listar → feed → remover), isolamento entre
 * usuários e ordenação por ano. Padrão T439 (buildApp + JWT de teste);
 * idempotência/soft-delete/RLS deny já cobertos em favorites.test.ts (T439).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userA = '';
let userB = '';
let clubA1 = '';
let clubA2 = '';
let compId = '';
let tokenA = '';
let tokenB = '';

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function get(url: string, token: string) {
  return app.inject({ method: 'GET', url, headers: authHeader(token) });
}

function post(url: string, token: string, payload?: unknown) {
  return app.inject({
    method: 'POST',
    url,
    payload,
    headers: {
      ...authHeader(token),
      'x-csrf-token': generateCsrfToken('test-favorites-feed'),
    },
  });
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.favorite.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  const suffix = Date.now();
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: `favfeed-a-${suffix}@test.local`, passwordHash: 'x' } }),
    prisma.user.create({ data: { email: `favfeed-b-${suffix}@test.local`, passwordHash: 'x' } }),
  ]);
  userA = a.id;
  userB = b.id;

  const comp = await prisma.competition.create({
    data: { name: `WSC6 Cup ${suffix}`, qid: null, country: 'ZZ', type: 'CUP' },
    select: { id: true },
  });
  compId = comp.id;

  const c1 = await prisma.club.create({
    data: { name: `WSC6 Alfa ${suffix}`, country: 'ZZ', qid: null, city: 'Cidade' },
  });
  const c2 = await prisma.club.create({
    data: { name: `WSC6 Beta ${suffix}`, country: 'ZZ', qid: null, city: 'Cidade' },
  });
  clubA1 = c1.id;
  clubA2 = c2.id;

  const provenance = { dataSource: 'wikidata', sourceUrl: 'https://www.wikidata.org/wiki/WSC6' };
  await prisma.knowledgeGraph.createMany({
    data: [
      // Alfa campeão 2020 e 2023 → feed ordena 2023 primeiro
      { sourceId: c1.id, sourceType: 'Club', targetId: comp.id, targetType: 'Competition', relation: 'WON', metadata: { year: 2020, hierarchy: 'nacional', ...provenance } },
      { sourceId: c1.id, sourceType: 'Club', targetId: comp.id, targetType: 'Competition', relation: 'WON', metadata: { year: 2023, hierarchy: 'nacional', ...provenance } },
      // Beta campeão 2021
      { sourceId: c2.id, sourceType: 'Club', targetId: comp.id, targetType: 'Competition', relation: 'WON', metadata: { year: 2021, hierarchy: 'nacional', ...provenance } },
    ],
  });

  tokenA = app.jwt.sign({ sub: userA, email: a.email, roles: [], permissions: [], type: 'access' });
  tokenB = app.jwt.sign({ sub: userB, email: b.email, roles: [], permissions: [], type: 'access' });

  // A favorita Alfa e Beta; B favorita Beta (isolamento no feed)
  await post('/api/v1/favorites', tokenA, { clubId: c1.id });
  await post('/api/v1/favorites', tokenA, { clubId: c2.id });
  await post('/api/v1/favorites', tokenB, { clubId: c2.id });
});

afterAll(async () => {
  if (dbOk) {
    const clubIds = [clubA1, clubA2].filter(Boolean);
    await prisma.knowledgeGraph.deleteMany({
      where: { OR: [{ sourceId: { in: clubIds } }, { targetId: { in: clubIds } }, { sourceId: compId }, { targetId: compId }] },
    });
    await prisma.favorite.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.club.deleteMany({ where: { id: { in: clubIds } } });
    await prisma.competition.deleteMany({ where: { id: compId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  }
  await app.close();
});

describe('WS-C-6 — GET /favorites (totalTitles + paginação)', () => {
  it('lista com qid, totalTitles e total; paginação offset-based', { timeout: 20_000 }, async () => {
    const res = await get('/api/v1/favorites', tokenA);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
    const alfa = body.data.find((f: { clubId: string }) => f.clubId === clubA1);
    expect(alfa.totalTitles).toBe(2);
    const beta = body.data.find((f: { clubId: string }) => f.clubId === clubA2);
    expect(beta.totalTitles).toBe(1);

    const page = await get('/api/v1/favorites?limit=1&offset=1', tokenA);
    const pbody = JSON.parse(page.body);
    expect(pbody.data).toHaveLength(1);
    expect(pbody.total).toBe(2);
    expect(pbody.offset).toBe(1);
  });

  it('fluxo completo: remover favorito tira do total e do totalTitles', { timeout: 20_000 }, async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/${clubA2}`,
      headers: { ...authHeader(tokenA), 'x-csrf-token': generateCsrfToken('test-favorites-feed') },
    });
    expect(del.statusCode).toBe(200);
    const after = JSON.parse((await get('/api/v1/favorites', tokenA)).body);
    expect(after.total).toBe(1);
    expect(after.data.some((f: { clubId: string }) => f.clubId === clubA2)).toBe(false);
    // re-favorita para os testes seguintes
    const re = await post('/api/v1/favorites', tokenA, { clubId: clubA2 });
    expect(re.statusCode).toBe(200);
  });
});

describe('WS-C-6 — GET /favorites/feed', () => {
  it('retorna conquistas dos favoritos ordenadas por ano DESC', { timeout: 20_000 }, async () => {
    const res = await get('/api/v1/favorites/feed', tokenA);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(3);
    const years = body.data.map((f: { year: number }) => f.year);
    expect(years).toEqual([2023, 2021, 2020]);
    expect(body.data[0].competitionName).toContain('WSC6 Cup');
    expect(body.data[0].sourceUrl).toContain('wikidata.org');
    expect(body.data[0].hierarchy).toBe('nacional');
  });

  it('isolamento: usuário B não vê conquistas dos clubes que só A favorita', { timeout: 20_000 }, async () => {
    const res = await get('/api/v1/favorites/feed', tokenB);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.data[0].clubId).toBe(clubA2);
    expect(body.data.some((f: { clubId: string }) => f.clubId === clubA1)).toBe(false);
  });

  it('401 sem token', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/favorites/feed' })).statusCode).toBe(401);
  });
});

describe('WS-C-6 — sanitidade', () => {
  it.skipIf(!isPostgres)('Postgres real no ambiente de teste (RLS valida no CI)', () => {
    expect(isPostgres).toBe(true);
  });
});
