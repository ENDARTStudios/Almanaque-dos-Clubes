/**
 * T-24/28 — ORQUESTRADOR DOS BOTS: execução, estado durável e resumo do monitor.
 *
 * Decisões:
 *  - `runBot` SEMPRE registra a rodada (running → ok/partial/failed/skipped) e
 *    atualiza `BotState`, mesmo quando o bot lança. Uma falha nunca derruba a rodada.
 *  - `consecutiveFailures` só sobe em `failed`; qualquer desfecho não-falho zera.
 *    A partir de 3, dispara alerta interno (não depende de health em memória).
 *  - `runRound` executa o registry NA ORDEM com orçamento total (20 min). Quando o
 *    orçamento estoura, os bots restantes são registrados como `skipped` com
 *    `message` começando por `budget` — o monitor mostra o corte, não o esconde.
 *  - O scheduler de 4h NÃO chama `runRound` dentro de um job único (estouraria o
 *    teto de 10 min). Ele enfileira 1 job por bot na fila `bots` (concorrência 1);
 *    o `deadline` viaja no payload e o worker aplica a mesma regra de orçamento.
 */
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { metrics } from '../observability/metrics.js';
import { checkBotFailure, checkJobFailure } from '../../lib/observability/alerts.js';
import { pushLog } from '../../lib/observability/log-buffer.js';
import { BOTS, getBot } from './registry.js';
import type { BotDefinition, BotOutcome, BotRunResult, BotRunStatus, BotTrigger } from './types.js';

/** Teto por bot (mesmo teto dos jobs de ETL). */
export const BOT_TIMEOUT_MS = 10 * 60 * 1000;
/** Orçamento total de uma rodada com os 12 bots. */
export const ROUND_BUDGET_MS = 20 * 60 * 1000;

/** Subconjunto do Prisma usado pelo serviço (facilita teste com fake). */
export type BotsPrisma = Pick<PrismaClient, 'botState' | 'botRun'>;

export interface RunBotOptions {
  prisma?: BotsPrisma;
  /** Override para testes (o registry é a fonte de produção). */
  bot?: BotDefinition;
  deadline?: number;
  roundId?: string;
  timeoutMs?: number;
  now?: () => number;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Classificação final persistida (o bot só devolve ok|partial|skipped). */
export function finalStatus(outcome: BotOutcome): Exclude<BotRunStatus, 'running'> {
  if (outcome.status === 'skipped') return outcome.errors > 0 ? 'failed' : 'skipped';
  if (outcome.errors > 0 && outcome.processed > 0) return 'partial';
  if (outcome.errors > 0) return 'failed';
  return outcome.status;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label}: timeout de ${Math.round(ms / 60000)} min`)),
        ms,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Executa UM bot e persiste a rodada. Nunca lança por falha do bot (vira
 * `failed` registrado); só lança se o id não existir no registry.
 */
export async function runBot(
  botId: string,
  trigger: BotTrigger,
  opts: RunBotOptions = {},
): Promise<BotRunResult> {
  const bot = opts.bot ?? getBot(botId);
  if (!bot) throw new Error(`bot desconhecido: ${botId}`);

  const db = opts.prisma ?? defaultPrisma;
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? BOT_TIMEOUT_MS;
  const startedAt = new Date(now());
  const startedMs = now();

  pushLog({
    level: 'info',
    job: `bot:${bot.id}`,
    event: 'start',
    data: { trigger, roundId: opts.roundId ?? null },
  });

  // Estado criado/atualizado antes da rodada: a FK de bot_runs exige a linha.
  const state = await db.botState.upsert({
    where: { id: bot.id },
    create: { id: bot.id, domain: bot.domain, label: bot.label },
    update: { domain: bot.domain, label: bot.label },
  });
  const previousFailures = state.consecutiveFailures ?? 0;

  const run = await db.botRun.create({
    data: {
      botId: bot.id,
      botKey: bot.id,
      status: 'running',
      trigger,
      startedAt,
    },
  });

  let outcome: BotOutcome = {
    status: 'skipped',
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    message: '',
  };
  let thrown: unknown = null;

  const budgetExhausted = opts.deadline != null && now() > opts.deadline;
  if (budgetExhausted) {
    outcome = {
      status: 'skipped',
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      message: 'budget: orçamento de 20 min da rodada esgotado antes deste bot começar',
    };
  } else {
    try {
      outcome = await withTimeout(
        Promise.resolve(
          bot.run({
            prisma: db as PrismaClient,
            trigger,
            deadline: opts.deadline,
            roundId: opts.roundId,
          }),
        ),
        timeoutMs,
        `bot:${bot.id}`,
      );
    } catch (err) {
      thrown = err;
    }
  }

  const finishedAt = new Date(now());
  const durationMs = now() - startedMs;
  const status: Exclude<BotRunStatus, 'running'> = thrown ? 'failed' : finalStatus(outcome);
  const message = thrown ? errorMessage(thrown) : (outcome.message ?? null);
  const errors = thrown ? Math.max(1, outcome.errors) : outcome.errors;
  const consecutiveFailures = status === 'failed' ? previousFailures + 1 : 0;

  await db.botRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt,
      processed: outcome.processed,
      updated: outcome.updated,
      skipped: outcome.skipped,
      errors,
      message,
      durationMs,
      error: thrown ? message : null,
    },
  });
  await db.botState.update({
    where: { id: bot.id },
    data: {
      lastRunAt: finishedAt,
      lastStatus: status,
      consecutiveFailures,
      lastMessage: message,
    },
  });

  metrics.inc('bots_runs_total', { status });
  metrics.set('bots_last_run_age_seconds', { bot: bot.id }, 0);
  metrics.set('bots_consecutive_failures', { bot: bot.id }, consecutiveFailures);

  pushLog({
    level: status === 'failed' ? 'error' : 'info',
    job: `bot:${bot.id}`,
    event: 'done',
    data: {
      status,
      processed: outcome.processed,
      updated: outcome.updated,
      skipped: outcome.skipped,
      errors,
      durationMs,
      message,
    },
  });
  logger.info(
    {
      bot: bot.id,
      trigger,
      status,
      processed: outcome.processed,
      updated: outcome.updated,
      errors,
    },
    'bot: rodada finalizada',
  );

  if (status === 'failed') {
    // Integração com o alerta genérico (o `bot:*` não tem entry de health hoje,
    // então o alerta real do bot é o checkBotFailure abaixo, por estado durável).
    checkJobFailure(`bot:${bot.id}`);
  }
  if (consecutiveFailures >= 3) {
    checkBotFailure(bot.id, consecutiveFailures);
  }

  return {
    botId: bot.id,
    status,
    processed: outcome.processed,
    updated: outcome.updated,
    skipped: outcome.skipped,
    errors,
    message: message ?? undefined,
    startedAt,
    finishedAt,
    durationMs,
    consecutiveFailures,
  };
}

export interface RoundSummary {
  total: number;
  ok: number;
  partial: number;
  skipped: number;
  failed: number;
  processed: number;
  updated: number;
  errors: number;
}

/** Agrega os desfechos de uma rodada (puro — testável). */
export function summarizeRuns(results: readonly BotRunResult[]): RoundSummary {
  const summary: RoundSummary = {
    total: results.length,
    ok: 0,
    partial: 0,
    skipped: 0,
    failed: 0,
    processed: 0,
    updated: 0,
    errors: 0,
  };
  for (const r of results) {
    summary[r.status] += 1;
    summary.processed += r.processed;
    summary.updated += r.updated;
    summary.errors += r.errors;
  }
  return summary;
}

export interface RunRoundOptions {
  bots?: readonly BotDefinition[];
  prisma?: BotsPrisma;
  budgetMs?: number;
  /** Deadline já calculado (usado pelo job enfileirado). */
  deadline?: number;
  roundId?: string;
  now?: () => number;
  timeoutMs?: number;
}

export interface RoundResult {
  roundId: string;
  results: BotRunResult[];
  summary: RoundSummary;
}

/**
 * Executa o registry NA ORDEM, com orçamento total. Bot que chega depois do
 * deadline é registrado como `skipped` (motivo `budget`) — sem executar.
 */
export async function runRound(
  trigger: BotTrigger,
  opts: RunRoundOptions = {},
): Promise<RoundResult> {
  const bots = opts.bots ?? BOTS;
  const now = opts.now ?? Date.now;
  const budgetMs = opts.budgetMs ?? ROUND_BUDGET_MS;
  const deadline = opts.deadline ?? now() + budgetMs;
  const roundId = opts.roundId ?? randomUUID();
  const results: BotRunResult[] = [];

  for (const bot of bots) {
    results.push(
      await runBot(bot.id, trigger, {
        bot,
        prisma: opts.prisma,
        deadline,
        roundId,
        now,
        timeoutMs: opts.timeoutMs,
      }),
    );
  }

  const summary = summarizeRuns(results);
  logger.info({ roundId, trigger, ...summary }, 'bots: rodada concluída');
  return { roundId, results, summary };
}

// ---------------------------------------------------------------------------
// Leitura para o monitor
// ---------------------------------------------------------------------------

export interface BotLastRun {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string | null;
}

export interface BotMonitorItem {
  id: string;
  domain: string;
  label: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  consecutiveFailures: number;
  lastMessage: string | null;
  lastRun: BotLastRun | null;
}

export interface BotsMonitorSummary {
  total: number;
  running: number;
  ok: number;
  failed: number;
  /** Maior idade (ms) entre os últimos runs; 0 quando nenhum bot nunca rodou. */
  staleMs: number;
}

export interface BotsSummary {
  bots: BotMonitorItem[];
  summary: BotsMonitorSummary;
}

interface RunRow {
  id: string;
  botId: string;
  status: string;
  trigger: string;
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string | null;
}

export async function runsSummary(
  opts: { prisma?: BotsPrisma; now?: () => number } = {},
): Promise<BotsSummary> {
  const db = opts.prisma ?? defaultPrisma;
  const now = opts.now ?? Date.now;
  const ids = BOTS.map((b) => b.id);
  const [states, lastRuns, running] = await Promise.all([
    db.botState.findMany({ where: { id: { in: ids } } }),
    db.botRun.findMany({
      where: { botId: { in: ids } },
      orderBy: { startedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        botId: true,
        status: true,
        trigger: true,
        startedAt: true,
        finishedAt: true,
        processed: true,
        updated: true,
        skipped: true,
        errors: true,
        message: true,
      },
    }) as Promise<RunRow[]>,
    db.botRun.count({ where: { status: 'running' } }),
  ]);

  const stateById = new Map(states.map((s) => [s.id, s]));
  const lastByBot = new Map<string, RunRow>();
  for (const run of lastRuns) {
    if (!lastByBot.has(run.botId)) lastByBot.set(run.botId, run);
  }

  let staleMs = 0;
  const nowMs = now();
  const bots: BotMonitorItem[] = BOTS.map((bot) => {
    const state = stateById.get(bot.id);
    const last = lastByBot.get(bot.id) ?? null;
    if (state?.lastRunAt) {
      staleMs = Math.max(staleMs, Math.max(0, nowMs - state.lastRunAt.getTime()));
    }
    return {
      id: bot.id,
      domain: bot.domain,
      label: state?.label ?? bot.label,
      enabled: state?.enabled ?? true,
      lastRunAt: state?.lastRunAt ? state.lastRunAt.toISOString() : null,
      lastStatus: state?.lastStatus ?? null,
      consecutiveFailures: state?.consecutiveFailures ?? 0,
      lastMessage: state?.lastMessage ?? null,
      lastRun: last
        ? {
            id: last.id,
            status: last.status,
            trigger: last.trigger,
            startedAt: last.startedAt.toISOString(),
            finishedAt: last.finishedAt ? last.finishedAt.toISOString() : null,
            processed: last.processed,
            updated: last.updated,
            skipped: last.skipped,
            errors: last.errors,
            message: last.message,
          }
        : null,
    };
  });

  const ok = bots.filter((b) => b.lastStatus === 'ok' || b.lastStatus === 'partial').length;
  const failed = bots.filter((b) => b.lastStatus === 'failed').length;
  return {
    bots,
    summary: { total: bots.length, running, ok, failed, staleMs },
  };
}

/** Histórico de um bot (monitor). */
export async function listBotRuns(
  botId: string,
  limit = 20,
  opts: { prisma?: BotsPrisma } = {},
): Promise<RunRow[]> {
  const db = opts.prisma ?? defaultPrisma;
  return db.botRun.findMany({
    where: { botId },
    orderBy: { startedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      botId: true,
      status: true,
      trigger: true,
      startedAt: true,
      finishedAt: true,
      processed: true,
      updated: true,
      skipped: true,
      errors: true,
      message: true,
    },
  }) as Promise<RunRow[]>;
}
