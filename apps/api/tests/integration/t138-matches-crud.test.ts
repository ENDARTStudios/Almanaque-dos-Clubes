/**
 * T138 — cobertura do módulo matches (service 5,5% → alvo ≥80%).
 * CRUD completo pela rota real (FKs reais de clubes) + validação + 404 + 403.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';
import { generateCsrfToken } from '../../src/middleware/csrf.js';

let app: FastifyInstance;
let dbOk = true;
let homeId = '';
let awayId = '';
let matchId = '';
const suffix = Date.now();

function token(perms: string[]): Record<string, string> {
  const t = app.jwt.sign({
    sub: `t138-match-${suffix}`,
    email: `t138-match-${suffix}@test.local`,
    roles: [],
    permissions: perms,
    type: 'access',
  });
  return {
    Authorization: `Bearer ${t}`,
    cookie: `access_token=${t}`,
    'x-csrf-token': generateCsrfToken('t138'),
  };
}

const WRITE = ['clubs:write'];
const DEL = ['clubs:write', 'clubs:delete'];
const body = () => ({
  homeClubId: homeId,
  awayClubId: awayId,
  date: '2026-10-10T19:30:00.000Z',
  homeScore: 2,
  awayScore: 1,
  venue: `Arena T138 ${suffix}`,
  status: 'FINISHED',
});

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
    return;
  }
  const home = await prisma.club.create({
    data: { name: `T138 Casa ${suffix}`, importedFrom: 't138-test' },
  });
  const away = await prisma.club.create({
    data: { name: `T138 Visitante ${suffix}`, importedFrom: 't138-test' },
  });
  homeId = home.id;
  awayId = away.id;
});

afterAll(async () => {
  if (dbOk) {
    if (matchId) await prisma.match.deleteMany({ where: { id: matchId } });
    if (homeId) await prisma.club.deleteMany({ where: { id: { in: [homeId, awayId] } } });
  }
  if (app) await app.close();
});

describe('CRUD /matches (T138)', () => {
  it('POST cria partida com placar → 201; payload inválido → 422; sem permissão → 403', async () => {
    if (!dbOk) return;
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers: token(['players:read']),
      payload: body(),
    });
    expect(forbidden.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers: token(WRITE),
      payload: { ...body(), homeClubId: 'nao-uuid' },
    });
    expect(invalid.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers: token(WRITE),
      payload: body(),
    });
    expect(res.statusCode).toBe(201);
    matchId = res.json().data.id;
    expect(res.json().data.homeScore).toBe(2);
  });

  it('GET lista + filtros por clube; GET :id 200; 404 em inexistente', async () => {
    if (!dbOk) return;
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?homeClubId=${homeId}`,
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBeGreaterThanOrEqual(1);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/matches/00000000-0000-0000-0000-000000000000',
    });
    expect(missing.statusCode).toBe(404);

    if (matchId) {
      const one = await app.inject({ method: 'GET', url: `/api/v1/matches/${matchId}` });
      expect(one.statusCode).toBe(200);
      expect(one.json().data.awayClubId).toBe(awayId);
    }
  });

  it('PUT atualiza placar → 200; DELETE → 204; 404 antes de existir', async () => {
    if (!dbOk) return;
    const ghost = '00000000-0000-0000-0000-000000000000';
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/matches/${ghost}`,
          headers: token(WRITE),
          payload: { homeScore: 3 },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/v1/matches/${ghost}`, headers: token(DEL) }))
        .statusCode,
    ).toBe(404);

    if (matchId) {
      const put = await app.inject({
        method: 'PUT',
        url: `/api/v1/matches/${matchId}`,
        headers: token(WRITE),
        payload: { homeScore: 3 },
      });
      expect(put.statusCode).toBe(200);
      expect(put.json().data.homeScore).toBe(3);

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/v1/matches/${matchId}`,
        headers: token(DEL),
      });
      expect(del.statusCode).toBe(204);
      matchId = '';
    }
  });
});
