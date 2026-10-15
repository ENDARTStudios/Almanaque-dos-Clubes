import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { requireOperator } from '../auth/operator.middleware.js';
import { withRlsContext } from '../../config/rls-context.js';
import { auditLog, AuditAction, EntityType } from '../audit/audit-log.service.js';

/**
 * T-ADMIN — /admin/lgpd: prova de consentimento, exclusões agendadas e gatilho
 * manual da purga.
 *
 * INTERPRETAÇÃO DECLARADA
 *   1. Não existe, em `modules/privacy/**`, nenhuma purga agendada. A exclusão
 *      de conta hoje (`legal.service.deleteAccount`) é imediata: anonimiza a PII,
 *      revoga sessões e marca `users.deletedAt` — NÃO há carência de 30 dias
 *      implementada em lugar nenhum. Para não inventar estado, a "carência de 30
 *      dias" é derivada AQUI como janela de purga: `purgeEligibleAt =
 *      user.deletedAt + 30 dias`. Fica declarado que esse prazo é uma política
 *      deste endpoint, não um dado pré-existente.
 *   2. A purga real NUNCA toca o acervo (clubs/players/etc.) nem registros
 *      financeiros/de auditoria (obrigação fiscal e de defesa). Ela remove apenas
 *      dados EFÊMEROS e pessoais de contas já soft-deleted há mais de 30 dias:
 *      sessions, notifications, favorites e userActivity. Account/billings/audit
 *      permanecem (anonimizados na exclusão original).
 *   3. `?dryRun=true` (DEFAULT) só CONTA o que seria apagado. Só `dryRun=false`
 *      executa a remoção e registra auditoria. Nada destrutivo roda em leitura.
 *
 * Guards: mesmo trio `[authenticate, requireRole('admin'), requireOperator]`.
 */

const GRACE_DAYS = 30;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;
const CONSENTS_MAX = 1000;

function intParam(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export const lgpdRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const guard: import('fastify').RouteShorthandOptions = {
    preHandler: [authenticate, requireRole('admin'), requireOperator],
  };

  // Consentimentos — os últimos 1.000 logs de CookieConsent.
  app.get('/admin/lgpd/consents', guard, async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    const limit = intParam(q.limit, CONSENTS_MAX, 1, CONSENTS_MAX);

    const rows = await withRlsContext({ role: 'SERVICE' }, async (tx) =>
      tx.cookieConsent.findMany({
        orderBy: { consentedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          visitorId: true,
          version: true,
          categories: true,
          consentedAt: true,
          revokedAt: true,
          userAgent: true,
        },
      }),
    );

    return reply.send({ data: rows, limitApplied: limit });
  });

  // Exclusões agendadas — solicitações de exclusão com data-limite de purga.
  app.get('/admin/lgpd/deletions', guard, async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    const limit = intParam(q.limit, 50, 1, 200);
    const offset = intParam(q.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    const where = { type: 'anonymization_blockage_deletion', deletedAt: null } as const;

    const { rows, total } = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      const [found, count] = await Promise.all([
        tx.dataSubjectRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            protocol: true,
            userId: true,
            status: true,
            deadlineAt: true,
            completedAt: true,
            createdAt: true,
            user: { select: { deletedAt: true, status: true } },
          },
        }),
        tx.dataSubjectRequest.count({ where }),
      ]);
      return { rows: found, total: count };
    });

    const data = rows.map((r) => ({
      id: r.id,
      protocol: r.protocol,
      userId: r.userId,
      status: r.status,
      deadlineAt: r.deadlineAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      accountDeletedAt: r.user.deletedAt,
      accountStatus: r.user.status,
      // Política deste endpoint: purga elegível 30 dias após o soft-delete da conta.
      purgeEligibleAt: r.user.deletedAt ? new Date(r.user.deletedAt.getTime() + GRACE_MS) : null,
    }));

    return reply.send({ data, total, graceDays: GRACE_DAYS });
  });

  // Gatilho manual da purga. dryRun=true (default) só conta; dryRun=false executa.
  app.post('/admin/lgpd/purge', guard, async (request, reply) => {
    const q = (request.query as Record<string, string | undefined>) ?? {};
    const dryRun = q.dryRun !== 'false';
    const cutoff = new Date(Date.now() - GRACE_MS);

    const outcome = await withRlsContext({ role: 'SERVICE' }, async (tx) => {
      const eligible = await tx.user.findMany({
        where: { deletedAt: { not: null, lt: cutoff } },
        select: { id: true },
      });
      const ids = eligible.map((u) => u.id);
      if (ids.length === 0)
        return {
          eligibleUsers: 0,
          targets: { sessions: 0, notifications: 0, favorites: 0, activities: 0 },
        };

      if (dryRun) {
        const [sessions, notifications, favorites, activities] = await Promise.all([
          tx.session.count({ where: { userId: { in: ids } } }),
          tx.notification.count({ where: { userId: { in: ids } } }),
          tx.favorite.count({ where: { userId: { in: ids } } }),
          tx.userActivity.count({ where: { userId: { in: ids } } }),
        ]);
        return {
          eligibleUsers: ids.length,
          targets: { sessions, notifications, favorites, activities },
        };
      }

      const [sessions, notifications, favorites, activities] = await Promise.all([
        tx.session.deleteMany({ where: { userId: { in: ids } } }),
        tx.notification.deleteMany({ where: { userId: { in: ids } } }),
        tx.favorite.deleteMany({ where: { userId: { in: ids } } }),
        tx.userActivity.deleteMany({ where: { userId: { in: ids } } }),
      ]);
      return {
        eligibleUsers: ids.length,
        targets: {
          sessions: sessions.count,
          notifications: notifications.count,
          favorites: favorites.count,
          activities: activities.count,
        },
      };
    });

    // Auditoria SÓ no modo real — a contagem em dry-run não muta nada.
    if (!dryRun) {
      await auditLog.record({
        entityType: EntityType.USER,
        entityId: 'lgpd-purge-batch',
        action: AuditAction.ENTITY_DELETE,
        userId: request.user!.id,
        metadata: {
          resource: 'lgpd.purge',
          cutoff: cutoff.toISOString(),
          graceDays: GRACE_DAYS,
          eligibleUsers: outcome.eligibleUsers,
          targets: outcome.targets,
        },
      });
    }

    return reply.send({
      data: {
        dryRun,
        graceDays: GRACE_DAYS,
        cutoff: cutoff.toISOString(),
        eligibleUsers: outcome.eligibleUsers,
        targets: outcome.targets,
      },
    });
  });
};
