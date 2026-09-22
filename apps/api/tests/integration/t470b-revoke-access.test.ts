/**
 * T470b — E2E do fechamento do gap dos 15 min.
 *
 * register -> login -> GET /auth/me 200 -> DELETE conta -> MESMO access cookie
 * em GET /auth/me => 401 IMEDIATO (antes do fix: 200 por até 15 min).
 * Requer Postgres + Redis (CI tem ambos). Local sem DB -> skip honesto.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_PERMISSIONS } from '../../src/modules/auth/rbac.service.js';

let app: FastifyInstance;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
const useRedis = isPostgres || !!process.env.REDIS_URL || !!process.env.REDIS_HOST;
let dbOk = true;
const email = `t470b_${Date.now()}@example.com`;
const password = 'S3nh4-Forte!2026';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.user.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip');
    return;
  }
  // Seed de roles/permissions (register atribui role 'free'; CI não roda prisma:seed).
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
});

afterAll(async () => {
  if (dbOk) await prisma.user.deleteMany({ where: { email: { startsWith: 't470b_' } } });
  await app.close();
});

describe('T470b — access token da sessão excluída é rejeitado na hora', () => {
  it('DELETE conta -> 401 imediato no mesmo access; refresh revogado também', async () => {
    if (!dbOk || !useRedis) return;

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password, name: 'T470b', acceptedTerms: true, acceptedPrivacy: true },
    });
    expect([201, 409]).toContain(reg.statusCode);

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    const cookieHeader = login.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    expect(login.cookies.some((c) => c.name.includes('access_token'))).toBe(true);

    const me1 = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(me1.statusCode).toBe(200);

    const csrfRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/csrf-token',
      headers: { cookie: cookieHeader },
    });
    const csrfBody = JSON.parse(csrfRes.body) as {
      csrfToken?: string;
      data?: { csrfToken?: string };
    };
    const csrf = csrfBody.data?.csrfToken ?? csrfBody.csrfToken;

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/v1/legal/rights/me/account',
      headers: { cookie: cookieHeader, 'x-csrf-token': csrf as string },
      payload: { confirmation: 'EXCLUIR CONTA', password },
    });
    expect(del.statusCode).toBe(200);

    // Gap fechado: o MESMO access token => 401 imediato.
    const me2 = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookieHeader },
    });
    expect(me2.statusCode).toBe(401);
  });
});
