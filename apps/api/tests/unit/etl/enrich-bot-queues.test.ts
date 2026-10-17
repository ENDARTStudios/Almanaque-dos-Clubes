/**
 * T575 — as FILAS do bot (adaptadores) e a fila de coordenadas.
 *
 * Os lotes de baixo são MOCADOS de propósito: o que se prova aqui é o CONTRATO que o bot
 * acrescenta (progresso → roteador, resultado normalizado → contadores) e os caminhos de
 * DECISÃO da fila de coordenadas — inclusive os dois que não podem errar: "sem fonte" vira
 * `no_source` carimbado (a fila avança) e "falha de leitura" NÃO carimba nada (a fila fica
 * intacta, sem gravar gap falso).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

vi.mock('../../../src/modules/etl/enrich-media.service.js', () => ({
  enrichClubsMediaBatch: vi.fn(),
  enrichClubsEditorialBatch: vi.fn(),
  enrichPlayersMediaBatch: vi.fn(),
}));
vi.mock('../../../src/modules/etl/enrich-all-media.service.js', () => ({
  enrichAllMediaBatch: vi.fn(),
}));
vi.mock('../../../src/modules/etl/link-players-clubs.service.js', () => ({
  linkPlayersClubsBatch: vi.fn(),
}));
vi.mock('../../../src/modules/etl/commons-images.service.js', () => ({
  harvestClubsBatch: vi.fn(),
  harvestPlayersBatch: vi.fn(),
  defaultHarvestOptions: (apply: boolean) => ({
    apply,
    depth: 1,
    maxFiles: 100,
    tryFiles: 5,
  }),
}));

import {
  enrichClubsEditorialBatch,
  enrichClubsMediaBatch,
  enrichPlayersMediaBatch,
} from '../../../src/modules/etl/enrich-media.service.js';
import { enrichAllMediaBatch } from '../../../src/modules/etl/enrich-all-media.service.js';
import { linkPlayersClubsBatch } from '../../../src/modules/etl/link-players-clubs.service.js';
import {
  harvestClubsBatch,
  harvestPlayersBatch,
} from '../../../src/modules/etl/commons-images.service.js';
import {
  buildEnrichQueueAdapters,
  coordenadasBatch,
} from '../../../src/modules/etl/enrich-bot-queues.js';
import { ENRICH_QUEUE_ORDER } from '../../../src/modules/etl/enrich-bot-router.js';
import type { ClubCoordinateResult } from '../../../src/lib/wikidata/extract-club-coordinates.js';

const VAZIO = { processed: 0, updated: 0, gaps: 0, failures: 0 };

beforeEach(() => {
  vi.clearAllMocks();
});

/** Prisma falso: `$queryRaw` devolve contagem/ids; os carimbos vão para `stamps`. */
function fakePrisma(opts: {
  count?: number;
  ids?: Array<{ id: string }>;
  clubs?: Array<Record<string, unknown>>;
  updateCount?: number;
}) {
  const rawArgs: unknown[][] = [];
  const stamps: unknown[][] = [];
  const updates: Array<Record<string, unknown>> = [];
  const client = {
    $queryRaw: async (...args: unknown[]) => {
      rawArgs.push(args);
      return opts.count != null ? [{ n: opts.count }] : (opts.ids ?? []);
    },
    $executeRaw: async (...args: unknown[]) => {
      stamps.push(args);
      return 1;
    },
    club: {
      findMany: async () => opts.clubs ?? [],
      updateMany: async (args: Record<string, unknown>) => {
        updates.push(args);
        return { count: opts.updateCount ?? 1 };
      },
    },
  } as unknown as PrismaClient;
  return { client, rawArgs, stamps, updates };
}

const clubRow = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  qid: 'Q1',
  latitude: null,
  longitude: null,
  city: null,
  metadata: null,
  ...over,
});

/** Argumentos crus de UM `$queryRaw`, serializados e com as aspas desescapadas. */
const textoSql1 = (args: unknown[]): string =>
  args
    .map((v) => JSON.stringify(v) ?? '')
    .join(' ')
    .replace(/\\"/g, '"');

/** Argumentos de TODAS as chamadas de `$queryRaw` do caso. */
const textoSql = (rawArgs: unknown[][]): string => rawArgs.map(textoSql1).join('\n');

describe('T575 — adaptadores das filas', () => {
  it('entrega as OITO filas na ordem canônica do roteador, com as chaves que cobrem', () => {
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client);
    expect(adapters.map((a) => a.id)).toEqual([...ENRICH_QUEUE_ORDER]);
    expect(adapters.map((a) => a.keys.join(','))).toEqual([
      'logo,stadium,colors',
      'editorial',
      'kits,anthem,pennants',
      'profile',
      'club',
      'commonsLogo',
      'commonsPhoto',
      'coordinates',
    ]);
  });

  it('progress() devolve total e pending do MESMO predicado da seleção', async () => {
    const { client, rawArgs } = fakePrisma({ count: 7 });
    const adapters = buildEnrichQueueAdapters(client);
    const clubMedia = adapters.find((a) => a.id === 'club-media')!;
    expect(await clubMedia.progress()).toEqual({ total: 7, pending: 7 });
    // Duas consultas (universo do gap e ainda-não-tentado), com as três chaves no cursor.
    expect(rawArgs).toHaveLength(2);
    expect(textoSql(rawArgs)).toContain('"logoUrl" IS NULL');
    expect(textoSql(rawArgs)).toContain('"teamColors" IS NULL');
    // O total NÃO pergunta ao cursor (é o universo do gap); o pending pergunta.
    expect(textoSql1(rawArgs[0]!)).not.toContain('mediaEnrichment');
    expect(textoSql1(rawArgs[1]!)).toContain('mediaEnrichment');
    expect(textoSql1(rawArgs[1]!)).toContain('NOT ("mediaEnrichment" ?');
  });

  it('TODAS as filas sabem medir o próprio progresso (é o insumo do roteador)', async () => {
    const { client } = fakePrisma({ count: 4 });
    const adapters = buildEnrichQueueAdapters(client);
    for (const a of adapters) {
      expect(await a.progress()).toEqual({ total: 4, pending: 4 });
    }
    expect(adapters).toHaveLength(8);
  });

  it('club-media: `skipped` vira gaps e falha de leitura de artigo vira failures', async () => {
    vi.mocked(enrichClubsMediaBatch).mockResolvedValue({
      processed: 6,
      updated: 4,
      skipped: 2,
      unknownColors: [],
      infoboxFetchFailures: 1,
    });
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client);
    const out = await adapters[0]!.run(40, { apply: true });
    expect(out).toEqual({ processed: 6, updated: 4, gaps: 2, failures: 1 });
    expect(enrichClubsMediaBatch).toHaveBeenCalledWith(40, {
      apply: true,
      prisma: client,
      refreshDays: undefined,
    });
  });

  it('editorial e perfil: `skipped` vira gaps (sem contagem de falha própria)', async () => {
    vi.mocked(enrichClubsEditorialBatch).mockResolvedValue({
      processed: 3,
      updated: 1,
      skipped: 2,
      unknownColors: [],
    });
    vi.mocked(enrichPlayersMediaBatch).mockResolvedValue({
      processed: 9,
      updated: 5,
      skipped: 4,
      unknownColors: [],
    });
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client);
    expect(await adapters[1]!.run(10, { apply: false })).toEqual({
      processed: 3,
      updated: 1,
      gaps: 2,
      failures: 0,
    });
    expect(await adapters[3]!.run(10, { apply: false })).toEqual({
      processed: 9,
      updated: 5,
      gaps: 4,
      failures: 0,
    });
  });

  it('mídia extra: enriched → updated, gaps → gaps, errors → failures', async () => {
    vi.mocked(enrichAllMediaBatch).mockResolvedValue({
      processed: 5,
      enriched: 2,
      gaps: 2,
      byMedia: {
        kits: { found: 1, gap: 1, already: 0 },
        anthem: { found: 1, gap: 1, already: 0 },
        pennants: { found: 0, gap: 0, already: 0 },
      },
      errors: 1,
    });
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client);
    expect(await adapters[2]!.run(40, { apply: true })).toEqual({
      processed: 5,
      updated: 2,
      gaps: 2,
      failures: 1,
    });
  });

  it('player-club: sem-contrato-aberto + time-fora-do-acervo somam em gaps declarados', async () => {
    vi.mocked(linkPlayersClubsBatch).mockResolvedValue({
      processed: 12,
      linked: 7,
      noOpenContract: 3,
      outsideArchive: 2,
      targetQids: 9,
      targetClubsFound: 7,
      failures: 0,
    });
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client);
    const out = await adapters[4]!.run(40, { apply: true });
    expect(out).toEqual({ processed: 12, updated: 7, gaps: 5, failures: 0 });
  });

  it('commons (T578): escudo/foto usam o lote do coletor e o cap chega inteiro', async () => {
    const relatorio = (kind: 'club' | 'player') => ({
      kind,
      processed: 4,
      enriched: 2,
      noSource: 1,
      readErrors: 1,
      rejections: {},
      examples: [],
    });
    vi.mocked(harvestClubsBatch).mockResolvedValue(relatorio('club'));
    vi.mocked(harvestPlayersBatch).mockResolvedValue(relatorio('player'));
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client);
    expect(await adapters[5]!.run(37, { apply: true })).toEqual({
      processed: 4,
      updated: 2,
      gaps: 1,
      failures: 1,
    });
    expect(harvestClubsBatch).toHaveBeenCalledWith(
      client,
      37,
      expect.objectContaining({ apply: true, tryFiles: 5 }),
    );
    expect(await adapters[6]!.run(23, { apply: false })).toEqual({
      processed: 4,
      updated: 2,
      gaps: 1,
      failures: 1,
    });
    expect(harvestPlayersBatch).toHaveBeenCalledWith(
      client,
      23,
      expect.objectContaining({ apply: false }),
    );
  });

  it('refreshDays configurado é repassado aos lotes (revisita é decisão explícita)', async () => {
    vi.mocked(enrichClubsMediaBatch).mockResolvedValue({
      processed: 0,
      updated: 0,
      skipped: 0,
      unknownColors: [],
    });
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client, { refreshDays: 7 });
    await adapters[0]!.run(40, { apply: false });
    expect(vi.mocked(enrichClubsMediaBatch).mock.calls[0]![1]).toMatchObject({ refreshDays: 7 });
  });

  it('o teto da volta chega ao lote (cap é o freio de taxa, não sugestão)', async () => {
    vi.mocked(enrichAllMediaBatch).mockResolvedValue({
      processed: 0,
      enriched: 0,
      gaps: 0,
      byMedia: {
        kits: { found: 0, gap: 0, already: 0 },
        anthem: { found: 0, gap: 0, already: 0 },
        pennants: { found: 0, gap: 0, already: 0 },
      },
      errors: 0,
    });
    const { client } = fakePrisma({ count: 1 });
    const adapters = buildEnrichQueueAdapters(client, { refreshDays: 0 });
    await adapters[2]!.run(13, { apply: true });
    expect(vi.mocked(enrichAllMediaBatch).mock.calls[0]![0]).toBe(13);
    expect(vi.mocked(enrichAllMediaBatch).mock.calls[0]![1]).toMatchObject({
      apply: true,
      refreshDays: undefined,
    });
  });
});

describe('T575 — fila de coordenadas (decisão testada sem rede)', () => {
  const resolverCom = (r: Map<string, ClubCoordinateResult | null>) =>
    vi.fn(async () => r) as unknown as Parameters<typeof coordenadasBatch>[3];

  it('clube que JÁ tem coordenada sai da fila carimbado `already_present`, sem requisição', async () => {
    const resolver = resolverCom(new Map());
    const { client, stamps, updates } = fakePrisma({
      ids: [{ id: 'c1' }],
      clubs: [clubRow({ latitude: -23.5, longitude: -46.6 })],
    });
    const out = await coordenadasBatch(client, 40, true, resolver);
    expect(out).toEqual({ processed: 1, updated: 0, gaps: 0, failures: 0 });
    expect(resolver).not.toHaveBeenCalled(); // não gasta requisição com quem já tem dado
    expect(updates).toHaveLength(0);
    expect(JSON.stringify(stamps)).toContain('already_present');
  });

  it('coordenada resolvida: grava só o que está NULL, com procedência, e carimba `enriched`', async () => {
    const resolver = resolverCom(
      new Map([
        [
          'Q1',
          { lat: -23.5, lng: -46.6, source: 'P159', cityLabel: 'São Paulo', confidence: 'high' },
        ],
      ]),
    );
    const { client, stamps, updates } = fakePrisma({ ids: [{ id: 'c1' }], clubs: [clubRow()] });
    const out = await coordenadasBatch(client, 40, true, resolver);
    expect(out).toEqual({ processed: 1, updated: 1, gaps: 0, failures: 0 });
    const data = updates[0]!.data as Record<string, unknown>;
    expect(data.latitude).toBe(-23.5);
    expect(data.longitude).toBe(-46.6);
    expect(data.city).toBe('São Paulo');
    expect(data.metadata).toMatchObject({ coordSource: 'P159', coordPrecision: 'high' });
    expect(data.importedFrom).toBeUndefined(); // procedência da INGESTÃO não é tocada
    expect(JSON.stringify(stamps)).toContain('enriched');
  });

  it('clube sem coordenada na fonte: `no_source` carimbado (gap declarado, a fila ANDA)', async () => {
    const resolver = resolverCom(new Map([['Q1', null]]));
    const { client, stamps } = fakePrisma({ ids: [{ id: 'c1' }], clubs: [clubRow()] });
    const out = await coordenadasBatch(client, 40, true, resolver);
    expect(out).toEqual({ processed: 1, updated: 0, gaps: 1, failures: 0 });
    expect(JSON.stringify(stamps)).toContain('no_source');
  });

  it('FALHA DE LEITURA (429/rede): failures e NENHUM carimbo — a fila fica intacta', async () => {
    const resolver = vi.fn(async () => {
      throw new Error('HTTP 429');
    }) as unknown as Parameters<typeof coordenadasBatch>[3];
    const { client, stamps, updates } = fakePrisma({
      ids: [{ id: 'c1' }, { id: 'c2' }],
      clubs: [clubRow(), clubRow({ id: 'c2', qid: 'Q2' })],
    });
    const out = await coordenadasBatch(client, 40, true, resolver);
    expect(out).toEqual({ processed: 0, updated: 0, gaps: 0, failures: 2 });
    expect(stamps).toHaveLength(0); // carimbar aqui gravaria "sem fonte" a partir de um timeout
    expect(updates).toHaveLength(0);
  });

  it('dry-run percorre e NÃO carimba nem grava', async () => {
    const resolver = resolverCom(new Map([['Q1', null]]));
    const { client, stamps, updates } = fakePrisma({ ids: [{ id: 'c1' }], clubs: [clubRow()] });
    const out = await coordenadasBatch(client, 40, false, resolver);
    expect(out).toEqual({ processed: 1, updated: 0, gaps: 1, failures: 0 });
    expect(stamps).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it('fila vazia: não chama a fonte e devolve zeros', async () => {
    const resolver = resolverCom(new Map());
    const { client } = fakePrisma({ ids: [], clubs: [] });
    expect(await coordenadasBatch(client, 40, true, resolver)).toEqual(VAZIO);
    expect(resolver).not.toHaveBeenCalled();
  });
});
