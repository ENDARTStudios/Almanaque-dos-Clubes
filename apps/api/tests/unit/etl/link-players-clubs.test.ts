/**
 * T575 — lote do vínculo JOGADOR → CLUBE (extraído do script T551).
 *
 * Sem rede e sem banco: o `fetchEntities` é injetado e o Prisma é falso. O que se prova é a
 * regra do acervo, e não a inferência em si (essa tem teste próprio em
 * `player-current-club.test.ts`): só vincula clube DO ACERVO, TODA saída carimba a tentativa
 * (inclusive "sem contrato aberto" e "time fora do acervo") e FALHA DE LEITURA não carimba
 * nada — carimbar ali seria gravar gap falso para a fila inteira.
 */
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { linkPlayersClubsBatch } from '../../../src/modules/etl/link-players-clubs.service.js';
import type { fetchEntities } from '../../../src/modules/etl/connectors/wikidata-media.connector.js';

const jogador = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  qid: 'Q10',
  photoUrl: null,
  country: null,
  position: null,
  name: 'Jogador de Teste',
  ...over,
});

/** Contrato em ABERTO e recente (o único caso em que o P54 é assumido como clube atual). */
const p54Aberto = (timeQid: string) => ({
  mainsnak: { datavalue: { value: { id: timeQid } } },
  qualifiers: {
    P580: [
      {
        datavalue: {
          value: {
            time: `+${new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)}T00:00:00Z`,
          },
        },
      },
    ],
  },
});

const p54Encerrado = (timeQid: string) => ({
  mainsnak: { datavalue: { value: { id: timeQid } } },
  qualifiers: {
    P580: [{ datavalue: { value: { time: '+2015-01-01T00:00:00Z' } } }],
    P582: [{ datavalue: { value: { time: '+2016-01-01T00:00:00Z' } } }],
  },
});

function fakePrisma(opts: {
  rows: Array<Record<string, unknown>>;
  clubes?: Array<{ id: string; qid: string }>;
}) {
  const stamps: unknown[][] = [];
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    $queryRaw: async () => opts.rows,
    $executeRaw: async (...args: unknown[]) => {
      stamps.push(args);
      return 1;
    },
    club: { findMany: async () => opts.clubes ?? [] },
    player: {
      update: async (args: Record<string, unknown>) => {
        updates.push(args);
        return {};
      },
    },
  } as unknown as PrismaClient;
  return { client, stamps, updates };
}

const fonte = (mapa: Record<string, { claims?: Record<string, unknown> }>) =>
  vi.fn(async (qids: string[]) => {
    const out = new Map<string, unknown>();
    for (const q of qids) out.set(q, mapa[q] ?? null);
    return out;
  }) as unknown as typeof fetchEntities;

describe('T575 — lote do vínculo jogador → clube', () => {
  it('vincula quando o P54 está em aberto e o time É clube do acervo', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador()],
      clubes: [{ id: 'cl1', qid: 'Q100' }],
    });
    const out = await linkPlayersClubsBatch(50, {
      apply: true,
      prisma: client,
      fetchFn: fonte({ Q10: { claims: { P54: [p54Aberto('Q100')] } } }),
    });
    expect(out).toMatchObject({ processed: 1, linked: 1, targetQids: 1, targetClubsFound: 1 });
    expect(updates[0]).toMatchObject({ where: { id: 'p1' }, data: { clubId: 'cl1' } });
    expect(JSON.stringify(stamps)).toContain('enriched');
  });

  it('sem contrato em aberto: NÃO vincula e carimba `no_source` (gap declarado, a fila anda)', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador()],
      clubes: [{ id: 'cl1', qid: 'Q100' }],
    });
    const out = await linkPlayersClubsBatch(50, {
      apply: true,
      prisma: client,
      fetchFn: fonte({ Q10: { claims: { P54: [p54Encerrado('Q100')] } } }),
    });
    expect(out).toMatchObject({ processed: 1, linked: 0, noOpenContract: 1, outsideArchive: 0 });
    expect(updates).toHaveLength(0);
    expect(JSON.stringify(stamps)).toContain('no_source');
  });

  it('time atual FORA do acervo: gap declarado (e curável numa ingestão futura)', async () => {
    const { client, stamps } = fakePrisma({ rows: [jogador()], clubes: [] });
    const out = await linkPlayersClubsBatch(50, {
      apply: true,
      prisma: client,
      fetchFn: fonte({ Q10: { claims: { P54: [p54Aberto('Q999')] } } }),
    });
    expect(out).toMatchObject({ processed: 1, linked: 0, outsideArchive: 1, targetQids: 1 });
    expect(JSON.stringify(stamps)).toContain('no_source');
  });

  it('FALHA DE LEITURA: failures e NENHUM carimbo — a fila fica intacta', async () => {
    const { client, stamps, updates } = fakePrisma({ rows: [jogador()] });
    const fetchFn = vi.fn(async () => {
      throw new Error('HTTP 503');
    }) as unknown as typeof fetchEntities;
    const out = await linkPlayersClubsBatch(50, { apply: true, prisma: client, fetchFn });
    expect(out).toMatchObject({ processed: 0, linked: 0, failures: 1 });
    expect(stamps).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it('fila vazia: não chama a fonte e devolve zeros', async () => {
    const { client } = fakePrisma({ rows: [] });
    const fetchFn = vi.fn() as unknown as typeof fetchEntities;
    const out = await linkPlayersClubsBatch(50, { apply: true, prisma: client, fetchFn });
    expect(out).toMatchObject({ processed: 0, linked: 0, targetQids: 0, failures: 0 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('dry-run: mede os vínculos e não grava nem carimba', async () => {
    const { client, stamps, updates } = fakePrisma({
      rows: [jogador()],
      clubes: [{ id: 'cl1', qid: 'Q100' }],
    });
    const out = await linkPlayersClubsBatch(50, {
      apply: false,
      prisma: client,
      fetchFn: fonte({ Q10: { claims: { P54: [p54Aberto('Q100')] } } }),
    });
    expect(out).toMatchObject({ processed: 1, linked: 1 });
    expect(updates).toHaveLength(0);
    expect(stamps).toHaveLength(0);
  });

  it('proveniência: o `limit` é o do chamador e a janela do P54 é respeitada', async () => {
    const { client } = fakePrisma({ rows: [jogador()], clubes: [{ id: 'cl1', qid: 'Q100' }] });
    const fetchFn = fonte({ Q10: { claims: { P54: [p54Aberto('Q100')] } } });
    // Janela de 0 anos: "aberto há 30 dias" deixa de ser recência suficiente.
    const out = await linkPlayersClubsBatch(7, {
      apply: false,
      prisma: client,
      maxAgeYears: 0,
      fetchFn,
    });
    expect(fetchFn).toHaveBeenCalled();
    expect(out.noOpenContract).toBe(1);
  });
});
