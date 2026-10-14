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

describe('T541 — listagem renderizável, filtro de data e facets', () => {
  // AUTOSSUFICIENTE de propósito: o bloco CRUD acima APAGA a partida que criou, então
  // teste que dependesse dela aqui veria zero linhas (foi exatamente o que o CI pegou).
  let cId = '';
  let sId = '';
  let clubT541 = '';
  let matchT541 = '';
  const suf541 = Date.now();

  beforeAll(async () => {
    if (!dbOk) return;
    const club = await prisma.club.create({
      data: { name: `T541 Casa ${suf541}`, importedFrom: 't541-test' },
    });
    const away = await prisma.club.create({
      data: { name: `T541 Visitante ${suf541}`, importedFrom: 't541-test' },
    });
    const comp = await prisma.competition.create({
      data: { name: `T541 Liga ${suf541}`, importedFrom: 't541-test' },
    });
    const season = await prisma.season.create({ data: { name: `T541-${suf541}` } });
    const match = await prisma.match.create({
      data: {
        homeClubId: club.id,
        awayClubId: away.id,
        competitionId: comp.id,
        seasonId: season.id,
        date: new Date('2026-10-10T19:30:00.000Z'),
        homeScore: 2,
        awayScore: 1,
        status: 'FINISHED',
      },
    });
    cId = comp.id;
    sId = season.id;
    clubT541 = club.id;
    matchT541 = match.id;
  });

  afterAll(async () => {
    if (!dbOk) return;
    if (matchT541) await prisma.match.deleteMany({ where: { id: matchT541 } });
    if (cId) await prisma.competition.deleteMany({ where: { id: cId } });
    if (sId) await prisma.season.deleteMany({ where: { id: sId } });
    if (clubT541) await prisma.club.deleteMany({ where: { name: { contains: `T541 ` } } });
  });

  it('a LISTA traz os nomes (relações) — sem isso a página não renderiza', async () => {
    if (!dbOk) return;
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?homeClubId=${clubT541}&limit=1`,
    });
    expect(list.statusCode).toBe(200);
    const row = list.json().data[0];
    expect(row.homeClub?.name).toContain('T541 Casa');
    expect(row.awayClub?.name).toContain('T541 Visitante');
    expect(row.competition?.name).toContain('T541 Liga');
    expect(row.season?.name).toContain('T541-');
  });

  it('dateFrom/dateTo FILTRAM de verdade (antes a rota aceitava e o repo ignorava)', async () => {
    if (!dbOk) return;
    const inside = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?homeClubId=${clubT541}&dateFrom=2026-10-01&dateTo=2026-10-31`,
    });
    expect(inside.statusCode).toBe(200);
    expect(inside.json().total).toBeGreaterThanOrEqual(1);

    const outside = await app.inject({
      method: 'GET',
      url: `/api/v1/matches?homeClubId=${clubT541}&dateFrom=2020-01-01&dateTo=2020-01-31`,
    });
    expect(outside.statusCode).toBe(200);
    expect(outside.json().total).toBe(0);
  });

  it('GET /matches/facets lista a competição e a temporada da partida criada', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/matches/facets' });
    expect(res.statusCode).toBe(200);
    const { competitions, seasons } = res.json();
    expect(Array.isArray(competitions)).toBe(true);
    expect(Array.isArray(seasons)).toBe(true);
    // O CI tem banco limpo: o facet tem de enxergar a partida DESTE teste.
    expect(competitions.some((c: { id: string }) => c.id === cId)).toBe(true);
    expect(seasons.some((x: { id: string }) => x.id === sId)).toBe(true);
    for (const c of competitions) expect(c.count).toBeGreaterThan(0);
  });
});

describe('T548 — data inválida no filtro não é 500', () => {
  it('dateFrom/dateTo inválidos → 400 com código claro', async () => {
    if (!dbOk) return;
    for (const bad of ['2026-13-45', '2026-02-30', 'hoje', '13/10/2026']) {
      const res = await app.inject({ method: 'GET', url: `/api/v1/matches?dateFrom=${bad}` });
      expect(res.statusCode).toBe(400);
      expect(res.json().error?.code).toBe('INVALID_DATE');
    }
    const ok = await app.inject({
      method: 'GET',
      url: '/api/v1/matches?dateFrom=2026-01-01&dateTo=2026-12-31&limit=1',
    });
    expect(ok.statusCode).toBe(200);
  });
});
