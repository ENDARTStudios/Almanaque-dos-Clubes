/**
 * T-24/28 — testes do orquestrador de bots (sem banco/Redis).
 *
 * Travado aqui:
 *  1. agregação dos desfechos da rodada;
 *  2. falha consecutiva sobe em `failed` e ZERA em qualquer desfecho não-falho;
 *  3. `partial` quando há erros mas também houve processamento;
 *  4. orçamento corta a rodada e o bot restante fica `skipped` com motivo `budget`;
 *  5. bot que lança vira `failed` e NÃO derruba os seguintes.
 */
import { describe, expect, it } from 'vitest';
import {
  finalStatus,
  runBot,
  runRound,
  summarizeRuns,
  type BotsPrisma,
} from '../../src/modules/bots/service.js';
import type { BotDefinition, BotRunResult } from '../../src/modules/bots/types.js';

interface FakeState {
  id: string;
  domain: string;
  label: string | null;
  enabled: boolean;
  lastRunAt: Date | null;
  lastStatus: string | null;
  consecutiveFailures: number;
  lastMessage: string | null;
}

interface FakeRun {
  id: string;
  botId: string;
  botKey: string;
  status: string;
  trigger: string;
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string | null;
  durationMs: number | null;
  error: string | null;
}

function fakeDb(): { db: BotsPrisma; states: Map<string, FakeState>; runs: FakeRun[] } {
  const states = new Map<string, FakeState>();
  const runs: FakeRun[] = [];
  let seq = 0;

  const db = {
    botState: {
      async upsert(args: {
        where: { id: string };
        create: Partial<FakeState> & { id: string };
        update: Partial<FakeState>;
      }) {
        const current = states.get(args.where.id);
        if (current) {
          Object.assign(current, args.update);
          return current;
        }
        const created: FakeState = {
          id: args.create.id,
          domain: args.create.domain ?? 'players',
          label: args.create.label ?? null,
          enabled: true,
          lastRunAt: null,
          lastStatus: null,
          consecutiveFailures: 0,
          lastMessage: null,
          ...args.create,
        };
        states.set(created.id, created);
        return created;
      },
      async update(args: { where: { id: string }; data: Partial<FakeState> }) {
        const state = states.get(args.where.id);
        if (!state) throw new Error(`state ausente: ${args.where.id}`);
        Object.assign(state, args.data);
        return state;
      },
      async findMany() {
        return [...states.values()];
      },
    },
    botRun: {
      async create(args: { data: Omit<FakeRun, 'id'> }) {
        seq += 1;
        const row: FakeRun = { id: `run-${seq}`, ...args.data };
        runs.push(row);
        return row;
      },
      async update(args: { where: { id: string }; data: Partial<FakeRun> }) {
        const row = runs.find((r) => r.id === args.where.id);
        if (!row) throw new Error(`run ausente: ${args.where.id}`);
        Object.assign(row, args.data);
        return row;
      },
      async findMany() {
        return runs;
      },
      async count() {
        return runs.filter((r) => r.status === 'running').length;
      },
    },
  } as unknown as BotsPrisma;

  return { db, states, runs };
}

const okBot = (id: string): BotDefinition => ({
  id,
  domain: 'players',
  label: id,
  run: async () => ({
    status: 'ok',
    processed: 10,
    updated: 2,
    skipped: 1,
    errors: 0,
    message: `${id} ok`,
  }),
});

describe('finalStatus', () => {
  it('errors>0 com processed>0 ⇒ partial', () => {
    expect(finalStatus({ status: 'ok', processed: 5, updated: 1, skipped: 0, errors: 1 })).toBe(
      'partial',
    );
  });

  it('errors>0 sem processed ⇒ failed', () => {
    expect(finalStatus({ status: 'ok', processed: 0, updated: 0, skipped: 0, errors: 2 })).toBe(
      'failed',
    );
  });

  it('skipped honesto permanece skipped', () => {
    expect(
      finalStatus({ status: 'skipped', processed: 0, updated: 0, skipped: 3, errors: 0 }),
    ).toBe('skipped');
  });
});

describe('runBot — estado durável', () => {
  it('falhas consecutivas sobem em failed e zeram no sucesso', async () => {
    const { db } = fakeDb();
    const failing: BotDefinition = {
      id: 'boom',
      domain: 'clubs',
      label: 'boom',
      run: async () => {
        throw new Error('fonte caiu');
      },
    };

    const r1 = await runBot('boom', 'schedule', { prisma: db, bot: failing });
    const r2 = await runBot('boom', 'schedule', { prisma: db, bot: failing });
    const r3 = await runBot('boom', 'schedule', { prisma: db, bot: failing });
    expect([r1.consecutiveFailures, r2.consecutiveFailures, r3.consecutiveFailures]).toEqual([
      1, 2, 3,
    ]);
    expect(r3.status).toBe('failed');

    const recovered = await runBot('boom', 'schedule', { prisma: db, bot: okBot('boom') });
    expect(recovered.consecutiveFailures).toBe(0);
    expect(recovered.status).toBe('ok');
  });

  it('partial quando o bot processa mas acumula erros', async () => {
    const { db } = fakeDb();
    const partial: BotDefinition = {
      id: 'partial',
      domain: 'geo',
      label: 'partial',
      run: async () => ({
        status: 'ok',
        processed: 7,
        updated: 3,
        skipped: 4,
        errors: 2,
        message: 'parcial',
      }),
    };
    const r = await runBot('partial', 'schedule', { prisma: db, bot: partial });
    expect(r.status).toBe('partial');
  });
});

describe('runRound — orçamento e isolamento de falha', () => {
  it('orçamento corta a rodada: restante vira skipped/budget', async () => {
    const { db } = fakeDb();
    let clock = 0;
    const fast: BotDefinition = {
      ...okBot('fast'),
      run: async () => {
        clock += 1000;
        return {
          status: 'ok',
          processed: 10,
          updated: 2,
          skipped: 1,
          errors: 0,
          message: 'fast ok',
        };
      },
    };
    const never: BotDefinition = {
      ...okBot('never'),
      run: async () => {
        throw new Error('não deveria rodar');
      },
    };

    const round = await runRound('schedule', {
      bots: [fast, never],
      prisma: db,
      budgetMs: 500,
      now: () => clock,
    });

    expect(round.results).toHaveLength(2);
    expect(round.results[0].status).toBe('ok');
    expect(round.results[1].status).toBe('skipped');
    expect(round.results[1].message).toContain('budget');
    expect(round.summary).toMatchObject({ total: 2, ok: 1, skipped: 1, failed: 0 });
  });

  it('bot que lança vira failed sem derrubar o próximo', async () => {
    const { db } = fakeDb();
    const boom: BotDefinition = {
      id: 'boom',
      domain: 'clubs',
      label: 'boom',
      run: async () => {
        throw new Error('falhou');
      },
    };
    const round = await runRound('schedule', {
      bots: [boom, okBot('depois')],
      prisma: db,
      now: () => 0,
    });
    expect(round.results[0].status).toBe('failed');
    expect(round.results[1].status).toBe('ok');
    expect(round.summary.failed).toBe(1);
  });
});

describe('summarizeRuns', () => {
  it('agrega contadores e desfechos', () => {
    const base = {
      botId: 'x',
      startedAt: new Date(),
      finishedAt: new Date(),
      durationMs: 1,
      consecutiveFailures: 0,
      message: undefined,
    };
    const results: BotRunResult[] = [
      { ...base, status: 'ok', processed: 10, updated: 2, skipped: 1, errors: 0 },
      { ...base, status: 'partial', processed: 5, updated: 1, skipped: 0, errors: 2 },
      { ...base, status: 'skipped', processed: 0, updated: 0, skipped: 3, errors: 0 },
      { ...base, status: 'failed', processed: 0, updated: 0, skipped: 0, errors: 1 },
    ];
    expect(summarizeRuns(results)).toEqual({
      total: 4,
      ok: 1,
      partial: 1,
      skipped: 1,
      failed: 1,
      processed: 15,
      updated: 3,
      errors: 3,
    });
  });
});
