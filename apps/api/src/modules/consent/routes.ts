import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { CreateConsentSchema } from './schema.js';
import { recordConsent, getCurrentConsent } from './consent.service.js';

export const consentRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // T436 — prova de consentimento (LGPD). Rota pública (visitante anônimo),
  // protegida pelo csrfMiddleware global; rate-limit global por IP também aplica.
  app.post('/consent', async (request, reply) => {
    try {
      const input = CreateConsentSchema.parse(request.body);
      const consent = await recordConsent(input, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(201).send({
        data: {
          id: consent.id,
          version: consent.version,
          categories: consent.categories,
          consentedAt: consent.consentedAt,
        },
      });
    } catch (err) {
      return handleConsentError(err, reply);
    }
  });

  // Consentimento vigente de um visitante (por visitorId anônimo do próprio
  // visitante — sem auth, sem PII além do hash já filtrado pelo schema).
  app.get('/consent/current', async (request, reply) => {
    try {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const parsed = CreateConsentSchema.pick({ visitorId: true }).parse({
        visitorId: q.visitorId ?? '',
      });
      const consent = await getCurrentConsent(parsed.visitorId);
      return reply.send({ data: consent });
    } catch (err) {
      return handleConsentError(err, reply);
    }
  });
};

function handleConsentError(err: unknown, reply: FastifyReply) {
  if (err instanceof ZodError)
    return reply
      .status(422)
      .send({ error: { code: 'VALIDATION_ERROR', message: 'Payload inválido' } });
  return reply
    .status(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
}
