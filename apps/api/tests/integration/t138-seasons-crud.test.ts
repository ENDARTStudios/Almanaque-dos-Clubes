/**
 * T138 — cobertura do módulo seasons (service 5,5% → alvo ≥80%).
 * CRUD completo pela rota real + validação + 404 + 403 (exige COMPETITIONS_MANAGE).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';
import { generateCsrfToken } from '../../src/middleware/csrf.js';

let app: FastifyInstance;
let dbOk = true;
let seasonId = '';
const suffix = Date.now();

function token(perms: string[]): Record<string, string> {
  const t = app.jwt.sign({
    sub: `t138-season-${suffix}`,
    email: `t138-season-${suffix}@test.local`,
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

const MANAGE = ['competitions:manage'];
const body = () => ({
  name: `Temporada T138 ${suffix}`,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'ONGOING',
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
  }
});

afterAll(async () => {
  if (dbOk && seasonId) await prisma.season.deleteMany({ where: { id: seasonId } });
  if (app) await app.close();
});

describe('CRUD /seasons (T138)', () => {
  it('POST cria → 201; sem permissão → 403; payload inválido → 422', async () => {
    if (!dbOk) return;
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/seasons',
      headers: token(['clubs:read']),
      payload: body(),
    });
    expect(forbidden.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/seasons',
      headers: token(MANAGE),
      payload: { startDate: '2026-01-01' },
    });
    expect(invalid.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/seasons',
      headers: token(MANAGE),
      payload: body(),
    });
    expect(res.statusCode).toBe(201);
    seasonId = res.json().data.id;
  });

  it('GET lista; GET :id 200; 404 em inexistente', async () => {
    if (!dbOk) return;
    const list = await app.inject({ method: 'GET', url: '/api/v1/seasons' });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBeGreaterThanOrEqual(1);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/seasons/00000000-0000-0000-0000-000000000000',
    });
    expect(missing.statusCode).toBe(404);

    if (seasonId) {
      const one = await app.inject({ method: 'GET', url: `/api/v1/seasons/${seasonId}` });
      expect(one.statusCode).toBe(200);
      expect(one.json().data.name).toContain('T138');
    }
  });

  it('PUT atualiza status → 200; DELETE → 204; 404 antes de existir', async () => {
    if (!dbOk) return;
    const ghost = '00000000-0000-0000-0000-000000000000';
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/seasons/${ghost}`,
          headers: token(MANAGE),
          payload: { status: 'FINISHED' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url: `/api/v1/seasons/${ghost}`,
          headers: token(MANAGE),
        })
      ).statusCode,
    ).toBe(404);

    if (seasonId) {
      const put = await app.inject({
        method: 'PUT',
        url: `/api/v1/seasons/${seasonId}`,
        headers: token(MANAGE),
        payload: { status: 'FINISHED' },
      });
      expect(put.statusCode).toBe(200);
      expect(put.json().data.status).toBe('FINISHED');

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/v1/seasons/${seasonId}`,
        headers: token(MANAGE),
      });
      expect(del.statusCode).toBe(204);
      seasonId = '';
    }
  });
});
