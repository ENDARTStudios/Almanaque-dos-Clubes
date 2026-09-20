import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { DomainError, NotFoundError } from '@almanaque/domain';
import {
  getSubscription,
  changePlan,
  cancelSubscription,
  isActiveSubscription,
  listUserBillings,
  refundBilling,
  withdrawSubscription,
} from './subscription.service.js';
import {
  createCheckoutSession,
  handleStripeEvent,
  refundStripeSubscription,
} from './stripe.service.js';
import { isStripeConfigured, getStripe, STRIPE_WEBHOOK_SECRET } from '../../config/stripe.js';
import { mapCountryToCurrency } from '@almanaque/domain';
import { resolveCountryForIp } from './geo.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { applyPaymentEvent } from './payment-events.service.js';
import { verifyHmacAndTimestamp, signMockPayload } from './providers/payment-provider.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

const CheckoutSchema = z.object({
  // A moeda é definida pela localização real do usuário (request.ip → país).
  // O cliente NÃO envia a moeda e NUNCA a escolhe. Campos extras são ignorados.
  plan: z.enum(['PRO', 'ELITE']),
  interval: z.enum(['month', 'year']),
});

export const billingRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Captura rawBody para verificação de assinatura do webhook (Stripe exige bytes exatos).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as unknown as { rawBody?: string }).rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error);
    }
  });

  app.get('/billing/subscription', { preHandler: [authenticate] }, async (request, reply) => {
    const sub = await getSubscription(request.user!.id);
    if (!sub) throw new NotFoundError('Assinatura', request.user!.id);
    return reply.send({ data: sub });
  });

  app.put('/billing/plan', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { plan } = request.body as { plan: string };
      const sub = await changePlan(request.user!.id, plan as 'FREE' | 'PRO' | 'ELITE');
      return reply.send({ data: sub });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  app.post('/billing/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    // T447 — assinatura Stripe: cancela no provedor primeiro (cancel_at_period_end;
    // renovação encerra, acesso mantido até o fim do ciclo). Sem isto o Stripe
    // continuaria cobrando após o cancelamento na UI. Local permanece ACTIVE até
    // o webhook de cancelamento efetivo (fim do ciclo) → CANCELLED.
    const paid = (await listUserBillings(request.user!.id, { status: 'PAID', limit: 1 }))[0];
    if (paid?.externalId && isStripeConfigured()) {
      try {
        await getStripe().subscriptions.update(paid.externalId, { cancel_at_period_end: true });
        const sub = await getSubscription(request.user!.id);
        return reply.send({ data: sub });
      } catch {
        return reply.status(502).send({
          error: {
            code: 'PROVIDER_ERROR',
            message: 'Falha ao cancelar no provedor de pagamento.',
          },
        });
      }
    }
    const sub = await cancelSubscription(request.user!.id);
    return reply.send({ data: sub });
  });

  app.post('/billing/withdraw', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const paid = (await listUserBillings(userId, { status: 'PAID', limit: 1 }))[0];
      if (paid?.externalId) await refundStripeSubscription(paid.externalId);
      const sub = await withdrawSubscription(userId);
      return reply.send({ data: sub });
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('prazo') || err.message.includes('assinatura paga'))
      ) {
        return reply
          .status(400)
          .send({ error: { code: 'WITHDRAW_NOT_ELIGIBLE', message: err.message } });
      }
      return handleDomainError(err, reply);
    }
  });

  app.get('/billing/active', { preHandler: [authenticate] }, async (request, reply) => {
    return reply.send({ data: { active: await isActiveSubscription(request.user!.id) } });
  });

  app.get('/billing/invoices', { preHandler: [authenticate] }, async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    const billings = await listUserBillings(request.user!.id, {
      status: q.status as 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' | 'CANCELLED' | undefined,
      limit: Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 100),
      offset: Math.max(parseInt(q.offset ?? '0', 10) || 0, 0),
    });
    return reply.send({ data: billings });
  });

  // Cria uma sessão de Checkout Stripe e devolve a URL de pagamento.
  // T444 — checkout só existe com a flag de monetização ativa (default off;
  // ativação = env do Operador quando o merchant existir — M3).
  if (process.env.PAYMENTS_ENABLED === 'true') {
    app.post('/billing/checkout', { preHandler: [authenticate] }, async (request, reply) => {
      try {
        if (!isStripeConfigured()) {
          return reply.status(503).send({
            error: {
              code: 'PAYMENT_UNAVAILABLE',
              message: 'Pagamento ainda não configurado (STRIPE_SECRET_KEY ausente).',
            },
          });
        }
        const { plan, interval } = CheckoutSchema.parse(request.body);
        // Moeda pela localização real (país do IP) — NUNCA por idioma/usuário.
        const country = await resolveCountryForIp(request.ip);
        const currency = mapCountryToCurrency(country);
        const base = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:3001';
        const result = await createCheckoutSession({
          userId: request.user!.id,
          plan,
          interval,
          currency,
          successUrl: base + '/dashboard/subscription?checkout=success',
          cancelUrl: base + '/planos?checkout=canceled',
          customerEmail: (request.user as unknown as { email?: string }).email ?? null,
        });
        return reply.send({ data: result });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    });
  }

  // -----------------------------------------------------------------
  // T444 — Webhooks verificados (HMAC/assinatura + idempotência por
  // providerEventId em payment_events). O fallback antigo não-assinado foi
  // REMOVIDO (aceitava eventos forjados quando Stripe não configurado).
  // -----------------------------------------------------------------
  app.post('/billing/webhook', async (request, reply) => {
    const raw = (request as unknown as { rawBody?: string }).rawBody;
    const sig = request.headers['stripe-signature'] as string | undefined;
    const configured = isStripeConfigured() && Boolean(STRIPE_WEBHOOK_SECRET);
    if (!configured || !raw || !sig) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_WEBHOOK', message: 'Assinatura obrigatória' } });
    }
    let event;
    try {
      event = getStripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: (err as Error).message } });
    }
    await handleStripeEvent(event);
    return reply.send({ received: true });
  });

  app.post('/billing/webhooks/mock', async (request, reply) => {
    // Guard: mock é proibido em produção (pagamento falso nunca em prod).
    if (process.env.NODE_ENV === 'production') {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Rota não disponível em produção' } });
    }
    const secret = process.env.MOCK_WEBHOOK_SECRET;
    if (!secret) {
      return reply.status(503).send({
        error: { code: 'PAYMENTS_UNAVAILABLE', message: 'MOCK_WEBHOOK_SECRET não configurado' },
      });
    }
    const raw = (request as unknown as { rawBody?: string }).rawBody;
    const signature = request.headers['x-mock-signature'] as string | undefined;
    const timestamp = request.headers['x-mock-timestamp'] as string | undefined;
    try {
      verifyHmacAndTimestamp(raw ?? '', signature, timestamp, secret);
    } catch (err) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: (err as Error).message } });
    }

    let parsed: { id?: string; type?: string; userId?: string; plan?: 'PRO' | 'ELITE' | 'FREE' };
    try {
      parsed = JSON.parse(raw ?? '{}');
    } catch {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_WEBHOOK', message: 'JSON inválido' } });
    }
    if (!parsed.id || !parsed.type || !parsed.userId) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'id/type/userId obrigatórios' } });
    }

    const outcome = await applyPaymentEvent({
      provider: 'mock',
      providerEventId: parsed.id,
      type: parsed.type,
      userId: parsed.userId,
      plan: parsed.plan,
      payload: parsed,
    });
    return reply.send({ received: true, ...outcome });
  });

  // Utilitário de teste/preview: assina um payload mock (fora de produção).
  app.post('/billing/webhooks/mock/sign', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }
    const secret = process.env.MOCK_WEBHOOK_SECRET;
    if (!secret) {
      return reply.status(503).send({ error: { code: 'PAYMENTS_UNAVAILABLE' } });
    }
    const raw = (request as unknown as { rawBody?: string }).rawBody;
    const timestamp = String(Math.floor(Date.now() / 1000));
    return reply.send({
      data: { timestamp, signature: signMockPayload(raw ?? '', timestamp, secret) },
    });
  });

  app.post<{ Params: { billingId: string } }>(
    '/billing/admin/refund/:billingId',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.BILLINGS_REFUND)] },
    async (request, reply) => {
      try {
        const billing = await refundBilling(request.params.billingId);
        return reply.send({ data: billing });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );
};

function handleDomainError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof DomainError)
    return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
  if (err instanceof ZodError)
    return reply
      .status(422)
      .send({ error: { code: 'VALIDATION_ERROR', message: 'Payload inválido' } });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
