/**
 * T596 — TIME DO CORAÇÃO: ciclo das rotas /users/me/heart-club.
 *
 * O que trava aqui:
 *   1. o ciclo SET → GET → REPLACE → DELETE → GET, com idempotência em cada passo;
 *   2. clube inexistente/soft-deleted → 404 (a torcida declarada só aponta para
 *      clube vivo do acervo);
 *   3. isolamento: o vínculo é do usuário — o GET de outro usuário não vê;
 *   4. payload inválido (sem clubId / não-uuid) → 422;
 *   5. o payload do dashboard carrega o heartClub (é o cartão da área do usuário).
 *
 * Padrão do harness: o mesmo de dashboard.test.ts (JWT de teste; skip honesto sem
 * banco, falha se TEST_REQUIRE_DB=true).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userId = '';
let clubA = '';
let clubB = '';
let token = '';

function auth(): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
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
  const [u, a, b] = await Promise.all([
    prisma.user.create({
      data: { email: `heart-${suffix}@test.local`, passwordHash: 'x', name: 'Torcedor' },
    }),
    prisma.club.create({ data: { name: 'Coração FC', country: 'BR' } }),
    prisma.club.create({ data: { name: 'Outro FC', country: 'BR' } }),
  ]);
  userId = u.id;
  clubA = a.id;
  clubB = b.id;
  token = app.jwt.sign({
    sub: userId,
    email: u.email,
    roles: [],
    permissions: [],
    type: 'access',
  });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.club.deleteMany({ where: { id: { in: [clubA, clubB] } } });
  }
  await app.close();
});

describe.skipIf(!dbOk || !isPostgres)('PUT /users/me/heart-club', () => {
  it('define, é idempotente e troca substitui', async () => {
    const r1 = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: { clubId: clubA },
    });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().data).toMatchObject({ clubId: clubA, name: 'Coração FC' });

    // idempotente: o MESMO clube de novo é no-op com 200
    const r2 = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: { clubId: clubA },
    });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().data.clubId).toBe(clubA);

    // trocar substitui — é UMA torcida
    const r3 = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: { clubId: clubB },
    });
    expect(r3.json().data.clubId).toBe(clubB);
  });

  it('422 sem clubId e com clubId não-uuid; 404 para clube inexistente', async () => {
    const sem = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: {},
    });
    expect(sem.statusCode).toBe(422);

    const naoUuid = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: { clubId: 'não-é-uuid' },
    });
    expect(naoUuid.statusCode).toBe(422);

    const inexistente = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: { clubId: '00000000-0000-4000-8000-000000000000' },
    });
    expect(inexistente.statusCode).toBe(404);
  });

  it('GET devolve a declaração; DELETE remove e o GET volta a null (delete idempotente)', async () => {
    const get1 = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/heart-club',
      headers: auth(),
    });
    expect(get1.statusCode).toBe(200);
    expect(get1.json().data).toMatchObject({ clubId: clubB });

    const del1 = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
    });
    expect(del1.statusCode).toBe(200);
    expect(del1.json().removed).toBe(true);

    const del2 = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
    });
    expect(del2.json().removed).toBe(false);

    const get2 = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/heart-club',
      headers: auth(),
    });
    expect(get2.json().data).toBeNull();
  });

  it('sem autenticação → 401', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/users/me/heart-club' });
    expect(r.statusCode).toBe(401);
  });

  it('o dashboard carrega o heartClub e isolamento por usuário vale', async () => {
    await app.inject({
      method: 'PUT',
      url: '/api/v1/users/me/heart-club',
      headers: { ...auth(), 'x-csrf-token': generateCsrfToken('t596') },
      payload: { clubId: clubA },
    });

    const dash = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: auth(),
    });
    expect(dash.statusCode).toBe(200);
    expect(dash.json().data.heartClub).toMatchObject({ clubId: clubA, name: 'Coração FC' });

    // outro usuário NÃO vê o vínculo
    const outro = await prisma.user.create({
      data: { email: `heart-outro-${Date.now()}@test.local`, passwordHash: 'x' },
    });
    const tokenOutro = app.jwt.sign({
      sub: outro.id,
      email: outro.email,
      roles: [],
      permissions: [],
      type: 'access',
    });
    const getOutro = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/heart-club',
      headers: { Authorization: `Bearer ${tokenOutro}`, cookie: `access_token=${tokenOutro}` },
    });
    expect(getOutro.statusCode, getOutro.body).toBe(200);
    expect(getOutro.json().data).toBeNull();
    await prisma.user.delete({ where: { id: outro.id } }).catch(() => undefined);
  });
});
