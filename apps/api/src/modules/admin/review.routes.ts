/**
 * T599/DQ-04 — rotas admin da FILA DE REVISÃO de dados.
 *
 * Autorização: o trio das demais rotas internas (authenticate + requireRole('admin')
 * + requireOperator) — a fila decide o que o PÚBLICO vê; só o Operador/a equipe
 * mexe nela.
 *
 * Contrato:
 *   GET    /admin/review-queue?status=PENDING&severity=high&limit=&offset=
 *   POST   /admin/review-queue/:id/resolve   { note }  — o dado foi corrigido
 *   POST   /admin/review-queue/:id/dismiss   { note }  — falso positivo / aceito
 * A checagem volta a abrir a mesma pendência (UNIQUE parcial) se o integrity-check
 * tornar a encontrar a anomalia — fechar aqui não silencia o problema para sempre.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { withRlsContext } from '../../config/rls-context.js';
import { prisma } from '../../config/prisma.js';

const NoteSchema = z.object({ note: z.string().max(500).optional() });

export const reviewRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const guard = { preHandler: [authenticate, requireRole('admin'), requireOperator] };

  app.get(
    '/admin/review-queue',
    {
      ...guard,
      config: {
        rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
      },
    },
    async (request, reply) => {
      try {
        const q = (request.query as Record<string, string | undefined>) ?? {};
        const status = q.status ?? 'PENDING';
        if (!['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'].includes(status)) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'status inválido (PENDING|RESOLVED|DISMISSED|ALL)',
            },
          });
        }
        const limit = Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 200);
        const offset = Math.max(parseInt(q.offset ?? '0', 10) || 0, 0);
        // A fila é ferramenta interna; a leitura roda com contexto SERVICE para não
        // depender de RLS de owner (não há owner aqui — é dado de qualidade).
        const data = await withRlsContext(
          { userId: request.user!.id, role: 'SERVICE' },
          async (tx) =>
            tx.reviewQueue.findMany({
              where: status === 'ALL' ? {} : { status },
              orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }], // high < low alfabeticamente
              take: limit,
              skip: offset,
              select: {
                id: true,
                entityType: true,
                entityId: true,
                check: true,
                reason: true,
                severity: true,
                status: true,
                createdAt: true,
                resolvedAt: true,
                resolvedBy: true,
                resolutionNote: true,
              },
            }),
        );
        const total = await prisma.reviewQueue.count({
          where: status === 'ALL' ? {} : { status },
        });
        return reply.send({ data, total, limit, offset });
      } catch (err) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
      }
    },
  );

  for (const [path, newStatus] of [
    ['/admin/review-queue/:id/resolve', 'RESOLVED'],
    ['/admin/review-queue/:id/dismiss', 'DISMISSED'],
  ] as const) {
    app.post<{ Params: { id: string } }>(
      path,
      {
        ...guard,
        config: {
          rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: (r) => r.user?.id ?? r.ip },
        },
      },
      async (request, reply) => {
        try {
          const parsed = NoteSchema.safeParse(request.body);
          if (!parsed.success) {
            return reply
              .status(422)
              .send({ error: { code: 'VALIDATION_ERROR', message: 'Payload inválido' } });
          }
          const row = await prisma.reviewQueue.findUnique({ where: { id: request.params.id } });
          if (!row) {
            return reply
              .status(404)
              .send({ error: { code: 'NOT_FOUND', message: 'Pendência não encontrada' } });
          }
          if (row.status !== 'PENDING') {
            return reply.status(409).send({
              error: { code: 'ALREADY_RESOLVED', message: `Pendência já está ${row.status}` },
            });
          }
          const updated = await prisma.reviewQueue.update({
            where: { id: row.id },
            data: {
              status: newStatus,
              resolvedBy: request.user!.id,
              resolvedAt: new Date(),
              resolutionNote: parsed.data.note ?? null,
            },
          });
          return reply.send({ data: updated });
        } catch (err) {
          request.log.error(err);
          return reply
            .status(500)
            .send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } });
        }
      },
    );
  }
};
