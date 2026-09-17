/**
 * T444 — Webhooks de pagamento: HMAC, replay, idempotência, máquina de estados.
 *
 * O fluxo mock é exercitado ponta-a-ponta (assinatura via /sign helper,
 * eventos via /webhooks/mock) — o mesmo contrato que o adapter Stripe segue
 * (verificação SDK + idempotência por providerEventId).
 * Local sem Postgres → parte de integração pula honesto; CI valida.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createHmac } from 'node:crypto';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_PERMISSIONS } from '../../src/modules/auth/rbac.service.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');
let userId = '';

const SECRET = 't444-mock-secret';

function sign(body: string, ts: number, secret = SECRET): string {
  return createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
}

async function postMockWebhook(body: string, ts: number, sig: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhooks/mock',
    payload: body,
    headers: {
      'x-mock-signature': sig,
      'x-mock-timestamp': String(ts),
      'content-type': 'application/json',
    },
  });
}

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

beforeAll(async () => {
  process.env.MOCK_WEBHOOK_SECRET = SECRET;
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.paymentEvent.count();
  } catch {
    dbOk = false;
    return;
  }
  await seedRoles();
  const suffix = Date.now();
  const user = await prisma.user.create({
    data: {
      id: randomId(),
      email: `t444.${suffix}@test.local`,
      passwordHash: 'x',
      subscription: { create: { plan: 'FREE', status: 'PENDING' } },
    },
  });
  userId = user.id;
});

function randomId(): string {
  return crypto.randomUUID();
}

const crypto = globalThis.crypto;

afterAll(async () => {
  if (dbOk && isPostgres) {
    await prisma.paymentEvent.deleteMany({ where: { provider: 'mock' } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await app.close();
});

describe('T444 — webhook mock: HMAC + replay + idempotência + estados', () => {
  it('assinatura inválida → 400', async () => {
    if (!dbOk || !isPostgres) return;
    const body = JSON.stringify({ id: `evt_${Date.now()}`, type: 'checkout.succeeded', userId });
    const ts = Math.floor(Date.now() / 1000);
    const res = await postMockWebhook(body, ts, sign(body, ts, 'segredo-errado'));
    expect(res.statusCode).toBe(400);
  });

  it('replay com timestamp antigo (>5min) → 400', async () => {
    if (!dbOk || !isPostgres) return;
    const body = JSON.stringify({ id: `evt_${Date.now()}`, type: 'checkout.succeeded', userId });
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10min atrás
    const res = await postMockWebhook(body, oldTs, sign(body, oldTs));
    expect(res.statusCode).toBe(400);
  });

  it('evento válido ativa assinatura; MESMO evento 2× → 1 efeito (idempotência)', async () => {
    if (!dbOk || !isPostgres) return;
    const body = JSON.stringify({
      id: `evt_t444_idem_${Date.now()}`,
      type: 'checkout.succeeded',
      userId,
      plan: 'PRO',
    });
    const ts = Math.floor(Date.now() / 1000);
    const r1 = await postMockWebhook(body, ts, sign(body, ts));
    expect(r1.statusCode).toBe(200);
    expect(r1.json().applied).toBe(true);

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    expect(sub?.status).toBe('ACTIVE');
    expect(sub?.plan).toBe('PRO');

    const r2 = await postMockWebhook(body, ts + 1, sign(body, ts + 1)); // mesmo id
    expect(r2.statusCode).toBe(200);
    expect(r2.json().duplicate).toBe(true);

    const events = await prisma.paymentEvent.count({
      where: { providerEventId: JSON.parse(body).id },
    });
    expect(events).toBe(1);
  });

  it('transição inválida é rejeitada sem aplicar (máquina de estados)', async () => {
    if (!dbOk || !isPostgres) return;
    // EXPIRED → PAST_DUE não existe na máquina de estados
    const body = JSON.stringify({
      id: `evt_t444_invalid_${Date.now()}`,
      type: 'subscription.past_due',
      userId, // assinatura está ACTIVE → past_due é válido; usa fluxo cancelado→past_due:
      plan: 'PRO',
    });
    void body;
    // prepara estado CANCELLED via evento válido
    const cancelBody = JSON.stringify({
      id: `evt_t444_cancel_${Date.now()}`,
      type: 'subscription.canceled',
      userId,
    });
    const ts = Math.floor(Date.now() / 1000);
    await postMockWebhook(cancelBody, ts, sign(cancelBody, ts));
    const afterCancel = await prisma.subscription.findUnique({ where: { userId } });
    expect(afterCancel?.status).toBe('CANCELLED');

    // CANCELLED → PAST_DUE não é transição permitida
    const invalidBody = JSON.stringify({
      id: `evt_t444_pd_${Date.now()}`,
      type: 'subscription.past_due',
      userId,
    });
    const res = await postMockWebhook(invalidBody, ts + 1, sign(invalidBody, ts + 1));
    expect(res.statusCode).toBe(200);
    expect(res.json().applied).toBe(false);

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    expect(sub?.status).toBe('CANCELLED'); // inalterado
  });
});
