/**
 * T575 — laço de voltas do bot (cap, pausa, shunt, shutdown, contadores).
 *
 * Sem banco e sem rede de propósito: o laço recebe os adaptadores injetados. O que é
 * travado aqui é o COMPORTAMENTO CORRETO sob as condições que a produção impõe —
 * fila que estagna, contagem que falha, sinal de SIGTERM no meio da volta — porque é
 * nessas condições que um worker contínuo erra (girando em falso ou morrendo no meio de
 * uma escrita).
 */
import { describe, expect, it, vi } from 'vitest';
import {
  runEnrichBotSession,
  type BotLogEntry,
  type EnrichQueueAdapter,
  type QueueRunResult,
} from '../../../src/modules/etl/enrich-bot.service.js';
import type { EnrichBotConfig } from '../../../src/modules/etl/enrich-bot-router.js';

const BASE: EnrichBotConfig = {
  enabled: true,
  apply: true,
  cap: 25,
  pauseMs: 4_000,
  maxTurns: 0,
  stallCooldownTurns: 2,
  turnTimeoutMs: 600_000,
  refreshDays: 0,
};

const cfg = (over: Partial<EnrichBotConfig> = {}): EnrichBotConfig => ({ ...BASE, ...over });

interface FakeAdapter extends EnrichQueueAdapter {
  calls: Array<{ limit: number; apply: boolean }>;
  results: QueueRunResult[];
  progressResult: { total: number; pending: number };
  progressErrors: number;
  runErrors: number;
}

function adapter(
  id: EnrichQueueAdapter['id'],
  progressResult: { total: number; pending: number },
  results: QueueRunResult[] = [{ processed: 1, updated: 1, gaps: 0, failures: 0 }],
  opts: { onRun?: () => void } = {},
): FakeAdapter {
  const a: FakeAdapter = {
    id,
    label: id,
    keys: [id],
    calls: [],
    results,
    progressResult,
    progressErrors: 0,
    runErrors: 0,
    progress: async () => {
      if (a.progressErrors > 0) {
        a.progressErrors -= 1;
        throw new Error('banco fora');
      }
      return a.progressResult;
    },
    run: async (limit, { apply }) => {
      a.calls.push({ limit, apply });
      if (a.runErrors > 0) {
        a.runErrors -= 1;
        throw new Error('falha de leitura');
      }
      opts.onRun?.();
      return a.results[Math.min(a.calls.length - 1, a.results.length - 1)]!;
    },
  };
  return a;
}

function coletar(): { log: (e: BotLogEntry) => void; eventos: BotLogEntry[] } {
  const eventos: BotLogEntry[] = [];
  return { log: (e) => eventos.push(e), eventos };
}

const pausas = (registro: number[]) => async (ms: number) => {
  registro.push(ms);
};

describe('T575 — laço de voltas', () => {
  it('o CAP e o modo (apply) chegam ao adaptador, e a fila do maior déficit é a escolhida', async () => {
    const media = adapter('club-media', { total: 1_000, pending: 100 }); // 10%
    const editorial = adapter('club-editorial', { total: 1_000, pending: 900 }); // 90%
    const { log, eventos } = coletar();
    const slept: number[] = [];

    const s = await runEnrichBotSession({
      adapters: [media, editorial],
      config: cfg({ apply: false, maxTurns: 1 }),
      log,
      sleep: pausas(slept),
      shouldStop: () => false,
    });

    expect(editorial.calls).toHaveLength(1);
    expect(media.calls).toHaveLength(0);
    expect(editorial.calls[0]).toEqual({ limit: 25, apply: false }); // dry-run NÃO grava
    expect(s.turns).toBe(1);
    expect(eventos.find((e) => e.event === 'turn-start')?.data.queue).toBe('club-editorial');
    expect(slept).toEqual([]); // última volta não pausa
  });

  it('pausa EXATAMENTE pauseMs entre voltas (e não depois da última)', async () => {
    const a = adapter('club-media', { total: 100, pending: 50 });
    const slept: number[] = [];
    await runEnrichBotSession({
      adapters: [a],
      config: cfg({ pauseMs: 7_500, maxTurns: 3 }),
      log: coletar().log,
      sleep: pausas(slept),
      shouldStop: () => false,
    });
    expect(a.calls).toHaveLength(3);
    // Pausa FATIADA: o total é o `pauseMs` e cada fatia é curta — é o que faz o shutdown
    // responder em ≤1 s mesmo com pausa de 30 s (grace period do container).
    expect(slept.reduce((x, y) => x + y, 0)).toBe(7_500 * 2);
    expect(Math.max(...slept)).toBeLessThanOrEqual(1_000);
  });

  it('fila que roda e não anda entra em castigo (o bot não gira em falso na mesma fila)', async () => {
    const estagnada = adapter('club-media', { total: 1_000, pending: 900 }, [
      { processed: 0, updated: 0, gaps: 0, failures: 0 },
    ]);
    const outra = adapter('club-editorial', { total: 1_000, pending: 100 });
    const { log, eventos } = coletar();

    const s = await runEnrichBotSession({
      adapters: [estagnada, outra],
      config: cfg({ stallCooldownTurns: 2, maxTurns: 4 }),
      log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });

    // volta 1: a mais atrasada (estagnada) · voltas 2-3: castigo de 2 voltas · volta 4: volta
    expect(estagnada.calls).toHaveLength(2);
    expect(outra.calls).toHaveLength(2);
    expect(eventos.some((e) => e.event === 'queue-stalled')).toBe(true);
    expect(s.byQueue['club-media']?.processed).toBe(0);
  });

  it('volta que SÓ encontrou falha de leitura entra em castigo (429/5xx não pode virar giro)', async () => {
    // O caso real: a fonte rate-limita, os carimbos não acontecem, a fila fica IDÊNTICA —
    // sem castigo o bot reescolheria a MESMA fila batendo de novo na fonte que já recusou.
    const rateLimited = adapter('club-media', { total: 1_000, pending: 900 }, [
      { processed: 20, updated: 0, gaps: 0, failures: 20 },
    ]);
    const outra = adapter('club-editorial', { total: 1_000, pending: 100 });
    const { log, eventos } = coletar();

    await runEnrichBotSession({
      adapters: [rateLimited, outra],
      config: cfg({ stallCooldownTurns: 2, maxTurns: 2 }),
      log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });

    expect(eventos.find((e) => e.event === 'queue-stalled')?.data.reason).toBe(
      'so-falha-de-leitura',
    );
    expect(rateLimited.calls).toHaveLength(1);
    expect(outra.calls).toHaveLength(1); // a outra fila trabalhou nessa volta
  });

  it('erro na volta NÃO derruba a sessão: castiga a fila que falhou e segue com as outras', async () => {
    const quebrada = adapter('club-media', { total: 1_000, pending: 900 });
    quebrada.runErrors = 1;
    const boa = adapter('club-editorial', { total: 1_000, pending: 100 });
    const { log, eventos } = coletar();

    const s = await runEnrichBotSession({
      adapters: [quebrada, boa],
      config: cfg({ maxTurns: 3 }),
      log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });

    expect(s.erroredTurns).toBe(1);
    expect(s.processed).toBe(2); // a falha não soma nada; a outra fila segue trabalhando
    expect(eventos.some((e) => e.event === 'turn-error')).toBe(true);
    // A fila que falhou é CASTIGADA: a outra trabalha na volta seguinte…
    expect(boa.calls.length).toBeGreaterThanOrEqual(1);
    // …e a que falhou só é retentada DEPOIS do castigo (volta 3), já com a leitura boa.
    // (Expectativa corrigida pelo CI: a primeira versão deste teste esperava a fila que
    // falhou fora da sessão inteira, mas o desenho é retentar após o castigo — o castigo
    // evita o GIRO, não abandona a fila.)
    expect(quebrada.calls).toHaveLength(2);
  });

  it('contagem de progresso que falha tira a fila da volta, mas a sessão segue', async () => {
    const semBanco = adapter('club-media', { total: 1_000, pending: 900 });
    semBanco.progressErrors = 1; // só a primeira volta
    const boa = adapter('club-editorial', { total: 1_000, pending: 100 });
    const { log, eventos } = coletar();

    const s = await runEnrichBotSession({
      adapters: [semBanco, boa],
      config: cfg({ maxTurns: 2 }),
      log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });

    expect(eventos.some((e) => e.event === 'progress-failed')).toBe(true);
    expect(semBanco.calls).toHaveLength(1); // volta 1 sem a fila; volta 2 com ela
    expect(boa.calls).toHaveLength(1);
    expect(s.processed).toBe(2);
  });

  it('sem nada pendente o bot fica IDLE (não escreve, não gira) e ainda respeita a pausa', async () => {
    const vazia = adapter('club-media', { total: 1_000, pending: 0 });
    const vazia2 = adapter('player-profile', { total: 0, pending: 0 });
    const { log, eventos } = coletar();
    const slept: number[] = [];

    const s = await runEnrichBotSession({
      adapters: [vazia, vazia2],
      config: cfg({ maxTurns: 2 }),
      log,
      sleep: pausas(slept),
      shouldStop: () => false,
    });

    expect(vazia.calls).toHaveLength(0);
    expect(s.idleTurns).toBe(2);
    expect(s.processed).toBe(0);
    expect(eventos.filter((e) => e.event === 'idle')).toHaveLength(2);
    expect(slept.reduce((x, y) => x + y, 0)).toBe(4_000);
  });

  it('shutdown gracioso: termina a VOLTA CORRENTE e sai (sem iniciar outra)', async () => {
    let parar = false;
    const a = adapter(
      'club-media',
      { total: 100, pending: 50 },
      [{ processed: 5, updated: 3, gaps: 1, failures: 0 }],
      { onRun: () => (parar = true) }, // o SIGTERM chega DURANTE a volta
    );
    const slept: number[] = [];
    const { log, eventos } = coletar();

    const s = await runEnrichBotSession({
      adapters: [a],
      config: cfg({ maxTurns: 0 }), // infinito: quem para é o sinal
      log,
      sleep: pausas(slept),
      shouldStop: () => parar,
    });

    expect(a.calls).toHaveLength(1); // a volta corrente terminou
    expect(s.turns).toBe(1);
    expect(s.stopped).toBe(true);
    expect(slept).toEqual([]); // não pausa para depois sair
    expect(eventos.at(-1)?.event).toBe('session-end');
  });

  it('os contadores da sessão somam por volta e por fila', async () => {
    const a = adapter('club-media', { total: 100, pending: 50 }, [
      { processed: 10, updated: 4, gaps: 5, failures: 1 },
      { processed: 8, updated: 2, gaps: 6, failures: 0 },
    ]);
    const s = await runEnrichBotSession({
      adapters: [a],
      config: cfg({ maxTurns: 2 }),
      log: coletar().log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });
    expect(s.processed).toBe(18);
    expect(s.updated).toBe(6);
    expect(s.gaps).toBe(11);
    expect(s.failures).toBe(1);
    expect(s.progressedTurns).toBe(2);
    expect(s.byQueue['club-media']).toEqual({ turns: 2, processed: 18, updated: 6, gaps: 11 });
  });

  it('a sessão loga o início e o fim com o resumo (observabilidade sem PII)', async () => {
    const a = adapter('club-media', { total: 100, pending: 50 });
    const { log, eventos } = coletar();
    await runEnrichBotSession({
      adapters: [a],
      config: cfg({ maxTurns: 1 }),
      log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });
    expect(eventos[0]?.event).toBe('session-start');
    const fim = eventos.at(-1);
    expect(fim?.event).toBe('session-end');
    // Sem PII: nenhum identificador de entidade (QID, nome, foto, clube) entra no log —
    // só fila e contagem.
    expect(JSON.stringify(eventos)).not.toMatch(/qid|fullName|photoUrl|clubId|"name":/i);
  });

  it('volta que estoura o orçamento de tempo é REGISTRADA (não aborta escrita no meio)', async () => {
    const lento = adapter('club-media', { total: 10, pending: 5 });
    const agora = vi.spyOn(Date, 'now');
    agora.mockReturnValueOnce(0).mockReturnValueOnce(999_999); // 999 s na volta
    const { log, eventos } = coletar();
    await runEnrichBotSession({
      adapters: [lento],
      config: cfg({ maxTurns: 1, turnTimeoutMs: 60_000 }),
      log,
      sleep: async () => undefined,
      shouldStop: () => false,
    });
    agora.mockRestore();
    expect(eventos.some((e) => e.event === 'turn-slow')).toBe(true);
    expect(lento.calls).toHaveLength(1); // a volta terminou normalmente
  });
});
