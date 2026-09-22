/**
 * T445 — Rotas de copyright claims (DMCA art. 512 / Lei 9.610/98).
 *
 * Público: POST com honeypot (`website` — campo invisível; preenchido =
 * bot descarta silenciosamente com resposta idêntica) e rate-limit de rota.
 * Admin: listagem + transições com decisão motivada (USERS_MANAGE).
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { handleError } from '../privacy/privacy.routes.js';
import { createClaim, listClaims, transitionClaim } from './copyright.service.js';

const CreateSchema = z.object({
  material: z.string().min(10).max(2000),
  location: z.string().min(4).max(500),
  fundament: z.string().min(10).max(2000),
  contactEmail: z.string().email().max(200),
  // Honeypot: campo invisível no formulário real; bot preenche.
  website: z.string().max(300).optional(),
});

const TransitionSchema = z.object({
  to: z.enum(['recebida', 'em_analise', 'deferida', 'indeferida', 'retirado']),
  resolution: z.string().max(2000).optional(),
});

export const copyrightRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post(
    '/copyright-claims',
    {
      // Público (art. 512: notificação de terceiros sem conta) — defesa:
      // rate-limit de rota + honeypot. Rate-limit global já está ativo;
      // este é o teto dedicado do formulário.
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      try {
        const body = CreateSchema.parse(request.body);
        if (body.website) {
          // Honeypot preenchido → descarta sem revelar (resposta idêntica).
          return reply.status(201).send({ data: { id: randomProtocol(), status: 'recebida' } });
        }
        const created = await createClaim({
          material: body.material,
          location: body.location,
          fundament: body.fundament,
          contactEmail: body.contactEmail,
        });
        return reply.status(201).send({ data: created });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );

  app.get(
    '/admin/copyright-claims',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const rows = await listClaims({
        status: q.status,
        limit: parseInt(q.limit ?? '50', 10) || 50,
        offset: parseInt(q.offset ?? '0', 10) || 0,
      });
      return reply.send({ data: rows });
    },
  );

  app.post(
    '/admin/copyright-claims/:id/transition',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.USERS_MANAGE)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = TransitionSchema.parse(request.body);
        const adminUserId = (request as { user: { id: string } }).user.id;
        const updated = await transitionClaim({
          id,
          to: body.to,
          adminUserId,
          resolution: body.resolution ?? null,
        });
        return reply.send({ data: updated });
      } catch (err) {
        return handleError(err, reply);
      }
    },
  );
};

/** Protocolo falso para respostas de honeypot (formato idêntico ao real). */
function randomProtocol(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
