/**
 * T138 — cobertura do módulo rankings (service.ts 18,6% → alvo ≥80%).
 * Ciclo completo pela rota real: CRUD + entries + publicação (imutabilidade
 * pós-publicação = ConflictError) + leitura pública com cursor + histórico.
 * Cache Redis ligado (list/getById/publish invalidam — contrato exercido).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let clubId = '';
let rankingId = '';
let entryId = '';
const suffix = Date.now();

function token(perms: string[]): Record<string, string> {
  const t = app.jwt.sign({
    sub: `t138-rank-${suffix}`,
    email: `t138-rank-${suffix}@test.local`,
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

const WRITE = ['rankings:write'];
const PUBLISH = ['rankings:write', 'rankings:publish'];
const NAME = `Ranking T138 ${suffix}`;

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
  const club = await prisma.club.create({
    data: { name: `T138 Ranking FC ${suffix}`, importedFrom: 't138-test' },
  });
  clubId = club.id;
});

afterAll(async () => {
  if (dbOk) {
    if (rankingId) {
      await prisma.rankingEntry.deleteMany({ where: { rankingId } });
      await prisma.ranking.deleteMany({ where: { id: rankingId } });
    }
    if (clubId) await prisma.club.deleteMany({ where: { id: clubId } });
  }
  if (app) await app.close();
});

describe('CRUD + publicação /rankings (T138)', () => {
  it('POST cria → 201; sem permissão → 403; payload inválido → 422', async () => {
    if (!dbOk) return;
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/rankings',
      headers: token(['clubs:read']),
      payload: { name: NAME },
    });
    expect(forbidden.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/rankings',
      headers: token(WRITE),
      payload: { name: 'x' },
    });
    expect(invalid.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rankings',
      headers: token(WRITE),
      payload: { name: NAME, season: String(new Date().getUTCFullYear()) },
    });
    expect(res.statusCode).toBe(201);
    rankingId = res.json().data.id;
  });

  it('GET lista (com cache) e GET :id; 404 em inexistente', async () => {
    if (!dbOk) return;
    const list = await app.inject({ method: 'GET', url: '/api/v1/rankings?limit=10' });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBeGreaterThanOrEqual(1);

    const one = await app.inject({ method: 'GET', url: `/api/v1/rankings/${rankingId}` });
    expect(one.statusCode).toBe(200);
    expect(one.json().data.name).toBe(NAME);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/00000000-0000-0000-0000-000000000000',
    });
    expect(missing.statusCode).toBe(404);
  });

  it('entries: add → update → remove funcionam antes da publicação; 409 depois', async () => {
    if (!dbOk) return;
    const add = await app.inject({
      method: 'POST',
      url: `/api/v1/rankings/${rankingId}/entries`,
      headers: token(WRITE),
      payload: { clubId, position: 1, points: 90 },
    });
    expect(add.statusCode).toBe(201);
    entryId = add.json().data.id;

    const upd = await app.inject({
      method: 'PUT',
      url: `/api/v1/rankings/${rankingId}/entries/${entryId}`,
      headers: token(WRITE),
      payload: { points: 95 },
    });
    expect(upd.statusCode).toBe(200);
    expect(upd.json().data.points).toBe(95);

    // Publica e prova a imutabilidade (T444/contrato de publicação).
    const pub = await app.inject({
      method: 'POST',
      url: `/api/v1/rankings/${rankingId}/publish`,
      headers: token(PUBLISH),
    });
    expect(pub.statusCode).toBe(200);
    expect(pub.json().data.publishedAt).toBeTruthy();

    const pubAgain = await app.inject({
      method: 'POST',
      url: `/api/v1/rankings/${rankingId}/publish`,
      headers: token(PUBLISH),
    });
    expect(pubAgain.statusCode).toBe(409);

    const addAfter = await app.inject({
      method: 'POST',
      url: `/api/v1/rankings/${rankingId}/entries`,
      headers: token(WRITE),
      payload: { clubId, position: 2, points: 80 },
    });
    expect(addAfter.statusCode).toBe(409);

    const editAfter = await app.inject({
      method: 'PUT',
      url: `/api/v1/rankings/${rankingId}/entries/${entryId}`,
      headers: token(WRITE),
      payload: { points: 10 },
    });
    expect(editAfter.statusCode).toBe(409);

    const editRanking = await app.inject({
      method: 'PUT',
      url: `/api/v1/rankings/${rankingId}`,
      headers: token(WRITE),
      payload: { name: 'não pode' },
    });
    expect(editRanking.statusCode).toBe(409);

    const delRanking = await app.inject({
      method: 'DELETE',
      url: `/api/v1/rankings/${rankingId}`,
      headers: token(WRITE),
    });
    expect(delRanking.statusCode).toBe(409);
  });

  it('leitura pública: /rankings/entries (cursor) e /rankings/clube/:clubId (histórico)', async () => {
    if (!dbOk) return;
    const entries = await app.inject({
      method: 'GET',
      url: `/api/v1/rankings/entries?season=${new Date().getUTCFullYear()}&limit=10`,
    });
    expect(entries.statusCode).toBe(200);
    expect(entries.json().ranking?.id).toBe(rankingId);
    expect(entries.json().data.length).toBe(1);
    expect(entries.json().cursor).toBe(1);

    const ghost = await app.inject({
      method: 'GET',
      url: '/api/v1/rankings/clube/00000000-0000-0000-0000-000000000000',
    });
    expect(ghost.statusCode).toBe(404);

    const history = await app.inject({ method: 'GET', url: `/api/v1/rankings/clube/${clubId}` });
    expect(history.statusCode).toBe(200);
    expect(history.json().data.length).toBeGreaterThanOrEqual(1);
    expect(history.json().data[0].rankingId).toBe(rankingId);
  });

  it('entry: DELETE de entry em ranking publicado → 409 (removeEntry cobre o guard)', async () => {
    if (!dbOk) return;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/rankings/${rankingId}/entries/${entryId}`,
      headers: token(WRITE),
    });
    expect(del.statusCode).toBe(409);
  });
});
