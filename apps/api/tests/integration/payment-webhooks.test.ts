/**
 * T444 — Webhooks de pagamento: HMAC, replay, idempotência, máquina de estados.
 *
 * O fluxo mock é exercitado ponta-a-ponta (assinatura via /sign helper,
 * eventos via /webhooks/mock) — o mesmo contrato que o adapter Stripe segue
 * (verificação SDK + idempotência por providerEventId).
 *
 * Relógio: os testes de caso VÁLIDO usam fake timers — o clock de runners de
 * CI pode desviar >5min e dispararia a tolerância de replay com assinatura
 * válida. Local sem Postgres → skip honesto; CI valida.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createHmac } from 'node:crypto';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/config/prisma.js';
import { ROLE_PERMISSIONS } from '../../src/modules/auth/rbac.service.js';
import type { FastifyInstance } from 'fastify';

// T447 — Stripe configurado ANTES do load dos módulos (config/stripe.ts lê o
// env no import). Key fake: handleStripeEvent não chama a API do Stripe —
// constructEvent/generateTestHeaderString são criptografia local.
vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_t447_fake';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_t447_test';
});

// R2 — seed tolerante a corrida entre arquivos paralelos (upsert concorrente = já existe).
const ignoreDuplicate = (e: unknown): void => {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
};

let app: FastifyInstance;
let dbOk = true;
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

async function stripeSignatureHeader(payload: string, secret = 'whsec_t447_test'): Promise<string> {
  const stripe = new Stripe('sk_test_t447_fake');
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}

async function postStripeWebhook(eventObj: unknown) {
  const payload = JSON.stringify(eventObj);
  const header = await stripeSignatureHeader(payload);
  return app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhook',
    payload,
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
  });
}

function stripeEvent(id: string, type: string, object: Record<string, unknown>) {
  return {
    id,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    type,
    livemode: false,
    data: { object },
  };
}

async function seedRoles(): Promise<void> {
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    }).catch(async (e: unknown) => {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      return prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    });
    for (const permName of perms) {
      const perm = await prisma.permission.upsert({
        where: { name: permName },
        update: {},
        create: { name: permName },
      }).catch(async (e: unknown) => {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
        return prisma.permission.findUniqueOrThrow({ where: { name: permName } });
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      }).catch(ignoreDuplicate);
    }
  }
}

beforeAll(async () => {
  process.env.MOCK_WEBHOOK_SECRET = SECRET;
  app = await buildApp();
  await app.ready();
  try {
    await prisma.paymentEvent.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true') throw new Error('[R1/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)');
    return;
  }
  await seedRoles();
  const suffix = Date.now();
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: `t444.${suffix}@test.local`,
      passwordHash: 'x',
      subscriptions: { create: { plan: 'FREE', status: 'PENDING' } },
    },
  });
  userId = user.id;
});

afterAll(async () => {
  if (dbOk) {
    await prisma.paymentEvent.deleteMany({ where: { provider: 'mock' } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await app.close();
});

describe('T444 — webhook mock: HMAC + replay + idempotência + estados', () => {
  it('assinatura inválida → 400', async () => {
    if (!dbOk) return;
    const body = JSON.stringify({ id: `evt_${Date.now()}`, type: 'checkout.succeeded', userId });
    const ts = Math.floor(Date.now() / 1000);
    const res = await postMockWebhook(body, ts, sign(body, ts, 'segredo-errado'));
    expect(res.statusCode).toBe(400);
  });

  it('replay com timestamp antigo (>5min) → 400', async () => {
    if (!dbOk) return;
    const body = JSON.stringify({ id: `evt_${Date.now()}`, type: 'checkout.succeeded', userId });
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10min atrás
    const res = await postMockWebhook(body, oldTs, sign(body, oldTs));
    expect(res.statusCode).toBe(400);
  });

  it('evento válido ativa assinatura; MESMO evento 2× → 1 efeito (idempotência)', async () => {
    if (!dbOk) return;
    // Fake timers: o clock de runners de CI pode desviar >5min e dispararia a
    // tolerância de replay com assinatura VÁLIDA. Fixando o tempo, o teste é
    // determinístico (o route lê Date.now() do mesmo relógio fake).
    // toFake: ['Date'] — só o relógio é fake; timers/rede reais (Prisma hangaria).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    try {
      const body = JSON.stringify({
        id: `evt_t444_idem_${Date.now()}`,
        type: 'checkout.succeeded',
        userId,
        plan: 'PRO',
      });
      const ts = Math.floor(Date.now() / 1000);
      const r1 = await postMockWebhook(body, ts, sign(body, ts));
      if (r1.statusCode !== 200) console.log('R1-BODY:', r1.body);
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
    } finally {
      vi.useRealTimers();
    }
  });

  it('transição inválida é rejeitada sem aplicar (máquina de estados)', async () => {
    if (!dbOk) return;
    // prepara estado CANCELLED via evento válido
    const cancelBody = JSON.stringify({
      id: `evt_t444_cancel_${Date.now()}`,
      type: 'subscription.canceled',
      userId,
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
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
    vi.useRealTimers();

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    expect(sub?.status).toBe('CANCELLED'); // inalterado
  });
});

// -----------------------------------------------------------------------------
// T447 — webhook Stripe (rota real, assinatura SDK): checkout → ACTIVE,
// replay sem billing duplicada, payment_failed → PAST_DUE, cancel →
// CANCELLED, refund → billing REFUNDED sem transição inválida.
// -----------------------------------------------------------------------------
describe('T447 — webhook Stripe: idempotência + máquina de estados', () => {
  let stripeUserId = '';
  let subExt = '';

  beforeAll(async () => {
    if (!dbOk) return;
    subExt = `sub_t447_${Date.now()}`;
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `t447.${Date.now()}@test.local`,
        passwordHash: 'x',
        subscriptions: { create: { plan: 'FREE', status: 'PENDING' } },
      },
    });
    stripeUserId = user.id;
  });

  afterAll(async () => {
    if (!dbOk || !stripeUserId) return;
    await prisma.paymentEvent.deleteMany({ where: { provider: 'stripe' } });
    await prisma.billing.deleteMany({ where: { userId: stripeUserId } });
    await prisma.subscription.deleteMany({ where: { userId: stripeUserId } });
    await prisma.auditLog.deleteMany({ where: { userId: stripeUserId } });
    await prisma.user.deleteMany({ where: { id: stripeUserId } });
  });

  it('checkout.session.completed → ACTIVE/PRO + billing PAID', async () => {
    if (!dbOk) return;
    const event = stripeEvent(`evt_t447_checkout_${Date.now()}`, 'checkout.session.completed', {
      id: `cs_t447_${Date.now()}`,
      object: 'checkout.session',
      mode: 'subscription',
      amount_total: 490,
      currency: 'brl',
      subscription: subExt,
      metadata: { userId: stripeUserId, plan: 'PRO', interval: 'month', currency: 'BRL' },
    });
    const res = await postStripeWebhook(event);
    if (res.statusCode !== 200) console.log('T447-CHECKOUT-BODY:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const sub = await prisma.subscription.findUnique({ where: { userId: stripeUserId } });
    expect(sub?.status).toBe('ACTIVE');
    expect(sub?.plan).toBe('PRO');

    const billing = await prisma.billing.findFirst({ where: { externalId: subExt } });
    expect(billing?.status).toBe('PAID');
    expect(billing?.amountCents).toBe(490);
  });

  it('replay do MESMO evento → 200, sem billing duplicada (idempotência)', async () => {
    if (!dbOk) return;
    // Usuário dedicado: o cenário de replay precisa começar com ZERO billings
    // no externalId sob teste (findFirst é não-determinístico quando há mais
    // de uma billing com o mesmo externalId).
    const replayUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `t447.replay.${Date.now()}@test.local`,
        passwordHash: 'x',
        subscriptions: { create: { plan: 'FREE', status: 'PENDING' } },
      },
    });
    try {
      const subExtReplay = `sub_t447_replay_${Date.now()}`;
      const event = stripeEvent('evt_t447_replay_fixed', 'checkout.session.completed', {
        id: 'cs_t447_replay',
        object: 'checkout.session',
        mode: 'subscription',
        amount_total: 490,
        currency: 'brl',
        subscription: subExtReplay,
        metadata: { userId: replayUser.id, plan: 'PRO', interval: 'month', currency: 'BRL' },
      });
      const r1 = await postStripeWebhook(event);
      expect(r1.statusCode).toBe(200);

      const r2 = await postStripeWebhook(event); // MESMO event.id
      expect(r2.statusCode).toBe(200);

      const billings = await prisma.billing.count({ where: { externalId: subExtReplay } });
      expect(billings).toBe(1); // T444 criaria 2 — T447 corrige
      const events = await prisma.paymentEvent.count({
        where: { providerEventId: 'evt_t447_replay_fixed' },
      });
      expect(events).toBe(1);
      const replaySub = await prisma.subscription.findUnique({
        where: { userId: replayUser.id },
      });
      expect(replaySub?.status).toBe('ACTIVE');
    } finally {
      await prisma.paymentEvent.deleteMany({
        where: { providerEventId: 'evt_t447_replay_fixed' },
      });
      await prisma.billing.deleteMany({ where: { userId: replayUser.id } });
      await prisma.auditLog.deleteMany({ where: { userId: replayUser.id } });
      await prisma.subscription.deleteMany({ where: { userId: replayUser.id } });
      await prisma.user.deleteMany({ where: { id: replayUser.id } });
    }
  });

  it('invoice.payment_failed → PAST_DUE (máquina de estados)', async () => {
    if (!dbOk) return;
    const event = stripeEvent(`evt_t447_fail_${Date.now()}`, 'invoice.payment_failed', {
      id: `in_t447_${Date.now()}`,
      object: 'invoice',
      subscription: subExt,
    });
    const res = await postStripeWebhook(event);
    expect(res.statusCode).toBe(200);

    const sub = await prisma.subscription.findUnique({ where: { userId: stripeUserId } });
    expect(sub?.status).toBe('PAST_DUE');
  });

  it('customer.subscription.updated (canceled) → CANCELLED + periodEnd', async () => {
    if (!dbOk) return;
    const periodEnd = Math.floor(Date.now() / 1000) + 86400;
    const event = stripeEvent(`evt_t447_cancel_${Date.now()}`, 'customer.subscription.updated', {
      id: subExt,
      object: 'subscription',
      status: 'canceled',
      current_period_end: periodEnd,
    });
    const res = await postStripeWebhook(event);
    expect(res.statusCode).toBe(200);

    const sub = await prisma.subscription.findUnique({ where: { userId: stripeUserId } });
    expect(sub?.status).toBe('CANCELLED');
    expect(sub?.cancelledAt).not.toBeNull();
    expect(sub?.currentPeriodEnd?.getTime()).toBe(periodEnd * 1000);
  });

  it('charge.refunded → billing REFUNDED; sem transição inválida (segue CANCELLED)', async () => {
    if (!dbOk) return;
    const event = stripeEvent(`evt_t447_refund_${Date.now()}`, 'charge.refunded', {
      id: `ch_t447_${Date.now()}`,
      object: 'charge',
      subscription: subExt,
      refunded: true,
    });
    const res = await postStripeWebhook(event);
    expect(res.statusCode).toBe(200);

    const billing = await prisma.billing.findFirst({ where: { externalId: subExt } });
    expect(billing?.status).toBe('REFUNDED');

    const sub = await prisma.subscription.findUnique({ where: { userId: stripeUserId } });
    expect(sub?.status).toBe('CANCELLED'); // CANCELLED→EXPIRED não é permitida
    const events = await prisma.paymentEvent.count({ where: { type: 'charge.refunded' } });
    expect(events).toBeGreaterThanOrEqual(1);
  });

  it('assinatura forjada → 400', async () => {
    if (!dbOk) return;
    const payload = JSON.stringify(stripeEvent(`evt_t447_forge_${Date.now()}`, 'ping', {}));
    const badHeader = await stripeSignatureHeader(payload, 'whsec_errado');
    const res = app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      payload,
      headers: { 'stripe-signature': badHeader, 'content-type': 'application/json' },
    });
    expect((await res).statusCode).toBe(400);
  });
});
