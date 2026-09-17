import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getStripe, STRIPE_WEBHOOK_SECRET } from './stripe.service.js';
import {
  verifyHmacAndTimestamp,
  parseMockEvent,
  signMockPayload,
} from './providers/payment-provider.js';
import { applyPaymentEvent } from './payment-events.service.js';

/**
 * T444 — Webhooks de pagamento, idempotentes e verificados.
 *
 *  - Stripe: assinatura verificada pelo SDK (HMAC + tolerância de timestamp).
 *  - Mock: HMAC-SHA256 own-secret + timestamp ±5min — SOMENTE fora de
 *    produção (guard de env), para testes/preview.
 *
 * Idempotência: `payment_events.providerEventId` UNIQUE — o mesmo evento
 * processado 2× responde 200 { duplicate: true } sem efeito colateral.
 * Resposta rápida: o processamento é curto (estado + auditoria); nada de
 * trabalho pesado no caminho do webhook.
 */
export const paymentWebhookRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Captura rawBody — a assinatura HMAC/Stripe é calculada sobre os bytes
  // exatos do corpo (o parser JSON padrão alteraria a verificação).
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req: unknown, body: string, done: (err: Error | null, result?: unknown) => void) => {
      (req as unknown as { rawBody?: string }).rawBody = body as string;
      try {
        done(null, body ? JSON.parse(body as string) : {});
      } catch (err) {
        done(err as Error);
      }
    },
  );

  app.post('/billing/webhooks/stripe', async (request, reply) => {
    if (!STRIPE_WEBHOOK_SECRET || !getStripe()) {
      return reply.status(503).send({
        error: { code: 'PAYMENTS_UNAVAILABLE', message: 'Stripe não configurado' },
      });
    }
    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? '';
    const signature = request.headers['stripe-signature'] as string | undefined;
    let event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, signature ?? '', STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return reply.status(400).send({
        error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: (err as Error).message },
      });
    }

    // Mapeamento Stripe → evento interno verificado
    const map: Record<string, { type: string } | undefined> = {
      'checkout.session.completed': { type: 'checkout.succeeded' },
      'customer.subscription.updated': { type: 'subscription.past_due' },
      'customer.subscription.deleted': { type: 'subscription.canceled' },
    };
    const mapped = map[event.type];
    if (!mapped) return reply.send({ received: true, ignored: event.type });

    const sessionOrSub = event.data.object as {
      metadata?: { userId?: string; plan?: 'PRO' | 'ELITE' | 'FREE' };
      id?: string;
    };
    const userId = sessionOrSub.metadata?.userId;
    if (!userId) return reply.send({ received: true, ignored: 'sem userId no metadata' });

    const outcome = await applyPaymentEvent({
      provider: 'stripe',
      providerEventId: event.id,
      type: mapped.type,
      userId,
      plan: sessionOrSub.metadata?.plan,
      payload: event.data.object as unknown,
    });
    return reply.send({ received: true, ...outcome });
  });

  app.post('/billing/webhooks/mock', async (request, reply) => {
    // Guard: mock é proibido em produção (pagamento falso nunca em prod).
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Rota não disponível em produção' },
      });
    }
    const secret = process.env.MOCK_WEBHOOK_SECRET;
    if (!secret) {
      return reply.status(503).send({
        error: { code: 'PAYMENTS_UNAVAILABLE', message: 'MOCK_WEBHOOK_SECRET não configurado' },
      });
    }
    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? '';
    const signature = request.headers['x-mock-signature'] as string | undefined;
    const timestamp = request.headers['x-mock-timestamp'] as string | undefined;
    try {
      verifyHmacAndTimestamp(rawBody, signature, timestamp, secret);
    } catch (err) {
      return reply.status(400).send({
        error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: (err as Error).message },
      });
    }

    const event = parseMockEvent(rawBody);
    const outcome = await applyPaymentEvent({
      provider: 'mock',
      providerEventId: event.id,
      type: event.type,
      userId: event.userId,
      plan: event.plan,
      payload: event.raw,
    });
    return reply.send({ received: true, ...outcome });
  });

  // Utilitário de teste: assina um payload mock com o segredo configurado.
  app.post('/billing/webhooks/mock/sign', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }
    const secret = process.env.MOCK_WEBHOOK_SECRET;
    if (!secret) return reply.status(503).send({ error: { code: 'PAYMENTS_UNAVAILABLE' } });
    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? '';
    const timestamp = String(Math.floor(Date.now() / 1000));
    return reply.send({
      data: { timestamp, signature: signMockPayload(rawBody, timestamp, secret) },
    });
  });
};
