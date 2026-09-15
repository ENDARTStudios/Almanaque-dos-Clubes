/**
 * T439 — Favoritos: idempotência, soft-delete e matriz RLS cross-user.
 *
 * A) Rotas (buildApp + JWT de teste): POST idempotente, DELETE soft-delete,
 *    GET lista, 401 sem token, 404 clube inexistente.
 * B) RLS cross-user (CI/Postgres com FORCE RLS): usuário B não vê, não
 *    atualiza e não remove favorito do usuário A — deny no BANCO
 *    (policies owner-only), não só no código. Local sem Postgres/RLS → skip.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import { withRlsContext } from '../../src/config/rls-context.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
// withRlsContext usa set_config (Postgres-only) — em sqlite/sem Postgres os
// testes de rotas e de RLS pulam (honesto); o CI valida em Postgres real.
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userA = '';
let userB = '';
let clubId = '';
let tokenA = '';

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, cookie: `access_token=${token}` };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.favorite.count();
  } catch {
    dbOk = false;
    return;
  }
  const suffix = Date.now();
  const a = await prisma.user.create({
    data: { email: `fav-a-${suffix}@test.local`, passwordHash: 'x' },
  });
  const b = await prisma.user.create({
    data: { email: `fav-b-${suffix}@test.local`, passwordHash: 'x' },
  });
  userA = a.id;
  userB = b.id;
  const club = await prisma.club.create({
    data: { name: 'Favorites FC', country: 'BR', qid: null },
  });
  clubId = club.id;
  tokenA = app.jwt.sign({
    sub: userA,
    email: a.email,
    roles: [],
    permissions: [],
    type: 'access',
  });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.favorite.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.club.deleteMany({ where: { id: clubId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  }
  await app.close();
});

function post(url: string, token: string, payload?: unknown) {
  return app.inject({
    method: 'POST',
    url,
    payload,
    headers: {
      ...authHeader(token),
      'x-csrf-token': generateCsrfToken('test-favorites'),
    },
  });
}

describe('T439 — rotas de favoritos', () => {
  it('POST cria favorito; re-POST é idempotente (sem duplicata)', async () => {
    if (!dbOk || !isPostgres) return;
    const r1 = await post('/api/v1/favorites', tokenA, { clubId });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().created).toBe(true);

    const r2 = await post('/api/v1/favorites', tokenA, { clubId });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().created).toBe(false);

    const count = await prisma.favorite.count({ where: { userId: userA, clubId } });
    expect(count).toBe(1);
  });

  it('DELETE faz soft-delete; GET não lista o removido; re-POST reativa o mesmo registro', async () => {
    if (!dbOk || !isPostgres) return;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/${clubId}`,
      headers: { ...authHeader(tokenA), 'x-csrf-token': generateCsrfToken('test-favorites') },
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().removed).toBe(true);

    const active = await prisma.favorite.findFirst({
      where: { userId: userA, clubId, deletedAt: null },
    });
    expect(active).toBeNull();
    const softDeleted = await prisma.favorite.findFirst({ where: { userId: userA, clubId } });
    expect(softDeleted?.deletedAt).not.toBeNull();

    const re = await post('/api/v1/favorites', tokenA, { clubId });
    expect(re.json().reactivated).toBe(true);
    const rows = await prisma.favorite.findMany({ where: { userId: userA, clubId } });
    expect(rows.length).toBe(1); // mesma linha reativada, sem duplicata
  });

  it('GET lista com badge do ranking vigente e clube resumido', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
      headers: authHeader(tokenA),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0].club).toMatchObject({ id: clubId, name: 'Favorites FC' });
    }
  });

  it('401 sem token; 404 para clube inexistente', async () => {
    if (!dbOk || !isPostgres) return;
    const noAuth = await app.inject({ method: 'GET', url: '/api/v1/favorites' });
    expect(noAuth.statusCode).toBe(401);

    const missing = await post('/api/v1/favorites', tokenA, {
      clubId: '00000000-0000-4000-8000-000000000000',
    });
    expect(missing.statusCode).toBe(404);
  });
});

describe('T439 — matriz RLS cross-user (deny no banco)', () => {
  // O user do CI (dono das tabelas) é superuser no container — FORCE RLS não se
  // aplica a superuser. A API real conecta como `app_user` (NOBYPASSRLS);
  // o teste espelha isso com SET LOCAL ROLE app_user.
  async function asAppUser<T>(
    userId: string,
    fn: (
      tx: Parameters<Parameters<typeof import('@prisma/client').Prisma.$transaction>[0]>[0],
    ) => Promise<T>,
  ): Promise<T> {
    return withRlsContext({ userId, role: 'USER' }, async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
      return fn(tx);
    });
  }

  it('usuário A vê o próprio favorito; B não vê o de A (deny no banco)', async () => {
    if (!dbOk || !isPostgres) return;
    const asB = await asAppUser(userB, (tx) =>
      tx.favorite.findMany({ where: { userId: userA, clubId } }),
    );
    const asA = await asAppUser(userA, (tx) =>
      tx.favorite.findMany({ where: { userId: userA, clubId } }),
    );
    expect(asA.length).toBeGreaterThanOrEqual(1); // A vê o próprio
    expect(asB.length).toBe(0); // B não vê nada de A
  });

  it('usuário B não consegue atualizar nem remover favorito do usuário A', async () => {
    if (!dbOk || !isPostgres) return;
    await expect(
      asAppUser(userB, (tx) =>
        tx.favorite.updateMany({
          where: { userId: userA, clubId },
          data: { notificationsActive: false },
        }),
      ),
    ).resolves.toMatchObject({ count: 0 });

    await expect(
      asAppUser(userB, (tx) => tx.favorite.deleteMany({ where: { userId: userA, clubId } })),
    ).resolves.toMatchObject({ count: 0 });
  });

  it('usuário B não insere favorito com userId de A (WITH CHECK bloqueia)', async () => {
    if (!dbOk || !isPostgres) return;
    await expect(
      asAppUser(userB, (tx) => tx.favorite.create({ data: { userId: userA, clubId } })),
    ).rejects.toThrow();
  });

  it('SERVICE enxerga tudo (cron/fanout)', async () => {
    if (!dbOk || !isPostgres) return;
    const asService = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
      tx.favorite.findMany({ where: { clubId } }),
    );
    expect(asService.length).toBeGreaterThanOrEqual(1);
  });
});
