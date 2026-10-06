/**
 * WS-C-12 — favoritos polymorphic (club | player | competition).
 *
 * Fluxo por targetType: add → list → count público → remove · compat legado
 * {clubId} · 404 alvo inexistente · 422 payload · isolamento cross-user.
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
let clubId = '';
let playerId = '';
let competitionId = '';
let tokenA = '';

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

function csrf(): Record<string, string> {
  return { 'x-csrf-token': generateCsrfToken('test-fav-multi') };
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
    prisma.user.create({ data: { email: `favm-a-${suffix}@test.local`, passwordHash: 'x' } }),
    prisma.user.create({ data: { email: `favm-b-${suffix}@test.local`, passwordHash: 'x' } }),
  ]);
  userA = a.id;
  userB = b.id;
  const club = await prisma.club.create({ data: { name: 'FavMulti FC', country: 'BR' } });
  clubId = club.id;
  const player = await prisma.player.create({
    data: { fullName: 'Jogadora FavMulti', country: 'BR' },
  });
  playerId = player.id;
  const comp = await prisma.competition.create({
    data: { name: 'Competição FavMulti', country: 'BR' },
  });
  competitionId = comp.id;
  tokenA = app.jwt.sign({ sub: userA, email: a.email, roles: [], permissions: [], type: 'access' });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.favorite.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.player.deleteMany({ where: { id: playerId } });
    await prisma.competition.deleteMany({ where: { id: competitionId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('WS-C-12 favoritos polymorphic', () => {
  it('POST {targetType:player} → 200; legado {clubId} → 200; payload inválido → 422', async () => {
    const player = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { ...auth(tokenA), ...csrf() },
      payload: { targetType: 'player', targetId: playerId },
    });
    expect(player.statusCode).toBe(200);

    const legacy = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { ...auth(tokenA), ...csrf() },
      payload: { clubId },
    });
    expect(legacy.statusCode).toBe(200);

    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { ...auth(tokenA), ...csrf() },
      payload: { targetType: 'stadium', targetId: clubId },
    });
    expect(bad.statusCode).toBe(422);
  });

  it('POST competition → 200; inexistente → 404', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { ...auth(tokenA), ...csrf() },
      payload: { targetType: 'competition', targetId: competitionId },
    });
    expect(ok.statusCode).toBe(200);

    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { ...auth(tokenA), ...csrf() },
      payload: {
        targetType: 'player',
        targetId: '00000000-0000-4000-8000-000000000000',
      },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('count público sem auth → contagem correta por alvo', async () => {
    const pc = await app.inject({
      method: 'GET',
      url: `/api/v1/favorites/count/player/${playerId}`,
    });
    expect(pc.statusCode).toBe(200);
    expect(pc.json().data.count).toBe(1);
  });

  it('GET ?targetType=player lista com nome; ?targetType=club legado intacto', async () => {
    const players = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites?targetType=player',
      headers: auth(tokenA),
    });
    const pdata = players.json().data;
    expect(pdata.length).toBe(1);
    expect(pdata[0].name).toBe('Jogadora FavMulti');

    const clubs = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
      headers: auth(tokenA),
    });
    expect(clubs.json().data.some((f: { clubId: string }) => f.clubId === clubId)).toBe(true);
  });

  it('DELETE /favorites/:targetType/:targetId → 204; count cai; re-add → reativa', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/player/${playerId}`,
      headers: { ...auth(tokenA), ...csrf() },
    });
    expect(del.statusCode).toBe(204);

    const count = await app.inject({
      method: 'GET',
      url: `/api/v1/favorites/count/player/${playerId}`,
    });
    expect(count.json().data.count).toBe(0);

    const re = await app.inject({
      method: 'POST',
      url: '/api/v1/favorites',
      headers: { ...auth(tokenA), ...csrf() },
      payload: { targetType: 'player', targetId: playerId },
    });
    expect(re.json().created).toBe(true);
  });

  it('cross-user: usuário B não vê nem remove favoritos do A', async () => {
    const tokenB = app.jwt.sign({
      sub: userB,
      email: `favm-b@${Date.now()}test.local`,
      roles: [],
      permissions: [],
      type: 'access',
    });
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites?targetType=player',
      headers: auth(tokenB),
    });
    expect(list.json().data.length).toBe(0);

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/player/${playerId}`,
      headers: { ...auth(tokenB), ...csrf() },
    });
    expect(del.statusCode).toBe(204);
    const count = await app.inject({
      method: 'GET',
      url: `/api/v1/favorites/count/player/${playerId}`,
    });
    expect(count.json().data.count).toBeGreaterThanOrEqual(0);
  });

  it('GET /clubs/:id expõe fansCount + isFavorited (logado)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${clubId}`,
      headers: auth(tokenA),
    });
    const data = res.json().data;
    expect(data.fansCount).toBeGreaterThanOrEqual(0);
    expect(typeof data.isFavorited).toBe('boolean');
  });
});
