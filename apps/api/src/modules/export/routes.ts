import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requirePermission } from '../auth/authenticate.middleware.js';
import { PERMISSIONS } from '../auth/rbac.service.js';
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import { exportData } from './service.js';
import {
  EXPORT_DAILY_LIMIT,
  exportQuotaKey,
  resolveExportEntitlement,
  secondsUntilUtcMidnight,
  type PlanKey,
} from './entitlement.js';

/**
 * T094/T096 — export gated pelo plano (catálogo /planos: PRO=csv, ELITE=csv+json)
 * com quota diária por plano (PRO 20/dia, ELITE 60/dia, contador Redis, janela UTC).
 *FREE segue autenticado + permissionado, mas recebe 403 com o plano mínimo.
 */
export const exportRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/export/:entityType',
    { preHandler: [authenticate, requirePermission(PERMISSIONS.EXPORT_CSV)] },
    async (request, reply) => {
      const { entityType } = request.params as { entityType: string };
      const format = ((request.query as Record<string, string>)?.format ?? 'csv') as 'csv' | 'json';

      // Plano vigente: só assinatura ACTIVE concede o plano pago (senão FREE).
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.user!.id },
        select: { plan: true, status: true },
      });
      const plan: PlanKey =
        sub?.status === 'ACTIVE' && sub.plan !== 'FREE' ? (sub.plan as PlanKey) : 'FREE';

      const entitlement = resolveExportEntitlement(plan, format);
      if (!entitlement.allowed) {
        return reply.status(403).send({
          error: {
            code: 'PLAN_REQUIRED',
            message: `Exportação ${format.toUpperCase()} exige plano ${entitlement.minPlan}.`,
            minPlan: entitlement.minPlan,
          },
        });
      }

      // Quota diária (soft: get→set sem transação; ver entitlement.ts).
      // Fail-open: quota é best-effort — Redis fora NUNCA derruba a exportação.
      const limit = EXPORT_DAILY_LIMIT[plan as Exclude<PlanKey, 'FREE'>];
      const key = exportQuotaKey(request.user!.id);
      let used: number;
      try {
        used = Number((await cache.get<string>(key)) ?? '0');
      } catch {
        used = 0; // Redis fora: quota começa do zero nesta request (fail-open).
      }
      if (used >= limit) {
        return reply
          .status(429)
          .header('Retry-After', String(secondsUntilUtcMidnight()))
          .send({
            error: {
              code: 'EXPORT_QUOTA_EXCEEDED',
              message: `Quota diária de exportação do plano ${plan} esgotada (${limit}/dia).`,
              limit,
            },
          });
      }
      try {
        await cache.set(key, String(used + 1), secondsUntilUtcMidnight());
      } catch {
        // Sem Redis: exporta sem contar (quota soft, declarado em entitlement.ts).
      }

      const result = await exportData(request.user!.id, {
        format,
        entityType: entityType as 'clubs' | 'players' | 'competitions' | 'rankings',
      });
      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);
        return reply.send(result.data as string);
      }
      return reply.send(result.data);
    },
  );
};
