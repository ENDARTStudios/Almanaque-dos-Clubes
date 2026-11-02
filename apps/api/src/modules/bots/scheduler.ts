/**
 * T603 — SISTEMA DE BOTS: seleção do que rodar (puro, testável) e ciclo.
 *
 * O tick do agendador é de hora em hora; cada bot declara a cadência. `dueBots`
 * decide o que venceu — e o desempate é por DOMÍNIO prioritário (partidas e clubes
 * primeiro, porque é o que o usuário vê) e depois pelo mais atrasado.
 */
import type { PrismaClient } from '@prisma/client';
import { BOTS, type BotDefinition, type BotDomain } from './registry.js';
import { runBot } from './runner.js';

/** Peso de domínio no desempate (menor = mais prioritário). */
export const DOMAIN_WEIGHT: Record<BotDomain, number> = {
  partidas: 0,
  clubes: 1,
  jogadores: 2,
  rankings: 3,
  competicoes: 4,
  mapas: 5,
  catalogo: 6,
  midia: 7,
  lendas: 8,
};

export interface LastRunInfo {
  botKey: string;
  finishedAt: Date | null;
}

/** Instante em que o bot vence de novo (null = nunca rodou ⇒ vencido agora). */
export function dueAt(bot: BotDefinition, last: LastRunInfo | undefined): Date | null {
  if (!last?.finishedAt) return null;
  return new Date(last.finishedAt.getTime() + bot.cadenceHours * 3600_000);
}

/**
 * PURA — bots vencidos, na ordem de execução. `limit` corta o lote do tick.
 * Bot que nunca rodou entra primeiro dentro do seu domínio.
 */
export function dueBots(
  bots: readonly BotDefinition[],
  lastRuns: LastRunInfo[],
  now: Date,
  limit = 2,
): BotDefinition[] {
  const byKey = new Map(lastRuns.map((r) => [r.botKey, r]));
  const vencidos = bots
    .map((bot) => {
      const at = dueAt(bot, byKey.get(bot.key));
      return { bot, at };
    })
    .filter(({ at }) => at === null || at.getTime() <= now.getTime())
    .sort((a, b) => {
      const dw = DOMAIN_WEIGHT[a.bot.domain] - DOMAIN_WEIGHT[b.bot.domain];
      if (dw !== 0) return dw;
      // mais atrasado primeiro (nunca rodou = o mais atrasado de todos)
      const ta = a.at?.getTime() ?? Number.NEGATIVE_INFINITY;
      const tb = b.at?.getTime() ?? Number.NEGATIVE_INFINITY;
      return ta - tb;
    });
  return vencidos.slice(0, limit).map((v) => v.bot);
}

/** Lê a última rodada de cada bot (uma query). */
export async function lastRuns(prisma: PrismaClient): Promise<LastRunInfo[]> {
  const rows = await prisma.botRun.findMany({
    orderBy: { startedAt: 'desc' },
    select: { botKey: true, finishedAt: true, status: true },
    take: 500,
  });
  const seen = new Map<string, LastRunInfo>();
  for (const r of rows) {
    if (seen.has(r.botKey)) continue;
    // dry-run não conta como rodada: o bot continua vencido (fila parada é visível)
    if (r.status === 'SKIPPED_DRY_RUN') continue;
    seen.set(r.botKey, { botKey: r.botKey, finishedAt: r.finishedAt });
  }
  return [...seen.values()];
}

/**
 * Ciclo do agendador: roda até `limit` bots vencidos. Nunca lança — uma falha de
 * bot não derruba o scheduler (falha é registrada em `bot_runs`).
 */
export async function runBotCycle(
  prisma: PrismaClient,
  limit = 2,
  now = new Date(),
  triggeredBy = 'schedule',
): Promise<{
  ran: number;
  results: Array<{ botKey: string; status: string; delta: number | null }>;
}> {
  const due = dueBots(BOTS, await lastRuns(prisma), now, limit);
  const results: Array<{ botKey: string; status: string; delta: number | null }> = [];
  for (const bot of due) {
    const r = await runBot(prisma, bot, { apply: true, triggeredBy });
    results.push({ botKey: r.botKey, status: r.status, delta: r.delta });
  }
  return { ran: due.length, results };
}
