import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, requireRole } from '../auth/authenticate.middleware.js';
import { queues } from '../../services/queue.js';
import {
  getJobHealth,
  isSchedulerEnabled,
  WIKIDATA_CRON_PATTERN,
  INTEGRITY_CRON_PATTERN,
} from '../../jobs/data-refresh.scheduler.js';
import {
  getAlerts,
  checkQueueBacklog,
  checkIntegrityDrift,
} from '../../lib/observability/alerts.js';
import { getLogs } from '../../lib/observability/log-buffer.js';

/**
 * T451/WS-O-1 — observabilidade dos jobs (autenticado admin).
 * health: estado por job + alertas internos + checks de backlog/deriva.
 * logs: buffer circular em memória (por processo) + histórico BullMQ (Redis).
 * slo: aderência medida às cadências documentadas em docs/SLOs.md (aspiracional).
 */
/** Redis pode estar inalcançável (ioredis com maxRetriesPerRequest:null tenta
 * para sempre) — observabilidade NUNCA pode pendurar: race com teto de 3s. */
function withRedisTimeout<T>(p: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`redis timeout ${ms}ms`)), ms)),
  ]);
}

export const jobsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    '/jobs/health',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      let queueCounts: Record<string, number> | null = null;
      let queueError: string | null = null;
      try {
        const c = await withRedisTimeout(queues.dataRefresh.getJobCounts());
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

      // WS-O-1 — checks de alerta executados a cada consulta (sem efeitos,
      // apenas leituras; deriva consulta o banco com 1 query UNION).
      let drift: { drift: boolean; findings: Array<{ check: string; count: number }> } | null =
        null;
      let backlog = false;
      let checksError: string | null = null;
      try {
        backlog = await withRedisTimeout(checkQueueBacklog('dataRefresh'));
        drift = await checkIntegrityDrift();
      } catch (err) {
        checksError = err instanceof Error ? err.message : String(err);
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
          alerts: {
            active: getAlerts(10),
            backlog,
            integrityDrift: drift,
            checksError,
          },
        },
      });
    },
  );

  app.get(
    '/jobs/logs',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const q = (request.query as Record<string, string | undefined>) ?? {};
      const limit = Math.min(Math.max(parseInt(q.limit ?? '100', 10) || 100, 1), 200);
      // Histórico persistente: últimos jobs da fila data-refresh no Redis
      // (sobrevive a redeploy; removeOnComplete mantém os últimos 50).
      let queueJobs: Array<Record<string, unknown>> = [];
      let queueError: string | null = null;
      try {
        const jobs = await withRedisTimeout(
          queues.dataRefresh.getJobs(['completed', 'failed'], 0, 49),
        );
        queueJobs = jobs
          .filter((j): j is NonNullable<typeof j> => j !== undefined)
          .map((j) => ({
            id: j.id,
            name: j.name,
            state: j.failedReason ? 'failed' : 'completed',
            timestamp: j.timestamp,
            processedOn: j.processedOn,
            finishedOn: j.finishedOn,
            failedReason: j.failedReason ?? null,
            returnvalue: j.failedReason ? null : (j.returnvalue ?? null),
          }))
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
          .slice(0, limit);
      } catch (err) {
        queueError = err instanceof Error ? err.message : String(err);
      }
      return reply.send({
        data: {
          entries: getLogs(limit), // buffer em memória (por processo)
          queueJobs,
          queueError,
        },
      });
    },
  );

  app.get(
    '/observability/slo',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_request, reply) => {
      const now = Date.now();
      const health = getJobHealth();
      // Cadências-alvo (documentação: docs/06-devops-deployment/SLOs.md —
      // aspiracionais, sem binding; service não é pago).
      const targets: Record<string, { maxAgeHours: number; schedule: string }> = {
        'wikidata-incremental': { maxAgeHours: 26, schedule: '0 3 * * *' },
        'integrity-check': { maxAgeHours: 24 * 8, schedule: '0 4 * * 0' },
        'ranking:compute': { maxAgeHours: 26, schedule: '0 3 * * *' },
      };
      const slo = Object.entries(targets).map(([job, t]) => {
        const h = health[job];
        const lastRunAgeHours =
          h?.lastRunAt != null ? (now - new Date(h.lastRunAt).getTime()) / 3_600_000 : null;
        const runs = (h?.successCount ?? 0) + (h?.failureCount ?? 0);
        return {
          job,
          schedule: t.schedule,
          target: `1 run dentro de ${t.maxAgeHours}h`,
          lastRunAt: h?.lastRunAt ?? null,
          lastRunAgeHours: lastRunAgeHours != null ? Number(lastRunAgeHours.toFixed(2)) : null,
          sloMet: lastRunAgeHours != null ? lastRunAgeHours <= t.maxAgeHours : null,
          successCount: h?.successCount ?? 0,
          failureCount: h?.failureCount ?? 0,
          successRate: runs > 0 ? Number(((h?.successCount ?? 0) / runs).toFixed(3)) : null,
          // Limitação declarada: medido desde o último redeploy (counters em memória).
          measuredSince: 'last-deploy',
        };
      });
      return reply.send({ data: { measuredAt: new Date().toISOString(), slo } });
    },
  );
};
