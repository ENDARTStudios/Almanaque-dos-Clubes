/**
 * WS-O-1 — alertas internos (logs críticos + flag no /jobs/health).
 * SEM notificação externa nesta fase (sem email/Slack/webhook/PagerDuty):
 * o canal é o log estruturado + o buffer consultável via /jobs/health.
 */
import { queues, type QueueName } from '../../services/queue.js';
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/prisma.js';
import { getJobHealth } from '../../jobs/data-refresh.scheduler.js';

export type AlertKind = 'job_failure' | 'stale_job' | 'queue_backlog' | 'integrity_drift';

export interface Alert {
  at: string;
  kind: AlertKind;
  job?: string;
  message: string;
}

const RING_MAX = 100;
const ring: Alert[] = [];

function raise(kind: AlertKind, message: string, job?: string): Alert {
  const alert: Alert = { at: new Date().toISOString(), kind, ...(job ? { job } : {}), message };
  ring.unshift(alert);
  if (ring.length > RING_MAX) ring.length = RING_MAX;
  logger.error({ alert }, `[ALERT] ${kind}`);
  return alert;
}

export function getAlerts(limit = 20): Alert[] {
  return ring.slice(0, limit);
}

/**
 * `true` quando o job acumulou `threshold` falhas CONSECUTIVAS (última entrada
 * do health = failure e contagem de falhas ≥ threshold). Chamar APÓS cada falha.
 */
export function checkJobFailure(jobName: string, threshold = 3): boolean {
  const h = getJobHealth()[jobName];
  if (!h || h.lastStatus !== 'failure') return false;
  if (h.failureCount < threshold) return false;
  raise(
    'job_failure',
    `${jobName}: ${h.failureCount} falhas consecutivas (última: ${h.lastRunAt ?? '?'})`,
    jobName,
  );
  return true;
}

/**
 * `true` quando o job está sem run há mais de `maxAgeHours`. Se o job nunca
 * rodou (lastRunAt null), não alerta ainda — estado desconhecido até o primeiro
 * ciclo agendado (o gauge em memória zera a cada redeploy).
 */
export function checkStaleJob(jobName: string, maxAgeHours = 48): boolean {
  const h = getJobHealth()[jobName];
  if (!h || !h.lastRunAt) return false;
  const ageH = (Date.now() - new Date(h.lastRunAt).getTime()) / 3_600_000;
  if (ageH <= maxAgeHours) return false;
  raise(
    'stale_job',
    `${jobName}: sem run há ${ageH.toFixed(1)}h (limite ${maxAgeHours}h)`,
    jobName,
  );
  return true;
}

/** `true` quando a fila tem mais de `threshold` jobs esperando. */
export async function checkQueueBacklog(queue: QueueName, threshold = 100): Promise<boolean> {
  const counts = await queues[queue].getJobCounts();
  const waiting = (counts.waiting ?? 0) + (counts.prioritized ?? 0);
  if (waiting <= threshold) return false;
  raise('queue_backlog', `fila ${queue}: ${waiting} jobs esperando (limite ${threshold})`, queue);
  return true;
}

/**
 * Deriva de integridade (versão leve do job integrity-check — mesmos checks
 * críticos, sem amostras): QID ausente/duplicado e WON sem proveniência.
 */
export async function checkIntegrityDrift(): Promise<{
  drift: boolean;
  findings: Array<{ check: string; count: number }>;
}> {
  const rows = await prisma.$queryRawUnsafe<Array<{ check: string; n: bigint }>>(
    `SELECT 'clubs_active_without_qid' AS check, count(*) AS n FROM clubs WHERE "deletedAt" IS NULL AND qid IS NULL
     UNION ALL
     SELECT 'competitions_active_without_qid', count(*) FROM competitions WHERE "deletedAt" IS NULL AND qid IS NULL
     UNION ALL
     SELECT 'clubs_duplicate_qid', count(*) FROM (
       SELECT qid FROM clubs WHERE "deletedAt" IS NULL AND qid IS NOT NULL GROUP BY qid HAVING count(*) > 1
     ) d1
     UNION ALL
     SELECT 'competitions_duplicate_qid', count(*) FROM (
       SELECT qid FROM competitions WHERE "deletedAt" IS NULL AND qid IS NOT NULL GROUP BY qid HAVING count(*) > 1
     ) d2
     UNION ALL
     SELECT 'kg_won_without_provenance', count(*) FROM knowledge_graph
       WHERE relation = 'WON' AND (metadata->>'sourceUrl' IS NULL OR metadata->>'sourceUrl' = '')`,
  );
  const findings = rows
    .map((r) => ({ check: r.check, count: Number(r.n) }))
    .filter((f) => f.count > 0);
  if (findings.length > 0) {
    raise('integrity_drift', findings.map((f) => `${f.check}=${f.count}`).join(' · '));
  }
  return { drift: findings.length > 0, findings };
}
