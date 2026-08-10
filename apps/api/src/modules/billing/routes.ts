import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
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
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';

export const billingRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
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

  app.post('/billing/webhook', async (request, reply) => {
    try {
      const body = request.body as { event: string; billingId?: string };
      if (body.event === 'payment.confirmed' && body.billingId) {
        await markBillingPaid(body.billingId);
        return reply.send({ received: true });
      }
      if (body.event === 'payment.failed' && body.billingId) {
        await failBilling(body.billingId);
        return reply.send({ received: true });
      }
      if (body.event === 'payment.refunded' && body.billingId) {
        await refundBilling(body.billingId);
        return reply.send({ received: true });
      }
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_WEBHOOK', message: 'Evento não reconhecido' } });
    } catch (err) {
      return handleDomainError(err, reply);
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
