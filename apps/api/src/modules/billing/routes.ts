import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { DomainError, NotFoundError } from '@almanaque/domain';
import {
  getSubscription,
  changePlan,
  cancelSubscription,
  isActiveSubscription,
  listUserBillings,
  markBillingPaid,
  refundBilling,
  failBilling,
} from './subscription.service.js';
import { createCheckoutSession, handleStripeEvent } from './stripe.service.js';
import { isStripeConfigured, getStripe, STRIPE_WEBHOOK_SECRET } from '../../config/stripe.js';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

const CheckoutSchema = z.object({
  plan: z.enum(['PRO', 'ELITE']),
  interval: z.enum(['month', 'year']),
  currency: z.enum(['BRL', 'USD', 'EUR']).optional(),
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
    const sub = await cancelSubscription(request.user!.id);
    return reply.send({ data: sub });
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
      const { plan, interval, currency } = CheckoutSchema.parse(request.body);
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

  app.post('/billing/webhook', async (request, reply) => {
    const raw = (request as unknown as { rawBody?: string }).rawBody;
    const sig = request.headers['stripe-signature'] as string | undefined;
    const configured = isStripeConfigured() && Boolean(STRIPE_WEBHOOK_SECRET);

    // Fallback de teste local (sem Stripe): aceita eventos simulados.
    if (!configured || !raw || !sig) {
      try {
        const body = request.body as { event: string; billingId?: string };
        if (body.event === 'payment.confirmed' && body.billingId)
          await markBillingPaid(body.billingId);
        else if (body.event === 'payment.failed' && body.billingId)
          await failBilling(body.billingId);
        else if (body.event === 'payment.refunded' && body.billingId)
          await refundBilling(body.billingId);
        else
          return reply
            .status(400)
            .send({ error: { code: 'INVALID_WEBHOOK', message: 'Evento não reconhecido' } });
        return reply.send({ received: true });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }

    try {
      const event = getStripe().webhooks.constructEvent(raw!, sig!, STRIPE_WEBHOOK_SECRET);
      await handleStripeEvent(event);
      return reply.send({ received: true });
    } catch {
      return reply.status(400).send({
        error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Assinatura do webhook inválida' },
      });
    }
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
