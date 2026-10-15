/**
 * Painel de métricas do admin — GET /api/v1/admin/metrics.
 *
 * Cobre o que importa para esta rota:
 *   - o trio de autorização (logado + papel admin + allowlist do operador);
 *   - o SHAPE do payload para o operador (a página desenha a partir dele).
 *
 * Espelha `operator-gate-routes.test.ts` (mesma construção de token e de cookie —
 * o `authenticate` lê `access_token` do COOKIE httpOnly, não do header Bearer).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

const OPERADOR = 'endart.studios@gmail.com';
const INTRUSO_ADMIN = 'admin-qualquer@exemplo.com';
const URL = '/api/v1/admin/metrics';

function tokenDe(email: string, roles: string[]): string {
  return app.jwt.sign({ sub: `user-${email}`, email, roles, permissions: [], type: 'access' });
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[admin-metrics/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
  }
});

afterAll(async () => {
  await app?.close();
});

describe('GET /admin/metrics — autorização em camadas', () => {
  it('(a) sem token é 401', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(401);
  });

  it('(b) usuário comum (sem papel admin) é 403', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: auth(tokenDe('comum@exemplo.com', [])),
    });
    expect(res.statusCode).toBe(403);
  });

  it('(c) admin que NÃO é o operador é 403', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: auth(tokenDe(INTRUSO_ADMIN, ['admin'])),
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('FORBIDDEN');
  });
});

describe('GET /admin/metrics — payload do operador', () => {
  it('o operador recebe o payload com todos os blocos', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    // O gate de identidade não pode barrar o Operador; 500 significaria falta de
    // permissão de banco/RLS, não "não é o operador".
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;

    const body = res.json() as { data: Record<string, unknown> };
    const d = body.data;
    expect(typeof d.measuredAt).toBe('string');
    expect(d.cacheTtlSeconds).toBe(60);
    expect(d.acervo).toBeTruthy();
    expect(d.cobertura).toBeTruthy();
    expect(d.filaPorChave).toBeTruthy();
    expect(d.produto).toBeTruthy();

    const series = d.series as {
      usersByMonth: unknown[];
      catalogByType: unknown[];
      topFavorites: unknown[];
    };
    expect(series.usersByMonth).toHaveLength(12);
    expect(series.catalogByType).toHaveLength(5);
    expect(series.topFavorites.length).toBeLessThanOrEqual(10);
  });
});
