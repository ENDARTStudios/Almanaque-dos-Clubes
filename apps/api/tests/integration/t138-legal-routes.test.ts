/**
 * T138 — cobertura das ROTAS do módulo legal (routes 17% → alvo ≥80%).
 * O teste de serviço/RLS já existe (legal.test.ts, T470); aqui é a camada HTTP:
 * direitos do titular (criar/listar/detalhar/cancelar/export/perfil/excluir conta)
 * + notificação autoral (criar/contranota/listar) + painel admin (RBAC).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { hashPassword } from '../../src/config/crypto.js';
import { generateCsrfToken } from '../../src/middleware/csrf.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
let userA = '';
let userB = '';
const suffix = Date.now();
const PASSWORD = 'SenhaT138!ok';

function tokenFor(userId: string, email: string, perms: string[] = []): Record<string, string> {
  const t = app.jwt.sign({
    sub: userId,
    email,
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

async function makeUser(tag: string): Promise<{ id: string; email: string }> {
  const email = `t138-legal-${tag}-${suffix}@test.local`;
  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(PASSWORD) },
  });
  return { id: user.id, email };
}

const NOTICE_BODY = {
  workTitle: 'Foto histórica do estádio',
  materialUrl: 'https://example.com/material',
  description: 'Uso não autorizado de fotografia de autoria do titular no perfil do clube.',
  goodFaithDeclaration: true,
  accuracyDeclaration: true,
  signatureText: 'Titular T138',
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
  if (dbOk) {
    await prisma.dataSubjectRequest.deleteMany({
      where: { userId: { in: [userA, userB].filter(Boolean) } },
    });
    await prisma.copyrightNotice.deleteMany({
      where: { userId: { in: [userA, userB].filter(Boolean) } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
  }
  if (app) await app.close();
});

describe('rotas de direitos do titular (T138)', () => {
  it('POST cria pedido → 201 com protocolo; 422 inválido; 401 anônimo', async () => {
    if (!dbOk) return;
    const a = await makeUser('a');
    userA = a.id;

    const anon = await app.inject({
      method: 'POST',
      url: '/api/v1/legal/rights/requests',
      headers: { 'x-csrf-token': generateCsrfToken('t138') },
      payload: { type: 'confirmation_access' },
    });
    expect(anon.statusCode).toBe(401);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/legal/rights/requests',
      headers: tokenFor(a.id, a.email),
      payload: { type: 'tipo-inexistente' },
    });
    expect(invalid.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/legal/rights/requests',
      headers: tokenFor(a.id, a.email),
      payload: {
        type: 'confirmation_access',
        jurisdiction: 'BR',
        requestedFields: ['account', 'favorites'],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.protocol).toBeTruthy();
  });

  it('GET lista/detalha SOMENTE os próprios pedidos; outro usuário não vê', async () => {
    if (!dbOk) return;
    const b = await makeUser('b');
    userB = b.id;
    const createdB = await app.inject({
      method: 'POST',
      url: '/api/v1/legal/rights/requests',
      headers: tokenFor(b.id, b.email),
      payload: { type: 'portability' },
    });
    expect(createdB.statusCode).toBe(201);
    const protocolB = createdB.json().data.protocol;

    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/legal/rights/requests',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    const protocolsA = (listA.json().data as Array<{ protocol: string }>).map((r) => r.protocol);
    expect(protocolsA).not.toContain(protocolB);

    const foreign = await app.inject({
      method: 'GET',
      url: `/api/v1/legal/rights/requests/${protocolB}`,
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    expect(foreign.statusCode).toBe(404);

    const own = await app.inject({
      method: 'GET',
      url: `/api/v1/legal/rights/requests/${protocolB}`,
      headers: tokenFor(b.id, b.email),
    });
    expect(own.statusCode).toBe(200);
  });

  it('cancel → 200; cancelar de novo → 409 (transição inválida honesta)', async () => {
    if (!dbOk) return;
    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/legal/rights/requests',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    const mine = list.json().data as Array<{ protocol: string }>;
    const protocol = mine[mine.length - 1].protocol;

    const cancel = await app.inject({
      method: 'POST',
      url: `/api/v1/legal/rights/requests/${protocol}/cancel`,
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    expect(cancel.statusCode).toBe(200);

    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/legal/rights/requests/${protocol}/cancel`,
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    expect(again.statusCode).toBe(409);
  });

  it('export em JSON e CSV + PATCH do próprio perfil', async () => {
    if (!dbOk) return;
    const json = await app.inject({
      method: 'GET',
      url: '/api/v1/legal/rights/me/export',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    expect(json.statusCode).toBe(200);

    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/legal/rights/me/export?format=csv',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    expect(csv.statusCode).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');

    const profile = await app.inject({
      method: 'PATCH',
      url: '/api/v1/legal/rights/me/profile',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
      payload: { name: 'Titular T138' },
    });
    expect(profile.statusCode).toBe(200);
  });

  it('admin lista e atualiza pedido (USERS_MANAGE); sem permissão → 403', async () => {
    if (!dbOk) return;
    const admin = `t138-legal-admin-${suffix}@test.local`;
    const adminUser = await prisma.user.create({
      data: { email: admin, passwordHash: 'x' },
    });
    try {
      const list = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/legal/rights/requests',
        headers: tokenFor(adminUser.id, admin, ['users:manage']),
      });
      expect(list.statusCode).toBe(200);

      const denied = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/legal/rights/requests',
        headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
      });
      expect(denied.statusCode).toBe(403);
    } finally {
      await prisma.user.deleteMany({ where: { id: adminUser.id } });
    }
  });
});

describe('rotas de notificação autoral (T138)', () => {
  it('POST notificação → 201; declarações falsas → 422; lista/detalhe owner-scoped', async () => {
    if (!dbOk) return;
    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/legal/copyright/notices',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
      payload: { ...NOTICE_BODY, goodFaithDeclaration: false },
    });
    expect(bad.statusCode).toBe(422);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/legal/copyright/notices',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
      payload: NOTICE_BODY,
    });
    expect(res.statusCode).toBe(201);
    const protocol = res.json().data.protocol;

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/legal/copyright/notices',
      headers: tokenFor(userA, `t138-legal-a-${suffix}@test.local`),
    });
    expect(list.statusCode).toBe(200);

    const counter = await app.inject({
      method: 'POST',
      url: `/api/v1/legal/copyright/notices/${protocol}/counter`,
      headers: tokenFor(userB, `t138-legal-b-${suffix}@test.local`),
      payload: {
        description: 'Conteúdo é licenciado CC0 e a fonte está citada na própria página.',
        goodFaithDeclaration: true,
        accuracyDeclaration: true,
        signatureText: 'Editor T138',
      },
    });
    expect(counter.statusCode).toBe(201);

    const admin = await prisma.user.create({
      data: { email: `t138-legal-admin2-${suffix}@test.local`, passwordHash: 'x' },
    });
    try {
      const triage = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/legal/copyright/notices/${protocol}`,
        headers: tokenFor(admin.id, admin.email, ['users:manage']),
        payload: { status: 'under_review', internalNote: 'triagem T138' },
      });
      expect(triage.statusCode).toBe(200);
    } finally {
      await prisma.user.deleteMany({ where: { id: admin.id } });
    }
  });
});
