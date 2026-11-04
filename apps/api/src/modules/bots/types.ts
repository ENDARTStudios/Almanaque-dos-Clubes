/**
 * T-24/28 — INGESTÃO AUTÔNOMA: contrato dos bots de domínio.
 *
 * Um bot é uma FUNÇÃO importável (`run`), não um script externo: roda dentro do
 * processo da API, com o Prisma compartilhado e sem depender de chat/agente. O
 * orquestrador só conhece este contrato — qualquer domínio novo é uma entrada no
 * registry.
 *
 * Honestidade: o bot SEMPRE declara em `message` o que fez ou por que não fez. Um
 * domínio sem fonte/fila retorna `skipped` — nunca inventa escrita para "parecer
 * produtivo".
 */
import type { PrismaClient } from '@prisma/client';

export type BotDomain =
  | 'players'
  | 'clubs'
  | 'matches'
  | 'geo'
  | 'history'
  | 'charts'
  | 'seasons'
  | 'stadiums'
  | 'rankings'
  | 'comparison'
  | 'tables'
  | 'competitions';

/** `schedule` = rodada de 4h; `manual` = botão do admin; `api` = chamada programática. */
export type BotTrigger = 'schedule' | 'manual' | 'api';

export type BotOutcomeStatus = 'ok' | 'partial' | 'skipped';
/** Persistido em `bot_runs.status`/`bot_states.lastStatus`. */
export type BotRunStatus = 'running' | BotOutcomeStatus | 'failed';

export interface BotOutcome {
  status: BotOutcomeStatus;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  /** O que foi feito/não foi feito — obrigatório na prática (o monitor exibe). */
  message?: string;
}

export interface BotRunContext {
  prisma: PrismaClient;
  trigger: BotTrigger;
  /** Epoch ms: passou do teto da rodada ⇒ o bot não deve começar. */
  deadline?: number;
  /** Identificador da rodada enfileirada (agrupa os 12 jobs no Redis). */
  roundId?: string;
}

export interface BotDefinition {
  /** id estável (`players`, `clubs`, ...) — também é `bot_states.id`. */
  id: string;
  domain: BotDomain;
  /** Rótulo curto exibível no painel. */
  label: string;
  run(ctx: BotRunContext): Promise<BotOutcome>;
}

/** Resultado de uma execução registrada (usado pelo monitor/testes). */
export interface BotRunResult extends Omit<BotOutcome, 'status'> {
  botId: string;
  status: Exclude<BotRunStatus, 'running'>;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  consecutiveFailures: number;
}
