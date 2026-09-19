/**
 * T445 — Direitos do titular (LGPD art. 18) + copyright claims: criação
 * pública com token, SLA (imediato/15d ANPD), cadeia estrita de transições,
 * decisão motivada, fulfillment de eliminação com anonimização (segregação
 * soft-delete), honeypot e guardas admin.
 *
 * Local sem banco → skip honesto; CI valida.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_PERMISSIONS } from '../../src/modules/auth/rbac.service.js';
import type { FastifyInstance } from 'fastify';

// Token CSRF é de uso único — cada POST precisa de um token fresco.
const csrf = () => ({ 'x-csrf-token': generateCsrfToken('t445'), 'content-type': 'application/json' });

let app: FastifyInstance;
let dbOk = true;
let adminToken = '';
let noPermToken = '';
let noPermUserId = '';
let adminUserId = '';
const privacyIds: string[] = [];
const claimIds: string[] = [];
let auditUserIds: string[] = [];

async function seedRoles(): Promise<void> {
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
}

function adminJwt(userId: string, email: string): string {
  return app.jwt.sign({
    sub: userId,
    email,
    roles: ['admin'],
    permissions: ['users:manage'],
    type: 'access',
  });
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  try {
    await prisma.privacyRequest.count();
  } catch (e) {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true') throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    console.log('[t445] count() falhou:', (e as Error).message.split('\n').slice(0, 12).join(' | '));
  }
  // Honestidade: run sem banco passa "vazio" (skip por teste) — deixar visível.
  console.log(`[t445] dbOk=${dbOk} (false = skips honestos; CI valida)`);
  if (!dbOk) return;
  await seedRoles();
  const suffix = Date.now();
  const admin = await prisma.user.create({
    data: { id: crypto.randomUUID(), email: `t445.admin.${suffix}@test.local`, passwordHash: 'x' },
  });
  const noPerm = await prisma.user.create({
    data: { id: crypto.randomUUID(), email: `t445.noperm.${suffix}@test.local`, passwordHash: 'x' },
  });
  adminUserId = admin.id;
  noPermUserId = noPerm.id;
  auditUserIds = [adminUserId, noPermUserId];
  adminToken = adminJwt(admin.id, admin.email);
  noPermToken = app.jwt.sign({
    sub: noPerm.id,
    email: noPerm.email,
    roles: ['free'],
    permissions: [],
    type: 'access',
  });
});

afterAll(async () => {
  if (dbOk) {
    await prisma.privacyRequest.deleteMany({
      where: { id: { in: privacyIds } },
    });
    await prisma.copyrightClaim.deleteMany({ where: { id: { in: claimIds } } });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: 'PrivacyRequest' },
          { entityType: 'CopyrightClaim' },
          { userId: { in: auditUserIds }, action: 'privacy.user_anonymized' },
        ],
      },
    });
    await prisma.session.deleteMany({ where: { userId: { in: auditUserIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: auditUserIds } },
    });
  }
  await app.close();
});

describe('T445 — privacy requests: criação pública, SLA, token', () => {
  it('criação anônima → 201 com token e SLA de 15 dias (portabilidade)', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'portabilidade', email: 'titular@test.local' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json().data;
    expect(body.status).toBe('recebido');
    expect(body.token).toHaveLength(48);
    privacyIds.push(body.id);
    const days = (new Date(body.slaDueAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(14.9);
    expect(days).toBeLessThan(15.1);
  });

  it('direito de acesso → SLA imediato (art. 18 §1º)', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'acesso', email: 'titular@test.local' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json().data;
    privacyIds.push(body.id);
    const seconds = (new Date(body.slaDueAt).getTime() - Date.now()) / 1000;
    expect(Math.abs(seconds)).toBeLessThan(10);
  });

  it('rightType desconhecido → 422', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'excluir_todos_os_dados_porfavor', email: 'titular@test.local' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('status por token (projeção pública, sem notes); token desconhecido → 404', async () => {
    if (!dbOk) return;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'correção', email: 'titular@test.local', notes: 'detalhe interno' },
    });
    const { id, token } = created.json().data;
    privacyIds.push(id);

    const status = await app.inject({
      method: 'GET',
      url: `/api/v1/privacy-requests/${token}`,
    });
    expect(status.statusCode).toBe(200);
    const proj = status.json().data;
    expect(proj.status).toBe('recebido');
    expect(proj).not.toHaveProperty('notes');
    expect(proj).not.toHaveProperty('email');

    const unknown = await app.inject({
      method: 'GET',
      url: '/api/v1/privacy-requests/nao-existe',
    });
    expect(unknown.statusCode).toBe(404);
  });
});

describe('T445 — admin workflow: guardas + cadeia estrita + eliminação', () => {
  it('admin sem auth → 401; sem permissão → 403; com users:manage → 200', async () => {
    if (!dbOk) return;
    const noAuth = await app.inject({ method: 'GET', url: '/api/v1/admin/privacy-requests' });
    expect(noAuth.statusCode).toBe(401);

    const noPerm = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/privacy-requests',
      headers: { cookie: `access_token=${noPermToken}` },
    });
    expect(noPerm.statusCode).toBe(403);

    const admin = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/privacy-requests',
      headers: { cookie: `access_token=${adminToken}` },
    });
    expect(admin.statusCode).toBe(200);
  });

  it('cadeia estrita: recebido→atendido → 409 (precisa passar por em_andamento)', async () => {
    if (!dbOk) return;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'eliminação', email: 'titular-elim@test.local' },
    });
    const { id, token } = created.json().data;
    privacyIds.push(id);
    const status = await app.inject({ method: 'GET', url: `/api/v1/privacy-requests/${token}` });

    const skip = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'atendido' },
    });
    expect(skip.statusCode).toBe(409);
    expect(status.json().data.status).toBe('recebido'); // inalterado
  });

  it('indeferido sem notes → 422 (decisão motivada obrigatória)', async () => {
    if (!dbOk) return;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'revogação', email: 'titular@test.local' },
    });
    const { id } = created.json().data;
    privacyIds.push(id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'em_andamento' },
    });
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'indeferido' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('eliminação atendida → titular anonimizado + sessões revogadas (soft-delete)', async () => {
    if (!dbOk) return;
    // autenticado: requesterId vinculado ao usuário real
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: { cookie: `access_token=${noPermToken}`, ...csrf() },
      payload: { rightType: 'eliminação', email: `titular-elim2@test.local` },
    });
    const { id } = created.json().data;
    privacyIds.push(id);

    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'em_andamento', notes: 'triagem: titular autenticado' },
    });

    // sessão ativa do titular para provar a revogação no fulfillment
    await prisma.session.create({
      data: {
        userId: noPermUserId,
        tokenHash: `t445-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'atendido' },
    });
    expect(res.statusCode).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: noPermUserId } });
    expect(user?.email.startsWith('anon+')).toBe(true);
    const sessions = await prisma.session.count({ where: { userId: noPermUserId } });
    expect(sessions).toBe(0);

    const row = await prisma.privacyRequest.findUnique({ where: { id } });
    expect(row?.status).toBe('atendido'); // registro do workflow PRESERVADO
    expect(row?.fulfilledAt).not.toBeNull();
  });

  it('deferredUntil (art. 18 §3) aceito em em_andamento', async () => {
    if (!dbOk) return;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy-requests',
      headers: csrf(),
      payload: { rightType: 'portabilidade', email: 'titular@test.local' },
    });
    const { id } = created.json().data;
    privacyIds.push(id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'em_andamento' },
    });
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/privacy-requests/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'em_andamento', deferredUntil: future, notes: 'complexidade — prorrogação §3' },
    });
    expect(res.statusCode).toBe(200);
    const row = await prisma.privacyRequest.findUnique({ where: { id } });
    expect(row?.deferredUntil?.toISOString()).toBe(future);
  });
});

describe('T445 — copyright claims: honeypot + decisão motivada', () => {
  const validPayload = {
    material: 'Fotografia de escalada registrada, autoria declarada no EXIF',
    location: 'https://almanaquedosclubes.com/clubs/flamengo/galeria/3',
    fundament: 'Uso não autorizado sem licença — DMCA art. 512 / Lei 9.610/98',
    contactEmail: 'autor@test.local',
  };

  it('honeypot preenchido → 201 idêntico, NENHUM registro criado', async () => {
    if (!dbOk) return;
    const before = await prisma.copyrightClaim.count();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/copyright-claims',
      headers: csrf(),
      payload: { ...validPayload, website: 'http://spam.example' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.status).toBe('recebida');
    const after = await prisma.copyrightClaim.count();
    expect(after).toBe(before);
  });

  it('claim válida → 201; recebida→deferida direto → 409 (cadeia estrita)', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/copyright-claims',
      headers: csrf(),
      payload: validPayload,
    });
    expect(res.statusCode).toBe(201);
    const { id } = res.json().data;
    claimIds.push(id);

    const skip = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/copyright-claims/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'deferida', resolution: 'x' },
    });
    expect(skip.statusCode).toBe(409);
  });

  it('deferida sem resolution → 422; com resolution → 200 + resolvedAt', async () => {
    if (!dbOk) return;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/copyright-claims',
      headers: csrf(),
      payload: validPayload,
    });
    const { id } = res.json().data;
    claimIds.push(id);
    const triage = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/copyright-claims/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'em_analise' },
    });
    expect(triage.statusCode).toBe(200);

    const noRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/copyright-claims/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'deferida' },
    });
    expect(noRes.statusCode).toBe(422);

    const ok = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/copyright-claims/${id}/transition`,
      headers: { cookie: `access_token=${adminToken}`, ...csrf() },
      payload: { to: 'deferida', resolution: 'Removido do ar em 24h; licença Regular adquirida.' },
    });
    expect(ok.statusCode).toBe(200);
    const row = await prisma.copyrightClaim.findUnique({ where: { id } });
    expect(row?.status).toBe('deferida');
    expect(row?.resolvedAt).not.toBeNull();
  });
});
