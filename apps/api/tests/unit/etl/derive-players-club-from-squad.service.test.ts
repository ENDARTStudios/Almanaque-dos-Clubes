/**
 * T582 — LOTE da derivação jogador → clube.
 *
 * Sem rede e sem banco: Prisma falso. Prova o que o lote faz além da regra pura
 * (`player-club-from-squad.test.ts`): seleciona só `clubId IS NULL`, carimba TODA
 * saída no cursor próprio `clubFromSquad` com `source`, não toca em `clubId` já
 * preenchido e não grava nada em dry-run.
 */
import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { derivePlayersClubFromSquadBatch } from '../../../src/modules/etl/derive-players-club-from-squad.service.js';

const jogador = (id: string) => ({
  id,
  qid: 'Q' + id,
  photoUrl: null,
  country: null,
  position: null,
  name: id,
});

const now = new Date('2026-10-17T00:00:00Z');

function fakePrisma(opts: {
  rows: Array<ReturnType<typeof jogador>>;
  edges?: Array<{ sourceId: string; targetId: string; metadata: unknown }>;
  clubes?: Array<{ id: string }>;
  updateCount?: number;
}) {
  const stamps: string[] = [];
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    $queryRaw: async () => opts.rows,
    $executeRaw: async (_strings: TemplateStringsArray, ...args: unknown[]) => {
      stamps.push(JSON.stringify(args));
      return 1;
    },
    knowledgeGraph: {
      findMany: async () => opts.edges ?? [],
    },
    club: {
      findMany: async () => opts.clubes ?? [],
    },
    player: {
      updateMany: async (args: Record<string, unknown>) => {
        updates.push(args);
        return { count: opts.updateCount ?? 1 };
      },
    },
  } as unknown as PrismaClient;
  return { client, stamps, updates };
}

describe('T582 — lote da derivação jogador → clube', () => {
  it('vincula a aresta mais recente quando o clube É do acervo e carimba `enriched` + source', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador('p1')],
      edges: [
        { sourceId: 'p1', targetId: 'c1', metadata: { year: 2024 } },
        { sourceId: 'p1', targetId: 'c2', metadata: { year: 2025 } },
      ],
      clubes: [{ id: 'c1' }, { id: 'c2' }],
    });
    const out = await derivePlayersClubFromSquadBatch(300, {
      apply: true,
      prisma: client,
      now,
    });
    expect(out).toMatchObject({ processed: 1, linked: 1, noEdge: 0 });
    expect(updates[0]).toMatchObject({
      where: { id: 'p1', clubId: null },
      data: { clubId: 'c2' },
    });
    expect(stamps.join('\n')).toContain('enriched');
    expect(stamps.join('\n')).toContain('knowledge_graph:PLAYED_FOR');
  });

  it('sem aresta: NÃO grava clube e carimba `no_source` com motivo `no_edge`', async () => {
    const { client, stamps, updates } = fakePrisma({ rows: [jogador('p1')] });
    const out = await derivePlayersClubFromSquadBatch(300, { apply: true, prisma: client, now });
    expect(out).toMatchObject({ processed: 1, linked: 0, noEdge: 1 });
    expect(updates).toHaveLength(0);
    expect(stamps.join('\n')).toContain('no_source');
    expect(stamps.join('\n')).toContain('no_edge');
  });

  it('clube fora do acervo: carimba `no_source` com motivo `outside_archive`', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador('p1')],
      edges: [{ sourceId: 'p1', targetId: 'fora', metadata: { year: 2025 } }],
      clubes: [],
    });
    const out = await derivePlayersClubFromSquadBatch(300, { apply: true, prisma: client, now });
    expect(out).toMatchObject({ processed: 1, linked: 0, outsideArchive: 1 });
    expect(updates).toHaveLength(0);
    expect(stamps.join('\n')).toContain('outside_archive');
  });

  it('elenco antigo: carimba `no_source` com motivo `stale`', async () => {
    const { client, stamps } = fakePrisma({
      rows: [jogador('p1')],
      edges: [{ sourceId: 'p1', targetId: 'c1', metadata: { year: 2015 } }],
      clubes: [{ id: 'c1' }],
    });
    const out = await derivePlayersClubFromSquadBatch(300, { apply: true, prisma: client, now });
    expect(out).toMatchObject({ processed: 1, linked: 0, stale: 1 });
    expect(stamps.join('\n')).toContain('stale');
  });

  it('empate no ano mais recente: `no_source` com motivo `ambiguous_latest`', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador('p1')],
      edges: [
        { sourceId: 'p1', targetId: 'c1', metadata: { year: 2025 } },
        { sourceId: 'p1', targetId: 'c2', metadata: { year: 2025 } },
      ],
      clubes: [{ id: 'c1' }, { id: 'c2' }],
    });
    const out = await derivePlayersClubFromSquadBatch(300, { apply: true, prisma: client, now });
    expect(out).toMatchObject({ processed: 1, linked: 0, ambiguousLatest: 1 });
    expect(updates).toHaveLength(0);
    expect(stamps.join('\n')).toContain('ambiguous_latest');
  });

  it('corrida: `clubId` preenchido entre seleção e escrita não é sobrescrito', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador('p1')],
      edges: [{ sourceId: 'p1', targetId: 'c1', metadata: { year: 2025 } }],
      clubes: [{ id: 'c1' }],
      updateCount: 0,
    });
    const out = await derivePlayersClubFromSquadBatch(300, { apply: true, prisma: client, now });
    expect(out).toMatchObject({ processed: 1, linked: 0, alreadyLinked: 1 });
    expect(updates[0]).toMatchObject({ where: { id: 'p1', clubId: null } });
    expect(stamps.join('\n')).toContain('already_present');
    expect(stamps.join('\n')).toContain('already_linked');
  });

  it('dry-run: mede mas NÃO grava clube nem carimbo', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador('p1')],
      edges: [{ sourceId: 'p1', targetId: 'c1', metadata: { year: 2025 } }],
      clubes: [{ id: 'c1' }],
    });
    const out = await derivePlayersClubFromSquadBatch(300, {
      apply: false,
      prisma: client,
      now,
    });
    expect(out).toMatchObject({ processed: 1, linked: 1 });
    expect(updates).toHaveLength(0);
    expect(stamps).toHaveLength(0);
  });

  it('fila vazia: devolve zeros sem consultar arestas', async () => {
    const { client } = fakePrisma({ rows: [] });
    const out = await derivePlayersClubFromSquadBatch(300, { apply: true, prisma: client, now });
    expect(out).toMatchObject({ processed: 0, linked: 0 });
  });
});
