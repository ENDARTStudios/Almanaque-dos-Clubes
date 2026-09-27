/**
 * WS-G-1 — Métricas por job (in-memory, sem SaaS). Alimenta o manifest e o log estruturado.
 */
import type { JobMetrics, SkipReason } from './types.js';

export function createMetrics(startedAt: Date = new Date()): JobMetrics {
  return {
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    durationMs: null,
    itemsProcessed: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    skippedByReason: {},
    errors: 0,
    rateLimitBackoffs: 0,
  };
}

export function recordSkip(metrics: JobMetrics, reason: SkipReason): void {
  metrics.itemsSkipped += 1;
  metrics.skippedByReason[reason] = (metrics.skippedByReason[reason] ?? 0) + 1;
}

export function recordError(metrics: JobMetrics): void {
  metrics.errors += 1;
}

export function recordBackoff(metrics: JobMetrics): void {
  metrics.rateLimitBackoffs += 1;
}

export function finishMetrics(metrics: JobMetrics, finishedAt: Date = new Date()): JobMetrics {
  metrics.finishedAt = finishedAt.toISOString();
  metrics.durationMs = finishedAt.getTime() - new Date(metrics.startedAt).getTime();
  return metrics;
}
