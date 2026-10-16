/**
 * T575 — SESSÃO do bot de enriquecimento contínuo: o laço de VOLTAS.
 *
 * Uma volta = escolher UMA fila (roteador) e rodar UM lote dela com teto de entidades.
 * Entre voltas, pausa. O processo é feito para viver em container: SIGTERM/SIGINT
 * terminam a VOLTA CORRENTE e saem (um lote interrompido no meio deixa escrita parcial;
 * esperar o fim da volta é barato e mantém o carimbo coerente com o dado gravado).
 *
 * Este módulo NÃO importa Prisma nem as filas reais de propósito: ele recebe os
 * `EnrichQueueAdapter` injetados. Assim o laço (cap, pausa, shutdown, contadores) é
 * testável sem banco e sem rede, e as filas reais ficam em `enrich-bot-queues.ts`.
 */
import {
  chooseNextQueue,
  newRouterState,
  relativeDeficit,
  type EnrichBotConfig,
  type EnrichQueueId,
  type QueueProgress,
} from './enrich-bot-router.js';

export interface QueueRunResult {
  processed: number;
  updated: number;
  /** "A fonte não tem" — gap declarado e carimbado (a fila avançou). */
  gaps: number;
  /** Falha de LEITURA na fonte (429/5xx/rede) — nada carimbado, volta na próxima. */
  failures: number;
}

export const ZERO_RESULT: QueueRunResult = { processed: 0, updated: 0, gaps: 0, failures: 0 };

export interface EnrichQueueAdapter {
  id: EnrichQueueId;
  /** Rótulo humano para o log (sem PII: é nome de fila, não de entidade). */
  label: string;
  /** Chaves do cursor que a fila cobre — documentação viva do escopo. */
  keys: readonly string[];
  /** `total` (universo do gap) e `pending` (ainda não tentados). */
  progress(): Promise<{ total: number; pending: number }>;
  run(limit: number, opts: { apply: boolean }): Promise<QueueRunResult>;
}

/** Log estruturado — injetado para o laço não depender do logger do processo. */
export interface BotLogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  data: Record<string, unknown>;
}
export type BotLogger = (entry: BotLogEntry) => void;

export interface EnrichBotSessionSummary {
  turns: number;
  idleTurns: number;
  progressedTurns: number;
  erroredTurns: number;
  processed: number;
  updated: number;
  gaps: number;
  failures: number;
  /** Contadores por fila — o que a sessão fez em cada uma. */
  byQueue: Record<string, { turns: number; processed: number; updated: number; gaps: number }>;
  /** Último estado de progresso observado (para o log final). */
  lastProgress: QueueProgress[];
  stopped: boolean;
}

export interface EnrichBotSessionOptions {
  adapters: readonly EnrichQueueAdapter[];
  config: EnrichBotConfig;
  log: BotLogger;
  sleep: (ms: number) => Promise<void>;
  /** Chamado antes de cada volta e antes de cada pausa (shutdown gracioso). */
  shouldStop: () => boolean;
}

function progressOf(p: QueueProgress): Record<string, unknown> {
  return {
    queue: p.id,
    pending: p.pending,
    total: p.total,
    deficit: Number(relativeDeficit(p).toFixed(4)),
    ok: p.ok,
  };
}

/**
 * Roda voltas até `maxTurns` (0 = infinito) ou até `shouldStop()` virar `true`.
 * Nunca lança por falha de uma volta: erro de leitura/banco vira `erroredTurns` + castigo
 * curto daquela fila, e o bot segue — derrubar o processo jogaria fora as voltas boas.
 */
export async function runEnrichBotSession(
  opts: EnrichBotSessionOptions,
): Promise<EnrichBotSessionSummary> {
  const { adapters, config, log, sleep, shouldStop } = opts;
  const state = newRouterState();
  const summary: EnrichBotSessionSummary = {
    turns: 0,
    idleTurns: 0,
    progressedTurns: 0,
    erroredTurns: 0,
    processed: 0,
    updated: 0,
    gaps: 0,
    failures: 0,
    byQueue: {},
    lastProgress: [],
    stopped: false,
  };
  const porId = new Map(adapters.map((a) => [a.id, a]));
  for (const a of adapters) summary.byQueue[a.id] = { turns: 0, processed: 0, updated: 0, gaps: 0 };

  /**
   * Pausa ENTRE voltas, fatiada: o `shouldStop()` é consultado a cada fatia, então um
   * SIGTERM no meio da pausa sai em ≤ `FATIA_MS` — dentro do grace period do container.
   * Sem isso, um SIGTERM durante 30 s de pausa seria cortado pelo SIGKILL do Railway (nada
   * se perde, porque na pausa não há escrita em voo, mas o processo morreria sem o log
   * final e sem dizer por quê).
   */
  const FATIA_MS = 1_000;
  const pausar = async (ms: number): Promise<void> => {
    let restante = ms;
    while (restante > 0 && !shouldStop()) {
      const fatia = Math.min(FATIA_MS, restante);
      await sleep(fatia);
      restante -= fatia;
    }
  };

  log({
    level: 'info',
    event: 'session-start',
    data: {
      apply: config.apply,
      dryRun: !config.apply,
      cap: config.cap,
      pauseMs: config.pauseMs,
      maxTurns: config.maxTurns,
      refreshDays: config.refreshDays,
      queues: adapters.map((a) => a.id),
    },
  });

  while (!shouldStop() && (config.maxTurns === 0 || summary.turns < config.maxTurns)) {
    const turn = summary.turns + 1;

    // Medir progresso pode falhar (banco fora): a fila fica fora da escolha da volta, mas
    // a sessão continua — medir é pré-requisito de rotear, não de viver.
    const progress: QueueProgress[] = [];
    for (const a of adapters) {
      try {
        const { total, pending } = await a.progress();
        progress.push({ id: a.id, total, pending, ok: true });
      } catch (err) {
        progress.push({ id: a.id, total: 0, pending: 0, ok: false });
        log({
          level: 'warn',
          event: 'progress-failed',
          data: { queue: a.id, turn, error: err instanceof Error ? err.message : String(err) },
        });
      }
    }
    summary.lastProgress = progress;

    const decisao = chooseNextQueue(progress, state, { turn });
    if (!decisao) {
      summary.turns = turn;
      summary.idleTurns += 1;
      log({
        level: 'info',
        event: 'idle',
        data: { turn, queues: progress.map(progressOf) },
      });
      if (shouldStop() || (config.maxTurns > 0 && summary.turns >= config.maxTurns)) break;
      await pausar(config.pauseMs);
      continue;
    }

    const adapter = porId.get(decisao.id)!;
    state.lastIndex = decisao.index;

    log({
      level: 'info',
      event: 'turn-start',
      data: {
        turn,
        queue: adapter.id,
        keys: adapter.keys,
        cap: config.cap,
        reason: decisao.reason,
      },
    });

    let resultado: QueueRunResult = ZERO_RESULT;
    let falhou = false;
    const inicio = Date.now();
    try {
      resultado = await adapter.run(config.cap, { apply: config.apply });
    } catch (err) {
      falhou = true;
      log({
        level: 'error',
        event: 'turn-error',
        data: {
          turn,
          queue: adapter.id,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
    const duracaoMs = Date.now() - inicio;

    summary.turns = turn;
    summary.processed += resultado.processed;
    summary.updated += resultado.updated;
    summary.gaps += resultado.gaps;
    summary.failures += resultado.failures;
    const linha = summary.byQueue[adapter.id]!;
    linha.turns += 1;
    linha.processed += resultado.processed;
    linha.updated += resultado.updated;
    linha.gaps += resultado.gaps;

    log({
      level: falhou ? 'error' : 'info',
      event: falhou ? 'turn-error-done' : 'turn-done',
      data: {
        turn,
        queue: adapter.id,
        apply: config.apply,
        processed: resultado.processed,
        updated: resultado.updated,
        gaps: resultado.gaps,
        failures: resultado.failures,
        durationMs: duracaoMs,
        session: {
          turns: summary.turns,
          processed: summary.processed,
          updated: summary.updated,
          gaps: summary.gaps,
          failures: summary.failures,
        },
      },
    });

    if (duracaoMs > config.turnTimeoutMs) {
      log({
        level: 'warn',
        event: 'turn-slow',
        data: { turn, queue: adapter.id, durationMs: duracaoMs, budgetMs: config.turnTimeoutMs },
      });
    }

    // Anti-congelamento (o defeito do T536 aplicado um nível acima): fila que roda e não
    // anda NÃO pode ser reescolhida na volta seguinte sem parar — isso seria o bot girando
    // em falso na mesma fila enquanto as outras esperam.
    //
    // "Não andou" tem TRÊS formas, e as três contam: a volta lançou (`falhou`), a volta
    // percorreu e não escreveu (`processed=0`) ou a volta só encontrou FALHA DE LEITURA sem
    // gravar nada (`failures>0 && updated=0` — 429/5xx: os carimbos não aconteceram, então a
    // fila continua idêntica e seria reescolhida na volta seguinte, batendo na fonte que já
    // está limitando). Falha JUNTO com escrita é progresso parcial: não castiga.
    const pendingApos = progress.find((p) => p.id === adapter.id)?.pending ?? 0;
    const soFalha = resultado.failures > 0 && resultado.updated === 0;
    if ((falhou || resultado.processed === 0 || soFalha) && pendingApos > 0) {
      state.cooldownUntilTurn[adapter.id] = turn + config.stallCooldownTurns;
      log({
        level: 'warn',
        event: 'queue-stalled',
        data: {
          turn,
          queue: adapter.id,
          pending: pendingApos,
          cooldownTurns: config.stallCooldownTurns,
          reason: falhou ? 'erro-na-volta' : soFalha ? 'so-falha-de-leitura' : 'processed=0',
        },
      });
    } else if (resultado.processed > 0) {
      summary.progressedTurns += 1;
    }
    if (falhou) summary.erroredTurns += 1;

    if (shouldStop() || (config.maxTurns > 0 && summary.turns >= config.maxTurns)) break;
    await pausar(config.pauseMs);
  }

  summary.stopped = shouldStop();
  log({
    level: 'info',
    event: 'session-end',
    data: {
      stopped: summary.stopped,
      turns: summary.turns,
      idleTurns: summary.idleTurns,
      progressedTurns: summary.progressedTurns,
      erroredTurns: summary.erroredTurns,
      processed: summary.processed,
      updated: summary.updated,
      gaps: summary.gaps,
      failures: summary.failures,
      byQueue: summary.byQueue,
    },
  });
  return summary;
}
