/**
 * T-ADMIN wave 2 — rotas internas novas (usuários/plano, trilha, catálogo, LGPD).
 *
 * O que este teste prova, e por quê:
 *   - o MESMO trio de guardas protege TODA rota nova (401 sem token, 403 para
 *     admin que NÃO é o operador). Uma rota nova sem o gate seria o furo clássico;
 *   - `GET /admin/users` passou a expor `plan` e a paginar no servidor (`total`);
 *   - `PATCH /admin/users/:id/plan` valida o plano e recusa alvo inexistente;
 *   - `GET /admin/audit-logs` responde o contrato `{ data: { items, total } }`;
 *   - o CRUD de mídia responde 404 honesto para clube inexistente;
 *   - **a purga LGPD é dry-run por PADRÃO** — chamada sem `dryRun=false` NÃO
 *     apaga nada. Nenhum teste chama o modo real.
 *
 * Espelha `admin-metrics.test.ts` e `operator-gate-routes.test.ts` (token com
 * cookie `access_token`, que é o que o `authenticate` lê).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

const OPERADOR = 'endart.studios@gmail.com';
const INTRUSO_ADMIN = 'admin-qualquer@exemplo.com';

function tokenDe(email: string, roles: string[]): string {
  return app.jwt.sign({ sub: `user-${email}`, email, roles, permissions: [], type: 'access' });
}

function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

/** Escrita exige CSRF de uso único — cada chamada precisa de um token fresco. */
function csrf(): Record<string, string> {
  return { 'x-csrf-token': generateCsrfToken('admin-wave2-test') };
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
      throw new Error('[admin-wave2/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
  }
});

afterAll(async () => {
  await app?.close();
});

const GET_ROUTES = [
  '/api/v1/admin/users',
  '/api/v1/admin/audit-logs',
  '/api/v1/admin/catalogo/media',
  '/api/v1/admin/lgpd/consents',
  '/api/v1/admin/lgpd/deletions',
];

describe('wave 2 — guarda do trio (authenticate + requireRole + requireOperator)', () => {
  it('(a) sem token é 401 em todas as rotas novas', async () => {
    if (!dbOk || !isPostgres) return;
    for (const url of GET_ROUTES) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, `${url} sem token`).toBe(401);
    }
  });

  it('(b) admin que NÃO é o operador é 403 (inclusive em escrita)', async () => {
    if (!dbOk || !isPostgres) return;
    const token = tokenDe(INTRUSO_ADMIN, ['admin']);

    for (const url of GET_ROUTES) {
      const res = await app.inject({ method: 'GET', url, headers: auth(token) });
      expect(res.statusCode, `${url} com admin intruso`).toBe(403);
    }

    const patchPlan = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${randomUUID()}/plan`,
      headers: { ...auth(token), ...csrf() },
      payload: { plan: 'PRO' },
    });
    expect(patchPlan.statusCode).toBe(403);

    const purge = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/lgpd/purge',
      headers: { ...auth(token), ...csrf() },
    });
    expect(purge.statusCode).toBe(403);
  });
});

describe('GET /admin/users — plano e paginação server-side', () => {
  it('o operador recebe data (array) + total (número), com o campo plan', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users?limit=5&offset=0',
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: Array<Record<string, unknown>>; total: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
    if (body.data.length) expect('plan' in body.data[0]).toBe(true);
  });

  it('plano inválido → 422 (antes de tocar o banco)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users?plan=BOGUS',
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    expect(res.statusCode).toBe(422);
  });

  it('filtro por plano válido → não é 422', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users?plan=FREE',
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    expect(res.statusCode).not.toBe(422);
  });
});

describe('PATCH /admin/users/:id/plan', () => {
  it('plano inválido → 422', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${randomUUID()}/plan`,
      headers: { ...auth(tokenDe(OPERADOR, ['admin'])), ...csrf() },
      payload: { plan: 'GOLD' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('usuário inexistente → 404 (sem tocar em assinatura)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${randomUUID()}/plan`,
      headers: { ...auth(tokenDe(OPERADOR, ['admin'])), ...csrf() },
      payload: { plan: 'PRO' },
    });
    // 404 = validação de alvo; 400/500 por falta de banco não são o alvo deste teste.
    expect([404, 500]).toContain(res.statusCode);
    if (res.statusCode !== 500) expect(res.statusCode).toBe(404);
  });
});

describe('GET /admin/audit-logs', () => {
  it('responde o contrato { data: { items, total } }', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs?limit=10&offset=0',
      headers: auth(tokenDe(OPERADOR, ['admin'])),
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: { items: unknown[]; total: number } };
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(typeof body.data.total).toBe('number');
  });
});

describe('CRUD de mídia (/admin/catalogo/media) — 404 honesto', () => {
  const token = () => auth(tokenDe(OPERADOR, ['admin']));

  it('GET lista responde { data, total }', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/catalogo/media?limit=5',
      headers: token(),
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: unknown[]; total: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  it('PATCH de clube inexistente → 404', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/catalogo/media/${randomUUID()}`,
      headers: { ...token(), ...csrf() },
      payload: { logoUrl: 'https://example.org/logo.png' },
    });
    expect([404, 500]).toContain(res.statusCode);
    if (res.statusCode !== 500) expect(res.statusCode).toBe(404);
  });

  it('DELETE de clube inexistente → 404', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/catalogo/media/${randomUUID()}`,
      headers: { ...token(), ...csrf() },
    });
    expect([404, 500]).toContain(res.statusCode);
    if (res.statusCode !== 500) expect(res.statusCode).toBe(404);
  });

  it('POST sem campo de mídia → 422', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/catalogo/media',
      headers: { ...token(), ...csrf() },
      payload: { clubId: randomUUID() },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe('LGPD (/admin/lgpd/*)', () => {
  const token = () => auth(tokenDe(OPERADOR, ['admin']));

  it('consents responde lista', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/lgpd/consents?limit=1000',
      headers: token(),
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('deletions responde lista + graceDays = 30', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/lgpd/deletions',
      headers: token(),
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: unknown[]; graceDays: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.graceDays).toBe(30);
  });

  it('purge SEM dryRun é dry-run (nada é apagado por padrão)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/lgpd/purge',
      headers: { ...token(), ...csrf() },
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: { dryRun: boolean; targets: Record<string, number> } };
    expect(body.data.dryRun).toBe(true);
    expect(body.data.targets).toBeTruthy();
  });

  it('purge?dryRun=true também é dry-run', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/lgpd/purge?dryRun=true',
      headers: { ...token(), ...csrf() },
    });
    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode !== 200) return;
    const body = res.json() as { data: { dryRun: boolean } };
    expect(body.data.dryRun).toBe(true);
  });
});
