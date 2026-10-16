/**
 * T575 — ROTEADOR do bot de enriquecimento contínuo.
 *
 * O bot roda em VOLTAS (não uma vez por noite) e a cada volta escolhe UMA fila. A escolha
 * é por **menor progresso relativo** — a fila mais atrasada em relação ao seu próprio
 * universo — com rodízio simples como desempate. O objetivo é o mesmo dos cursores do
 * T547/T550 aplicado um nível acima: o trabalho ANDAR e não gastar a noite inteira na
 * fila que já está quase cheia.
 *
 * Por que `pending/total` e não só `pending`: filas de tamanhos muito diferentes
 * (jogadores ~105 k × clubes ~12 k) tornariam "menor pendente absoluto" uma escolha
 * enviesada para sempre — a fila pequena nunca é a mais atrasada relativa, mas a grande
 * levaria dezenas de vezes mais voltas para esvaziar. O relativo compara maçãs com maçãs.
 *
 * Este módulo é PURO de propósito (nenhum import de Prisma/rede/logger): é a parte de
 * DECISÃO — a única que precisa ser testada sem banco e sem fonte.
 */
import { envFlag } from '../../config/flags.js';

/** Filas de fonte aberta que o bot cobre. A ordem canônica é também o desempate. */
export type EnrichQueueId =
  | 'club-media'
  | 'club-editorial'
  | 'club-extra-media'
  | 'player-profile'
  | 'player-club'
  | 'club-coordinates';

export const ENRICH_QUEUE_ORDER: readonly EnrichQueueId[] = [
  'club-media',
  'club-editorial',
  'club-extra-media',
  'player-profile',
  'player-club',
  'club-coordinates',
];

export interface QueueProgress {
  id: EnrichQueueId;
  /** Entidades que ainda precisam do dado (denominador). */
  total: number;
  /** Entidades que precisam E ainda não foram tentadas. */
  pending: number;
  /** `false` = a contagem falhou (banco indisponível): a fila fica fora da escolha. */
  ok: boolean;
}

export interface RouterState {
  /** Índice (na ordem canônica) da última fila escolhida; -1 = nenhuma ainda. */
  lastIndex: number;
  /** Fila → turno até o qual ela está de castigo (ver `stallCooldownTurns`). */
  cooldownUntilTurn: Partial<Record<EnrichQueueId, number>>;
}

export function newRouterState(): RouterState {
  return { lastIndex: -1, cooldownUntilTurn: {} };
}

/**
 * Déficit relativo da fila ∈ [0,1]: 1 = nada feito, 0 = nada a fazer.
 * `total` zero significa "não há universo para esta fila" — não é atraso, é ausência de
 * trabalho, e a fila nem entra como candidata (ver `chooseNextQueue`).
 */
export function relativeDeficit(p: QueueProgress): number {
  if (p.total <= 0) return 0;
  return Math.min(1, Math.max(0, p.pending / p.total));
}

export interface RouterDecision {
  id: EnrichQueueId;
  index: number;
  deficit: number;
  reason: string;
}

export interface ChooseNextQueueOptions {
  /** Volta corrente (1-based). Usada só pelo castigo de fila estagnada. */
  turn: number;
}

/**
 * Escolhe a próxima fila. `null` = nada a fazer (todas vazias/falhando/castigadas) — o bot
 * então dorme e volta depois, em vez de girar.
 *
 * Regras, na ordem:
 *  1. fora: contagem falhou (`ok=false`), seminário vazio (`total<=0` ou `pending<=0`),
 *     ou em castigo (`cooldownUntilTurn > turn`);
 *  2. ordena por déficit DECRESCENTE;
 *  3. empate → round-robin: entre as empatadas, vence a que está há mais voltas sem ser
 *     escolhida (distância CIRCULAR na ordem canônica desde a última escolhida). Ordenação
 *     estável para a rotação sobreviver como desempate.
 */
export function chooseNextQueue(
  progress: readonly QueueProgress[],
  state: RouterState,
  opts: ChooseNextQueueOptions = { turn: 1 },
): RouterDecision | null {
  const elegiveis = progress.filter(
    (p) =>
      p.ok && p.total > 0 && p.pending > 0 && (state.cooldownUntilTurn[p.id] ?? 0) <= opts.turn,
  );
  if (elegiveis.length === 0) return null;

  // Rotação round-robin: distância CIRCULAR (na ordem canônica) desde a última escolhida.
  // A fila imediatamente seguinte à última escolhida tem distância 0; a última escolhida,
  // N-1. Assim o desempate nunca repete a mesma fila duas voltas seguidas, e a ordem
  // canônica vira o critério da PRIMEIRA escolha (quando ainda não há última).
  const N = ENRICH_QUEUE_ORDER.length;
  const distancia = new Map<EnrichQueueId, number>();
  for (const p of elegiveis) {
    const idx = ENRICH_QUEUE_ORDER.indexOf(p.id);
    distancia.set(p.id, (((idx - state.lastIndex - 1) % N) + N) % N);
  }

  const ordenadas = [...elegiveis].sort((a, b) => {
    const d = relativeDeficit(b) - relativeDeficit(a);
    if (d !== 0) return d;
    return (distancia.get(a.id) ?? 0) - (distancia.get(b.id) ?? 0);
  });

  const escolhida = ordenadas[0]!;
  const deficit = relativeDeficit(escolhida);
  return {
    id: escolhida.id,
    index: ENRICH_QUEUE_ORDER.indexOf(escolhida.id),
    deficit,
    reason: `deficit=${(deficit * 100).toFixed(2)}% pending=${escolhida.pending}/${escolhida.total}`,
  };
}

// ---------------------------------------------------------------------------
// Configuração (env + argv)
// ---------------------------------------------------------------------------

export interface EnrichBotConfig {
  /** `ENRICH_BOT_ENABLED` — desligado por padrão. Só o modo APPLY exige esta flag. */
  enabled: boolean;
  /** `true` grava. Default `false`: o bot nasce em DRY-RUN. */
  apply: boolean;
  /** Entidades por volta (`ENRICH_BOT_CAP`, default 40). */
  cap: number;
  /** Pausa entre voltas (`ENRICH_BOT_PAUSE_MS`, default 30 s). */
  pauseMs: number;
  /** Voltas máximas, 0 = infinito (`ENRICH_BOT_MAX_TURNS`). Existe para os testes/CLI. */
  maxTurns: number;
  /** Voltas de castigo para fila que rodou e NÃO andou (erro, `processed=0` ou só falha de leitura). */
  stallCooldownTurns: number;
  /** Teto de tempo por volta (`ENRICH_BOT_TURN_TIMEOUT_MS`) — warn, não aborta escrita. */
  turnTimeoutMs: number;
  /** Revisita de mídia já tentada (`ENRICH_BOT_REFRESH_DAYS`); 0 = desligada (default). */
  refreshDays: number;
}

const LIMITES = {
  cap: { min: 1, max: 500, padrao: 40 },
  pauseMs: { min: 1_000, max: 3_600_000, padrao: 30_000 },
  stallCooldownTurns: { min: 1, max: 100, padrao: 3 },
  turnTimeoutMs: { min: 10_000, max: 3_600_000, padrao: 15 * 60 * 1000 },
  refreshDays: { min: 0, max: 3_650, padrao: 0 },
} as const;

function numEnv(nome: string, faixa: { min: number; max: number; padrao: number }): number {
  const bruto = (process.env[nome] ?? '').trim();
  if (bruto === '') return faixa.padrao;
  const n = Number.parseInt(bruto, 10);
  if (!Number.isFinite(n)) return faixa.padrao;
  return Math.min(faixa.max, Math.max(faixa.min, n));
}

function argValor(argv: readonly string[], nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  return argv.find((a) => a.startsWith(prefixo))?.slice(prefixo.length);
}

/**
 * Lê a configuração do ambiente e da linha de comando. PURA o suficiente para teste
 * (lê `process.env`, como `envFlag` — nada de banco/rede).
 *
 * Precedência do modo de escrita: `--dry-run` > `--apply`/`ENRICH_BOT_APPLY` > default
 * DRY-RUN. O dry-run é o modo de NASCENÇA (dois cliques de distância do que grava), e a
 * flag ligada não basta sozinha: sem `--apply`/`ENRICH_BOT_APPLY` o bot só percorre e loga.
 */
export function readBotConfig(argv: readonly string[] = process.argv.slice(2)): EnrichBotConfig {
  const dryRunFlag = argv.includes('--dry-run') || envFlag('ENRICH_BOT_DRY_RUN');
  const pedeApply = argv.includes('--apply') || envFlag('ENRICH_BOT_APPLY');
  const capArg = argValor(argv, 'cap');
  const pauseArg = argValor(argv, 'pause-ms');
  const turnsArg = argValor(argv, 'max-turns');

  const cap = Math.min(
    LIMITES.cap.max,
    Math.max(
      LIMITES.cap.min,
      Number.parseInt(capArg ?? '', 10) || numEnv('ENRICH_BOT_CAP', LIMITES.cap),
    ),
  );
  const pauseMs = Math.min(
    LIMITES.pauseMs.max,
    Math.max(
      LIMITES.pauseMs.min,
      Number.parseInt(pauseArg ?? '', 10) || numEnv('ENRICH_BOT_PAUSE_MS', LIMITES.pauseMs),
    ),
  );
  const maxTurns = Math.max(
    0,
    Number.parseInt(turnsArg ?? '', 10) ||
      numEnv('ENRICH_BOT_MAX_TURNS', { min: 0, max: 100_000, padrao: 0 }),
  );

  return {
    enabled: envFlag('ENRICH_BOT_ENABLED'),
    apply: pedeApply && !dryRunFlag,
    cap,
    pauseMs,
    maxTurns,
    stallCooldownTurns: numEnv('ENRICH_BOT_STALL_COOLDOWN_TURNS', LIMITES.stallCooldownTurns),
    turnTimeoutMs: numEnv('ENRICH_BOT_TURN_TIMEOUT_MS', LIMITES.turnTimeoutMs),
    refreshDays: numEnv('ENRICH_BOT_REFRESH_DAYS', LIMITES.refreshDays),
  };
}

/** Razão pela qual o bot NÃO roda (string vazia = pode rodar). */
export function bloqueioDeExecucao(config: EnrichBotConfig): string {
  if (config.apply && !config.enabled) {
    return 'ENRICH_BOT_ENABLED=false — bot desligado (nenhuma escrita permitida)';
  }
  return '';
}
