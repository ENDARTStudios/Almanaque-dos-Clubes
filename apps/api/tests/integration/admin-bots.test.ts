/**
 * T-24/28 — rotas do monitor de bots: gate de operador e contrato de resposta.
 *
 * Sem banco: 401/403 e 404 de bot inexistente (a rota valida o registry ANTES de
 * tocar o Prisma). Com banco (CI): GET /admin/bots devolve os 12 bots e o resumo.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const OPERADOR = 'endart.studios@gmail.com';
const INTRUSO_ADMIN = 'admin-qualquer@exemplo.com';

function tokenDe(email: string, roles: string[]): string {
  return app.jwt.sign({
    sub: `user-${email}`,
    email,
    roles,
    permissions: [],
    type: 'access',
  });
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.botState.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[T-24/28/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
  }
});

afterAll(async () => {
  await app?.close();
});

describe('GET /admin/bots — autorização', () => {
  it('sem token é 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/bots' });
    expect(res.statusCode).toBe(401);
  });

  it('admin que não é o operador recebe 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bots',
      headers: auth(tokenDe(INTRUSO_ADMIN, ['admin'])),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /admin/bots — contrato do monitor', () => {
  it('operador recebe os 12 bots + resumo', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bots',
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: {
        bots: Array<{ id: string; domain: string; enabled: boolean }>;
        summary: { total: number; running: number; ok: number; failed: number; staleMs: number };
      };
    };
    expect(body.data.bots).toHaveLength(12);
    expect(body.data.bots.map((b) => b.id)).toContain('players');
    expect(body.data.summary.total).toBe(12);
    expect(typeof body.data.summary.staleMs).toBe('number');
  });
});

describe('rotas por id', () => {
  it('bot inexistente é 404 no histórico e no disparo', async () => {
    const token = tokenDe(OPERADOR, ['admin']);
    const runs = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bots/nao-existe/runs',
      headers: auth(token),
    });
    expect(runs.statusCode).toBe(404);
    const csrf = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/csrf-token',
      headers: auth(token),
    });
    const csrfToken = (csrf.json() as { data: { csrfToken: string } }).data.csrfToken;
    const run = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/bots/nao-existe/run',
      headers: { ...auth(token), 'x-csrf-token': csrfToken },
    });
    expect(run.statusCode).toBe(404);
  });

  it('histórico do bot existente devolve array limitado', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bots/players/runs?limit=5',
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);
  });
});
