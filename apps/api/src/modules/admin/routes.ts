import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z, ZodError } from 'zod';
import { DomainError } from '@almanaque/domain';
import { Prisma } from '@prisma/client';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { assignRole, revokeRole, getUserRoles, listAllRoles } from '../auth/rbac.service.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';
import { changePlan, getSubscription, isValidPlan } from '../billing/subscription.service.js';

/**
 * T-ADMIN — rotas internas de gestão (usuários, papéis, trilha de auditoria).
 *
 * Toda superfície exige o MESMO trio de guardas:
 * `[authenticate, requireRole('admin'), requireOperator]` — logado, com papel
 * admin E na allowlist do operador.
 *
 * Paginação server-side (`limit`/`offset`) e filtros rodam no banco; a resposta
 * carrega `{ data, total }` para a tela conhecer o tamanho real do conjunto, e
 * não apenas o da página — "paginação cliente sobre lista inteira" não escala
 * nem num inventário de contas nem numa trilha append-only.
 */

/** Plano de assinatura — mesma taxonomia do `subscription.service`. */
const PlanEnum = z.enum(['FREE', 'PRO', 'ELITE']);

const ChangePlanSchema = z.object({ plan: PlanEnum });

const USERS_PAGE_MAX = 100;
const AUDIT_PAGE_MAX = 100;

function intParam(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Filtra usuários por plano: FREE inclui contas sem registro de assinatura. */
function planFilter(plan: 'FREE' | 'PRO' | 'ELITE'): Prisma.UserWhereInput {
  if (plan === 'FREE') {
    return {
      OR: [{ subscriptions: { none: {} } }, { subscriptions: { some: { plan: 'FREE' } } }],
    };
  }
  return { subscriptions: { some: { plan } } };
}

export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/admin/users',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const limit = intParam(q.limit, 25, 1, USERS_PAGE_MAX);
      const offset = intParam(q.offset, 0, 0, Number.MAX_SAFE_INTEGER);
      const search = (q.q ?? '').trim();

      if (q.plan && !isValidPlan(q.plan)) {
        return reply.status(422).send({
          error: { code: 'VALIDATION_ERROR', message: 'Plano inválido. Use FREE, PRO ou ELITE.' },
        });
      }

      const and: Prisma.UserWhereInput[] = [];
      if (search) {
        and.push({
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        });
      }
      if (q.plan && isValidPlan(q.plan)) and.push(planFilter(q.plan));

      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        ...(and.length ? { AND: and } : {}),
      };

      const { rows, total } = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
        const [found, count] = await Promise.all([
          tx.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
              subscriptions: { select: { plan: true }, take: 1 },
            },
          }),
          tx.user.count({ where }),
        ]);
        return { rows: found, total: count };
      });

      // `plan` sobe para o topo do registro (o array de assinaturas é detalhe de
      // modelagem, não contrato). Sem assinatura ⇒ null honesto, nunca "FREE" inventado.
      const data = rows.map(({ subscriptions, ...u }) => ({
        ...u,
        plan: subscriptions[0]?.plan ?? null,
      }));
      return reply.send({ data, total });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      const user = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.findUnique({
          where: { id: request.params.id },
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
            subscriptions: { select: { plan: true }, take: 1 },
          },
        }),
      );
      if (!user)
        return reply
          .status(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
      const roles = await getUserRoles(user.id);
      const { subscriptions, ...rest } = user;
      return reply.send({
        data: { ...rest, plan: subscriptions[0]?.plan ?? null, roles: roles.map((r) => r.name) },
      });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/suspend',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      const user = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.update({ where: { id: request.params.id }, data: { status: 'SUSPENDED' } }),
      );
      await auditLog.record({
        entityType: EntityType.USER,
        entityId: user.id,
        action: AuditAction.USER_SUSPENDED,
        userId: request.user!.id,
        metadata: { via: 'admin' },
      });
      return reply.send({ data: { id: user.id, status: user.status } });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/reactivate',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      const user = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
        tx.user.update({ where: { id: request.params.id }, data: { status: 'ACTIVE' } }),
      );
      await auditLog.record({
        entityType: EntityType.USER,
        entityId: user.id,
        action: AuditAction.USER_REACTIVATED,
        userId: request.user!.id,
        metadata: { via: 'admin' },
      });
      return reply.send({ data: { id: user.id, status: user.status } });
    },
  );

  // Troca de plano pelo operador. Passa PELO SERVIÇO de assinatura
  // (`changePlan`) — nada de SQL cru — e registra auditoria. É o que dá dente ao
  // filtro "por plano" do inventário: sem esta rota, o filtro só categorizaria.
  app.patch<{ Params: { id: string } }>(
    '/admin/users/:id/plan',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      try {
        const body = ChangePlanSchema.parse(request.body);

        const exists = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
          tx.user.findFirst({ where: { id: request.params.id }, select: { id: true } }),
        );
        if (!exists)
          return reply
            .status(404)
            .send({ error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });

        const before = await getSubscription(request.params.id);
        const updated = await changePlan(request.params.id, body.plan);

        await auditLog.record({
          entityType: EntityType.SUBSCRIPTION,
          entityId: updated.id,
          action: AuditAction.SUBSCRIPTION_PLAN_CHANGED,
          userId: request.user!.id,
          changes: { plan: { old: before?.plan ?? null, new: body.plan } },
          metadata: { targetUserId: request.params.id, via: 'admin' },
        });

        return reply.send({ data: { userId: request.params.id, plan: updated.plan } });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  // Trilha de auditoria (append-only) com filtros de usuário, ação e período,
  // MAIS paginação. Leitura pura de `audit_logs`; a escrita vive no
  // audit-log.service e nunca é exposta por rota.
  app.get(
    '/admin/audit-logs',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const limit = intParam(q.limit, 25, 1, AUDIT_PAGE_MAX);
      const offset = intParam(q.offset, 0, 0, Number.MAX_SAFE_INTEGER);
      const userId = (q.userId ?? '').trim();
      const action = (q.action ?? '').trim();

      const createdAt: Prisma.DateTimeFilter = {};
      if (q.from) {
        const from = new Date(q.from);
        if (!Number.isNaN(from.getTime())) createdAt.gte = from;
      }
      if (q.to) {
        const to = new Date(q.to);
        if (!Number.isNaN(to.getTime())) createdAt.lte = to;
      }

      const and: Prisma.AuditLogWhereInput[] = [];
      if (userId) and.push({ userId });
      if (action) and.push({ action: { contains: action, mode: 'insensitive' } });
      if (Object.keys(createdAt).length) and.push({ createdAt });

      const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};

      const { items, total } = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
        const [rows, count] = await Promise.all([
          tx.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
              id: true,
              createdAt: true,
              action: true,
              entityType: true,
              entityId: true,
              userId: true,
              metadata: true,
            },
          }),
          tx.auditLog.count({ where }),
        ]);
        return { items: rows, total: count };
      });

      return reply.send({ data: { items, total } });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/roles',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      try {
        const { role } = request.body as { role: string };
        await assignRole(request.params.id, role);
        return reply.send({ message: `Role "${role}" atribuída` });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string; role: string } }>(
    '/admin/users/:id/roles/:role',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (request, reply) => {
      try {
        await revokeRole(request.params.id, request.params.role);
        return reply.send({ message: `Role "${request.params.role}" revogada` });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    },
  );

  app.get(
    '/admin/roles',
    { preHandler: [authenticate, requireRole('admin'), requireOperator] },
    async (_request, reply) => {
      const roles = await listAllRoles();
      return reply.send({ data: roles });
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
