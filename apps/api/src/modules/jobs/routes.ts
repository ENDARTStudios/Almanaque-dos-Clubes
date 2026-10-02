import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { queues } from '../../services/queue.js';
import {
  getJobHealth,
  isSchedulerEnabled,
  WIKIDATA_CRON_PATTERN,
  INTEGRITY_CRON_PATTERN,
} from '../../jobs/data-refresh.scheduler.js';

/**
 * T451 — health do scheduler data-refresh (autenticado admin).
 * Queue size, último run por job, contadores success/failure e status da flag.
 */
export const jobsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/jobs/health',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      let queueCounts: Record<string, number> | null = null;
      let queueError: string | null = null;
      try {
        const c = await queues.dataRefresh.getJobCounts();
        queueCounts = {
          waiting: c.waiting ?? 0,
          active: c.active ?? 0,
          completed: c.completed ?? 0,
          failed: c.failed ?? 0,
          delayed: c.delayed ?? 0,
        };
      } catch (err) {
        queueError = err instanceof Error ? err.message : String(err);
      }
      return reply.send({
        data: {
          schedulerEnabled: isSchedulerEnabled(),
          schedules: {
            'wikidata-incremental': WIKIDATA_CRON_PATTERN,
            'integrity-check': INTEGRITY_CRON_PATTERN,
          },
          queue: queueCounts,
          queueError,
          jobs: getJobHealth(),
        },
      });
    },
  );
};
