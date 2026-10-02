/**
 * WS-O-1 — buffer circular de logs estruturados dos jobs (em memória, máx 200).
 * Limitação declarada: por processo — zera a cada redeploy (mesma semântica dos
 * counters de health). Histórico persistente cross-restart vem da fila BullMQ
 * (GET /jobs/logs inclui `queueJobs` lido do Redis).
 */

export interface LogEntry {
  at: string;
  level: 'info' | 'warn' | 'error';
  job: string;
  event: string;
  data?: Record<string, unknown>;
}

const RING_MAX = 200;
const ring: LogEntry[] = [];

export function pushLog(entry: Omit<LogEntry, 'at'>): void {
  ring.unshift({ at: new Date().toISOString(), ...entry });
  if (ring.length > RING_MAX) ring.length = RING_MAX;
}

export function getLogs(limit = 100): LogEntry[] {
  return ring.slice(0, Math.min(Math.max(limit, 1), RING_MAX));
}
