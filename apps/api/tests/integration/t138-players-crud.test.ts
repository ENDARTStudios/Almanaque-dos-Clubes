/**
 * T138 — cobertura do módulo players (service 5,5% → alvo ≥80%).
 * Ciclo CRUD completo pela rota real + validação + 404 + 403 (sem permissão).
 * Padrão jobs-observability: app real + JWT de teste; DB probe com guarda.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';
import { generateCsrfToken } from '../../src/middleware/csrf.js';

let app: FastifyInstance;
let dbOk = true;
const created: string[] = [];
const suffix = Date.now();

function token(perms: string[]): Record<string, string> {
  const t = app.jwt.sign({
    sub: `t138-player-${suffix}`,
    email: `t138-player-${suffix}@test.local`,
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

const WRITE = ['players:write'];
const MANAGE = ['players:write', 'players:manage'];
const BODY = {
  fullName: `Jogador Teste ${suffix}`,
  position: 'FORWARD',
  country: 'BR',
};

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
  if (dbOk && created.length > 0) {
    await prisma.favorite.deleteMany({
      where: { targetType: 'player', targetId: { in: created } },
    });
    await prisma.player.deleteMany({ where: { id: { in: created } } });
  }
  if (app) await app.close();
});

describe('CRUD /players (T138)', () => {
  it('POST cria → 201; sem permissão → 403; payload inválido → 422', async () => {
    if (!dbOk) return;
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/players',
      headers: token(['clubs:read']),
      payload: BODY,
    });
    expect(forbidden.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/players',
      headers: token(WRITE),
      payload: { position: 'FORWARD' },
    });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().error.code).toBe('VALIDATION_ERROR');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/players',
      headers: token(WRITE),
      payload: BODY,
    });
    expect(res.statusCode).toBe(201);
    created.push(res.json().data.id);
  });

  it('GET lista com paginação/limites; GET :id traz fansCount; 404 em id inexistente', async () => {
    if (!dbOk) return;
    const list = await app.inject({ method: 'GET', url: '/api/v1/players?limit=5&offset=0' });
    expect(list.statusCode, `LIST BODY=${list.body.slice(0, 300)}`).toBe(200);
    expect(list.json().limit).toBe(5);

    // limit acima do teto (100) é clampeado.
    const clamped = await app.inject({ method: 'GET', url: '/api/v1/players?limit=9999' });
    expect(clamped.json().limit).toBe(100);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/players/00000000-0000-0000-0000-000000000000',
    });
    expect(missing.statusCode).toBe(404);

    if (created[0]) {
      const one = await app.inject({ method: 'GET', url: `/api/v1/players/${created[0]}` });
      expect(one.statusCode).toBe(200);
      expect(one.json().data.fullName).toBe(BODY.fullName);
      expect(one.json().data).toHaveProperty('fansCount');
    }
  });

  it('PUT atualiza → 200; DELETE → 204; ambos 404 antes de existir', async () => {
    if (!dbOk) return;
    const ghost = '00000000-0000-0000-0000-000000000000';
    const put404 = await app.inject({
      method: 'PUT',
      url: `/api/v1/players/${ghost}`,
      headers: token(WRITE),
      payload: { position: 'MIDFIELDER' },
    });
    expect(put404.statusCode).toBe(404);
    const del404 = await app.inject({
      method: 'DELETE',
      url: `/api/v1/players/${ghost}`,
      headers: token(MANAGE),
    });
    expect(del404.statusCode).toBe(404);

    if (created[0]) {
      const put = await app.inject({
        method: 'PUT',
        url: `/api/v1/players/${created[0]}`,
        headers: token(WRITE),
        payload: { position: 'MIDFIELDER' },
      });
      expect(put.statusCode).toBe(200);
      expect(put.json().data.position).toBe('MIDFIELDER');

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/v1/players/${created[0]}`,
        headers: token(MANAGE),
      });
      expect(del.statusCode).toBe(204);
      created.length = 0;
    }
  });
});
