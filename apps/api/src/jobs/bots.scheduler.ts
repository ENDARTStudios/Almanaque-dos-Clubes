/**
 * T-24/28 — SCHEDULER DOS BOTS AUTÔNOMOS (fila `bots`, a cada 4h).
 *
 * ── POR QUE UM JOB POR BOT ───────────────────────────────────────────────────────
 * O repeat job de 4h é LEVE: ele só enfileira 12 jobs (`bot`), um por domínio, na
 * própria fila `bots`. O worker roda com concorrência 1 (todos batem nas mesmas
 * fontes externas — sequencial é o ritmo seguro) e cada job executa UM bot, com
 * teto de 10 min. Se a rodada inteira coubesse num job só, o teto/retry do BullMQ
 * não protegeria nada e um travamento de rede mataria os 12 domínios de uma vez.
 *
 * O orçamento total de 20 min viaja no payload (`deadline` epoch ms). Quando o
 * worker começa um bot depois do deadline, `runBot` registra `skipped` com motivo
 * `budget` — o restante da rodada aparece cortado no monitor, não como sucesso.
 *
 * Flag: `BOTS_SCHEDULER_ENABLED` (default OFF, via `envFlag`).
 */
import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import { queues, createWorker } from '../services/queue.js';
import { envFlag } from '../config/flags.js';
import { logger } from '../config/logger.js';
import { BOTS } from '../modules/bots/registry.js';
import { BOT_TIMEOUT_MS, ROUND_BUDGET_MS, runBot } from '../modules/bots/service.js';
import type { BotTrigger } from '../modules/bots/types.js';

export const BOTS_QUEUE = 'bots' as const;
/** Repeat job leve: enfileira um job por bot. */
export const JOB_BOTS_ROUND = 'round' as const;
/** Job de UM bot (nome curto para o monitor do BullMQ). */
export const JOB_BOTS_RUN = 'bot' as const;
/** A cada 4 horas, UTC. */
export const BOTS_CRON_PATTERN = '0 */4 * * *' as const;
export const BOTS_ROUND_BUDGET_MS = ROUND_BUDGET_MS;

export interface BotJobData {
  botId: string;
  trigger: BotTrigger;
  roundId?: string;
  /** Epoch ms — orçamento total da rodada. */
  deadline?: number;
}

export function isBotsSchedulerEnabled(): boolean {
  return envFlag('BOTS_SCHEDULER_ENABLED');
}

/** Enfileira UM bot (manual ou membro de uma rodada). */
export async function enqueueBotRun(
  botId: string,
  trigger: BotTrigger,
  opts: { roundId?: string; deadline?: number } = {},
) {
  const data: BotJobData = {
    botId,
    trigger,
    ...(opts.roundId ? { roundId: opts.roundId } : {}),
    ...(opts.deadline ? { deadline: opts.deadline } : {}),
  };
  return queues.bots.add(JOB_BOTS_RUN, data, {
    attempts: 1,
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
    // BullMQ proíbe `:` em jobId customizado; `-` mantém a rodada identificável.
    ...(opts.roundId ? { jobId: `${opts.roundId}-${botId}` } : {}),
  });
}

/**
 * Enfileira a rodada completa NA ORDEM do registry. Retorna o `roundId` e o
 * `deadline` para log/observabilidade.
 */
export async function enqueueRound(
  trigger: BotTrigger = 'schedule',
): Promise<{ roundId: string; queued: number; deadline: number }> {
  const roundId = randomUUID();
  const deadline = Date.now() + BOTS_ROUND_BUDGET_MS;
  for (const bot of BOTS) {
    await enqueueBotRun(bot.id, trigger, { roundId, deadline });
  }
  logger.info(
    { roundId, queued: BOTS.length, deadline, budgetMinutes: BOTS_ROUND_BUDGET_MS / 60000 },
    'bots: rodada enfileirada (1 job por bot)',
  );
  return { roundId, queued: BOTS.length, deadline };
}

/** Handler da fila `bots`: `round` enfileira; `bot` executa UM domínio. */
export async function botsJobHandler(job: Job): Promise<void> {
  if (job.name === JOB_BOTS_ROUND) {
    await enqueueRound('schedule');
    return;
  }
  if (job.name === JOB_BOTS_RUN) {
    const data = (job.data ?? {}) as BotJobData;
    if (!data.botId) throw new Error('bots: job sem botId');
    await runBot(data.botId, data.trigger ?? 'schedule', {
      roundId: data.roundId,
      deadline: data.deadline,
    });
    return;
  }
  throw new Error(`bots: job desconhecido "${job.name}"`);
}

let registered = false;

/**
 * Registra o worker (concorrência 1) e a agenda de 4h. Idempotente por processo.
 * Exige Redis; chamado no boot APENAS com BOTS_SCHEDULER_ENABLED ligada.
 */
export async function registerBotsScheduler(): Promise<void> {
  if (registered) return;
  registered = true;

  createWorker(BOTS_QUEUE, (job) => botsJobHandler(job), { concurrency: 1 });

  await queues.bots.upsertJobScheduler(
    'bots-round-4h',
    { pattern: BOTS_CRON_PATTERN },
    {
      name: JOB_BOTS_ROUND,
      data: {},
      opts: {
        // O repeat job é leve (só enfileira); sem retry para não duplicar a rodada.
        attempts: 1,
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    },
  );

  logger.info(
    {
      cron: BOTS_CRON_PATTERN,
      queue: BOTS_QUEUE,
      concurrency: 1,
      perBotTimeoutMinutes: BOT_TIMEOUT_MS / 60000,
      roundBudgetMinutes: BOTS_ROUND_BUDGET_MS / 60000,
      bots: BOTS.length,
    },
    'bots scheduler agendado (UTC): 1 job por bot a cada 4h',
  );
}

// Fallback para processos worker dedicados (mesmo padrão do data-refresh/ranking):
// auto-registra FORA de testes e só com a flag explícita.
if (process.env.NODE_ENV !== 'test' && isBotsSchedulerEnabled()) {
  void registerBotsScheduler().catch((err) => {
    logger.error({ err }, 'bots scheduler: falha ao registrar no boot');
  });
}
