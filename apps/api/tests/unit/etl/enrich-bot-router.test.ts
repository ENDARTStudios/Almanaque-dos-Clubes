/**
 * T575 — roteador do bot de enriquecimento contínuo (PARTE PURA).
 *
 * O que é travado aqui:
 *  1. a escolha é por MENOR PROGRESSO RELATIVO (maior `pending/total`), não por tamanho
 *     absoluto de fila — a fila de 105 k jogadores não pode monopolizar as voltas só por
 *     ser grande;
 *  2. EMPATE resolve por rodízio (nunca a mesma fila duas voltas seguidas);
 *  3. fila vazia, fila com contagem falhada e fila em castigo ficam FORA da escolha;
 *  4. a config: dry-run é o modo de nascença, `ENRICH_BOT_ENABLED` gate só o modo que
 *     grava, e cap/pausa são limitados a faixas sãs.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  ENRICH_QUEUE_ORDER,
  bloqueioDeExecucao,
  chooseNextQueue,
  newRouterState,
  readBotConfig,
  relativeDeficit,
  type QueueProgress,
} from '../../../src/modules/etl/enrich-bot-router.js';

const ENVS = [
  'ENRICH_BOT_ENABLED',
  'ENRICH_BOT_APPLY',
  'ENRICH_BOT_DRY_RUN',
  'ENRICH_BOT_CAP',
  'ENRICH_BOT_PAUSE_MS',
  'ENRICH_BOT_MAX_TURNS',
  'ENRICH_BOT_STALL_COOLDOWN_TURNS',
  'ENRICH_BOT_TURN_TIMEOUT_MS',
  'ENRICH_BOT_REFRESH_DAYS',
];

function limparEnv(): void {
  for (const e of ENVS) delete process.env[e];
}

afterEach(limparEnv);

const prog = (
  id: QueueProgress['id'],
  pending: number,
  total: number,
  ok = true,
): QueueProgress => ({ id, pending, total, ok });

describe('T575 — progresso relativo', () => {
  it('é pending/total; fila sem universo não conta como atraso', () => {
    expect(relativeDeficit(prog('club-media', 300, 1_000))).toBeCloseTo(0.3);
    expect(relativeDeficit(prog('club-media', 0, 0))).toBe(0);
    expect(relativeDeficit(prog('club-media', 0, 100))).toBe(0);
    expect(relativeDeficit(prog('club-media', 100, 100))).toBe(1);
  });
});

describe('T575 — escolha da fila', () => {
  it('escolhe a fila de MAIOR déficit relativo, ignorando o tamanho absoluto', () => {
    const d = chooseNextQueue(
      [
        // Fila gigante, mas quase feita (déficit 10%).
        prog('player-profile', 10_000, 100_000),
        // Fila pequena e atrasada (déficit 90%) — é a que deve ganhar a volta.
        prog('club-editorial', 900, 1_000),
      ],
      newRouterState(),
      { turn: 1 },
    );
    expect(d?.id).toBe('club-editorial');
    expect(d?.reason).toContain('pending=900/1000');
  });

  it('empate resolve por rodízio: nunca a mesma fila duas voltas seguidas', () => {
    const progress = [prog('club-media', 50, 100), prog('club-editorial', 50, 100)];
    const state = newRouterState();
    const primeira = chooseNextQueue(progress, state, { turn: 1 });
    state.lastIndex = primeira!.index;
    const segunda = chooseNextQueue(progress, state, { turn: 2 });
    expect(primeira!.id).not.toBe(segunda!.id);
    // E fecha o ciclo: da segunda, a próxima volta volta para a primeira.
    state.lastIndex = segunda!.index;
    expect(chooseNextQueue(progress, state, { turn: 3 })!.id).toBe(primeira!.id);
  });

  it('ordem canônica decide a PRIMEIRA escolha (ainda sem última)', () => {
    const progress = [prog('club-media', 50, 100), prog('club-editorial', 50, 100)];
    expect(chooseNextQueue(progress, newRouterState(), { turn: 1 })!.id).toBe(
      ENRICH_QUEUE_ORDER[0],
    );
  });

  it('fila vazia, fila sem universo e fila com contagem falhada ficam de fora', () => {
    const d = chooseNextQueue(
      [
        prog('club-media', 0, 100), // já tentado tudo
        prog('club-editorial', 5, 0), // não há universo
        prog('player-club', 5, 100, false), // a contagem falhou (banco fora)
      ],
      newRouterState(),
      { turn: 1 },
    );
    expect(d).toBeNull();
  });

  it('fila em castigo não é escolhida enquanto o castigo vale', () => {
    const progress = [prog('club-media', 90, 100), prog('club-editorial', 10, 100)];
    const state = newRouterState();
    state.cooldownUntilTurn['club-media'] = 3;
    expect(chooseNextQueue(progress, state, { turn: 1 })!.id).toBe('club-editorial');
    expect(chooseNextQueue(progress, state, { turn: 2 })!.id).toBe('club-editorial');
    // Passado o castigo, a fila mais atrasada volta a ganhar.
    expect(chooseNextQueue(progress, state, { turn: 3 })!.id).toBe('club-media');
  });
});

describe('T575 — configuração', () => {
  it('default: DESLIGADO, em DRY-RUN, cap 40 e pausa de 30 s', () => {
    const c = readBotConfig([]);
    expect(c.enabled).toBe(false);
    expect(c.apply).toBe(false);
    expect(c.cap).toBe(40);
    expect(c.pauseMs).toBe(30_000);
    expect(c.maxTurns).toBe(0); // infinito
    expect(c.refreshDays).toBe(0); // sem revisita: re-run é noop
    expect(bloqueioDeExecucao(c)).toBe(''); // dry-run roda mesmo desligado
  });

  it('--apply sem ENRICH_BOT_ENABLED 1 é BLOQUEADO (nada grava sem a flag)', () => {
    const c = readBotConfig(['--apply']);
    expect(c.apply).toBe(true);
    expect(bloqueioDeExecucao(c)).toContain('ENRICH_BOT_ENABLED=false');
  });

  it('--dry-run vence --apply (o modo que não escreve é o mais seguro)', () => {
    process.env.ENRICH_BOT_ENABLED = '1';
    process.env.ENRICH_BOT_APPLY = '1';
    const c = readBotConfig(['--dry-run']);
    expect(c.apply).toBe(false);
    expect(c.enabled).toBe(true);
  });

  it('flag ligada + ENRICH_BOT_APPLY=1 libera o modo que grava', () => {
    process.env.ENRICH_BOT_ENABLED = 'true';
    process.env.ENRICH_BOT_APPLY = '1';
    const c = readBotConfig([]);
    expect(c.apply).toBe(true);
    expect(bloqueioDeExecucao(c)).toBe('');
  });

  it('cap e pausa são limitados a faixas sãs (nem 0 nem infinito)', () => {
    process.env.ENRICH_BOT_CAP = '5000';
    process.env.ENRICH_BOT_PAUSE_MS = '100';
    const c = readBotConfig([]);
    expect(c.cap).toBe(500);
    expect(c.pauseMs).toBe(1_000);
    expect(readBotConfig(['--cap=7', '--pause-ms=2500']).cap).toBe(7);
    expect(readBotConfig(['--cap=7', '--pause-ms=2500']).pauseMs).toBe(2_500);
  });

  it('voltas máximas vêm da env ou da linha de comando (0 = infinito)', () => {
    expect(readBotConfig([]).maxTurns).toBe(0);
    expect(readBotConfig(['--max-turns=3']).maxTurns).toBe(3);
    process.env.ENRICH_BOT_MAX_TURNS = '5';
    expect(readBotConfig([]).maxTurns).toBe(5);
  });

  it('refresh de mídia é opt-in (0 = desligado, re-run noop)', () => {
    expect(readBotConfig([]).refreshDays).toBe(0);
    process.env.ENRICH_BOT_REFRESH_DAYS = '7';
    expect(readBotConfig([]).refreshDays).toBe(7);
  });
});
