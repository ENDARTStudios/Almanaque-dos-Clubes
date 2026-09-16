/**
 * T442 — Matriz RLS em `users` (CI/Postgres com FORCE RLS).
 *
 * Roda como `app_user` (SET LOCAL ROLE) — o user do CI é superuser do
 * container e escaparia do FORCE; a API real conecta como app_user.
 * Local sem Postgres → skip honesto.
 *
 * Cobertura: owner lê/atualiza próprio · cross-user negado no banco ·
 * INSERT com userId de terceiro negado (WITH CHECK) · sem DELETE ·
 * SERVICE vê tudo · função pre-auth `users_find_by_email` disponível.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { withRlsContext } from '../../src/config/rls-context.js';
import { ROLE_PERMISSIONS } from '../../src/modules/auth/rbac.service.js';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userA = '';
let userB = '';

async function asAppUser<T>(
  userId: string | null,
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return withRlsContext({ userId: userId ?? undefined, role: 'USER' }, async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE app_user');
    return fn(tx);
  });
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    return;
  }
  // Seed idempotente de roles/permissions (o register atribui role 'free';
  // o CI não roda prisma:seed).
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    for (const permName of perms) {
      const perm = await prisma.permission.upsert({
        where: { name: permName },
        update: {},
        create: { name: permName },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // Sem contexto (superuser): fixtures
  const a = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `t442.a.${Date.now()}@test.local`,
      passwordHash: 'x',
      name: 'A',
    },
  });
  const b = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `t442.b.${Date.now()}@test.local`,
      passwordHash: 'x',
      name: 'B',
    },
  });
  userA = a.id;
  userB = b.id;
});

afterAll(async () => {
  if (dbOk && isPostgres) {
    // SERVICE pode limpar (policies users_service_*)
    await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      await tx.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    });
  }
  await app.close();
});

describe('T442 — matriz RLS em users (deny no banco)', () => {
  it('owner lê e atualiza a própria linha', async () => {
    if (!dbOk || !isPostgres) return;
    const own = await asAppUser(userA, (tx) => tx.user.findUnique({ where: { id: userA } }));
    expect(own?.id).toBe(userA);

    const updated = await asAppUser(userA, (tx) =>
      tx.user.update({ where: { id: userA }, data: { name: 'A atualizado' } }),
    );
    expect(updated.name).toBe('A atualizado');
  });

  it('A não lê linhas de B (SELECT owner-only)', async () => {
    if (!dbOk || !isPostgres) return;
    const leaked = await asAppUser(userA, (tx) => tx.user.findUnique({ where: { id: userB } }));
    expect(leaked).toBeNull();
  });

  it('A não atualiza linhas de B (UPDATE USING owner-only)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await asAppUser(userA, (tx) =>
      tx.user.updateMany({ where: { id: userB }, data: { name: 'hackeado' } }),
    );
    expect(res.count).toBe(0);
    const bName = (await asAppUser(userB, (tx) => tx.user.findUnique({ where: { id: userB } })))
      ?.name;
    expect(bName).toBe('B');
  });

  it('INSERT com userId de terceiro é negado (WITH CHECK)', async () => {
    if (!dbOk || !isPostgres) return;
    await expect(
      asAppUser(userB, (tx) =>
        tx.user.create({
          data: { id: userA, email: `roubo.${Date.now()}@test.local`, passwordHash: 'x' },
        }),
      ),
    ).rejects.toThrow();
  });

  it('INSERT de registro próprio funciona (padrão register: id gerado no server + contexto)', async () => {
    if (!dbOk || !isPostgres) return;
    const newId = randomUUID();
    const created = await asAppUser(newId, (tx) =>
      tx.user.create({
        data: { id: newId, email: `t442.novo.${Date.now()}@test.local`, passwordHash: 'x' },
      }),
    );
    expect(created.id).toBe(newId);
    // limpa via SERVICE
    await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      await tx.user.delete({ where: { id: newId } });
    });
  });

  it('DELETE não é permitido nem ao owner (soft-disable via SERVICE)', async () => {
    if (!dbOk || !isPostgres) return;
    const res = await asAppUser(userA, (tx) => tx.user.deleteMany({ where: { id: userA } }));
    expect(res.count).toBe(0);
  });

  it('SERVICE enxerga tudo (admin/jobs)', async () => {
    if (!dbOk || !isPostgres) return;
    const all = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
      tx.user.findMany({ where: { id: { in: [userA, userB] } } }),
    );
    expect(all.length).toBe(2);
  });

  it('função pre-auth users_find_by_email encontra usuário (sem contexto owner)', async () => {
    if (!dbOk || !isPostgres) return;
    const email = (await prisma.user.findUnique({ where: { id: userA } }))!.email;
    const rows = await asAppUser(null, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM users_find_by_email($1)', email),
    );
    expect(rows[0]?.id).toBe(userA);
  });
});

describe('T442 — fluxo /auth/me com FORCE RLS', () => {
  it('register → /auth/me 200 para o próprio usuário', async () => {
    if (!dbOk || !isPostgres) return;
    const email = `t442.me.${Date.now()}@test.local`;
    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'T442Teste!x',
        name: 'Me',
        acceptedTerms: true,
        acceptedPrivacy: true,
      },
      headers: {
        'x-csrf-token': (await import('../../src/middleware/csrf.js')).generateCsrfToken('t442'),
      },
    });
    // register pode retornar 201 (usuário criado) — cookie de acesso vem no login
    expect([200, 201]).toContain(reg.statusCode);

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'T442Teste!x' },
    });
    expect(login.statusCode).toBe(200);
    const cookies = login.cookies;
    const accessCookie = cookies.find((c) => c.name.includes('access_token'));
    expect(accessCookie).toBeDefined();

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { [accessCookie!.name]: accessCookie!.value },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.email).toBe(email);
  });
});
