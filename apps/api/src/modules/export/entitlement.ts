/**
 * T094/T096 — Entitlement e quota de exportação por plano.
 *
 * Fonte da verdade = catálogo publicado (/planos, `apps/web/src/lib/plan-features.ts`):
 *   PRO   → "CSV exports"
 *   ELITE → "CSV and JSON exports"
 * Ou seja: csv exige PRO; json exige ELITE; FREE não exporta (403 com plano mínimo).
 *
 * Quota diária (contador no Redis, janela = dia UTC): PRO 20/dia · ELITE 60/dia.
 * Números default escolhidos nesta tarefa — ajuste de produto pode recalibrar.
 * A checagem get→set não é atômica (corrida mínima): quota é soft por construção
 * — suficiente para o beta fechado e honesto no código (sem prometer hard-limit).
 */

export type ExportFormat = 'csv' | 'json';
export type PlanKey = 'FREE' | 'PRO' | 'ELITE';

const PLAN_RANK: Record<PlanKey, number> = { FREE: 0, PRO: 1, ELITE: 2 };

/** Limite diário por plano (formatos elegíveis). FREE não exporta. */
export const EXPORT_DAILY_LIMIT: Record<Exclude<PlanKey, 'FREE'>, number> = {
  PRO: 20,
  ELITE: 60,
};

export interface ExportEntitlement {
  allowed: boolean;
  /** Presente quando allowed=false — plano mínimo que destrava o formato. */
  minPlan?: Exclude<PlanKey, 'FREE'>;
}

export function resolveExportEntitlement(plan: PlanKey, format: ExportFormat): ExportEntitlement {
  const minPlan = format === 'json' ? 'ELITE' : 'PRO';
  if (PLAN_RANK[plan] >= PLAN_RANK[minPlan]) return { allowed: true };
  return { allowed: false, minPlan };
}

/** Chave do contador diário (dia UTC embutido — TTL e janela coincidem). */
export function exportQuotaKey(userId: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return `export:quota:${userId}:${day}`;
}

/** Segundos até a meia-noite UTC (TTL do contador). */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}
