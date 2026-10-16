/**
 * T528 — testes do job unificado de mídia. O que é travado aqui:
 *
 *  1. o CURSOR: um clube com tentativa registrada NÃO volta para a fila (era o
 *     defeito que congelava a cobertura — o mesmo lote alfabético toda noite);
 *  2. as regras ESTRITAS de aceitação (nada entra por semelhança de nome);
 *  3. o que NÃO é sobrescrito (curadoria T523-T526 preservada).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  attemptRecord,
  audioFileCandidates,
  enrichAllMediaBatch,
  enrichOneClub,
  isFullyAttempted,
  isPennantFile,
  pendingMedia,
  type ClubRow,
} from '../../../src/modules/etl/enrich-all-media.service.js';
import type { KitPart } from '../../../src/lib/wikipedia/kit-composition.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const club = (over: Partial<ClubRow> = {}): ClubRow => ({
  id: 'c1',
  qid: 'Q1',
  name: 'Clube de Teste',
  kitHistory: null,
  anthem: null,
  pennants: null,
  mediaEnrichment: null,
  ...over,
});

const deps = (over: Partial<Parameters<typeof enrichOneClub>[1]> = {}) => ({
  getWikiTitle: () => 'Clube de Teste',
  wikitext: async () => null,
  fileCache: new Map<string, KitPart>(),
  ...over,
});

describe('T528 — cursor do lote (o defeito que congelava a cobertura)', () => {
  it('clube sem nada tem as três mídias pendentes', () => {
    expect(pendingMedia(club(), null)).toEqual({ kits: true, anthem: true, pennants: true });
    expect(isFullyAttempted(club(), null)).toBe(false);
  });

  it('tentativa REGISTRADA tira o clube da fila mesmo sem dado (gap declarado)', () => {
    const seen = { kits: { status: 'no_source' }, anthem: { status: 'no_source' } };
    expect(pendingMedia(club(), seen)).toEqual({ kits: false, anthem: false, pennants: true });
    // com as três registradas, o clube sai da seleção para sempre
    const all = { kits: {}, anthem: {}, pennants: {} };
    expect(isFullyAttempted(club(), all)).toBe(true);
  });

  it('campo já preenchido não é retentado (preserva a curadoria T523-T526)', () => {
    const c = club({ kitHistory: [{ season: '2023' }], anthem: { audioUrl: 'x' } });
    expect(pendingMedia(c, null)).toEqual({ kits: false, anthem: false, pennants: true });
  });

  it('o registro grava as TRÊS mídias (inclusive as vazias) — é o cursor', () => {
    const rec = attemptRecord({ kits: 'enriched', anthem: 'no_source', pennants: 'error' }, 'T');
    expect(Object.keys(rec).sort()).toEqual(['anthem', 'kits', 'pennants']);
    expect(rec.anthem).toEqual({ at: 'T', status: 'no_source' });
    expect(rec.pennants?.status).toBe('error');
  });
});

describe('T528 — descoberta estrita', () => {
  it('áudio só entra se for arquivo de áudio E o nome ligar a hino', () => {
    const wikitext = [
      '[[Ficheiro:Hino do Clube.ogg|thumb]]',
      '[[Ficheiro:Escudo do Clube.png]]',
      '[[Ficheiro:Torcida cantando.ogg]]',
    ].join('\n');
    expect(audioFileCandidates(wikitext)).toEqual(['File:Hino do Clube.ogg']);
  });

  it('template de áudio também é lido', () => {
    expect(audioFileCandidates('{{Áudio|Hino-do-Clube.ogg|posição=dir}}')).toEqual([
      'File:Hino-do-Clube.ogg',
    ]);
  });

  it('flâmula só pelo TÍTULO do arquivo (nunca por busca textual solta)', () => {
    expect(isPennantFile('File:Flamula-comemorativa-bragantino-1965.jpg')).toBe(true);
    expect(isPennantFile('File:Arsenal pennant 2001.jpg')).toBe(true);
    expect(isPennantFile('File:Estádio do Clube 2020.jpg')).toBe(false);
    expect(isPennantFile('File:Bandeira da cidade de Palmeiras.jpg')).toBe(false);
  });
});

describe('T528 — enrichOneClub (IO injetado)', () => {
  it('sem página na Wikipédia: gap declarado, nada gravado', async () => {
    const out = await enrichOneClub(club(), deps({ getWikiTitle: () => undefined }));
    expect(out.updated).toBe(false);
    expect(out.values).toEqual({});
    expect(out.media).toEqual({ kits: 'no_source', anthem: 'no_source', pennants: 'no_source' });
  });

  it('página sem composição nem áudio: nada de dados, três gaps', async () => {
    const out = await enrichOneClub(
      club(),
      deps({
        wikitext: async () => 'Texto do artigo sem infobox de uniforme.',
        categoryFilesFn: async () => [],
      }),
    );
    expect(out.values).toEqual({});
    expect(out.media.kits).toBe('no_source');
    expect(out.media.anthem).toBe('no_source');
    expect(out.media.pennants).toBe('no_source');
  });

  it('uniforme da infobox entra com a peça verificada ao vivo', async () => {
    const wikitext = ['{{Infobox clube', '| corpo1 = 008000', '| skin1 = _clube1', '}}'].join('\n');
    const out = await enrichOneClub(
      club(),
      deps({
        wikitext: async () => wikitext,
        categoryFilesFn: async () => [],
        // Double da verificação de peça (o mapeamento de parâmetros é código do
        // T523, já testado lá): aqui só interessa que uma peça COMPOSTA vira kit.
        buildPartsFn: async (params) => {
          const pattern = params.pattern_b ?? params.skin1 ?? '_clube1';
          const verified: KitPart = {
            pattern,
            color: '008000',
            file: `File:Kit body ${pattern}.png`,
            fileUrl: 'https://upload.wikimedia.org/x.png',
            license: 'CC BY-SA 4.0',
          };
          return {
            leftarm: verified,
            body: verified,
            rightarm: verified,
            shorts: verified,
            socks: verified,
          };
        },
      }),
    );
    expect(out.media.kits).toBe('enriched');
    expect(out.values.kits?.[0]?.parts.body.color).toBe('008000');
    expect(out.updated).toBe(true);
  });

  it('hino só com áudio verificado ao vivo (licença presente); letra nunca vem', async () => {
    const out = await enrichOneClub(
      club(),
      deps({
        wikitext: async () => '[[Ficheiro:Hino do Clube.ogg]]',
        categoryFilesFn: async () => [],
        verifyFileFn: async () => ({
          url: 'https://upload.wikimedia.org/hino.ogg',
          license: 'CC BY-SA 4.0',
          deleted: false,
        }),
      }),
    );
    expect(out.media.anthem).toBe('enriched');
    expect(out.values.anthem?.lyrics).toBeNull();
    expect(out.values.anthem?.lyricsRestricted).toBe(true);
    expect(out.values.anthem?.audioLicense).toBe('CC BY-SA 4.0');
  });

  it('áudio sem licença (ou com pedido de exclusão) NÃO entra', async () => {
    const out = await enrichOneClub(
      club(),
      deps({
        wikitext: async () => '[[Ficheiro:Hino do Clube.ogg]]',
        categoryFilesFn: async () => [],
        verifyFileFn: async () => ({ url: 'https://x/hino.ogg', license: null, deleted: false }),
      }),
    );
    expect(out.media.anthem).toBe('no_source');
    expect(out.values.anthem).toBeUndefined();
  });

  it('flâmula vem da categoria do clube, com imagem e licença verificadas', async () => {
    const out = await enrichOneClub(
      club(),
      deps({
        wikitext: async () => 'sem uniforme',
        categoryFilesFn: async () => ['File:Estádio.jpg', 'File:Flamula do Clube.jpg'],
        verifyFileFn: async () => ({
          url: 'https://upload.wikimedia.org/flamula.jpg',
          license: 'CC BY 2.0',
          deleted: false,
        }),
      }),
    );
    expect(out.media.pennants).toBe('enriched');
    expect(out.values.pennants?.[0]?.license).toBe('CC BY 2.0');
    expect(out.values.pennants?.[0]?.imageUrl).toContain('flamula.jpg');
  });
});

// ---------------------------------------------------------------------------
// Lote completo — `fetch` stubado (cobre também as funções de IO reais)
// ---------------------------------------------------------------------------

/** Roteador de `fetch` por URL: somente as chamadas que o job faz de verdade. */
function stubFetch(over: { wikitext?: string; category?: string[]; license?: string | null } = {}) {
  const fetchStub = async (input: unknown): Promise<unknown> => {
    const url = String(input);
    const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (url.includes('wikidata.org')) {
      return json({
        entities: {
          Q1: { sitelinks: { ptwiki: { title: 'Clube de Teste' } } },
          Q2: { sitelinks: {} }, // sem página pt/en → gap declarado
        },
      });
    }
    if (url.includes('pt.wikipedia.org')) {
      return json({ parse: { wikitext: { '*': over.wikitext ?? '' } } });
    }
    if (url.includes('list=categorymembers')) {
      return json({
        query: { categorymembers: (over.category ?? []).map((title) => ({ title })) },
      });
    }
    if (url.includes('commons.wikimedia.org')) {
      const license = over.license === undefined ? 'CC BY-SA 4.0' : over.license;
      return json({
        query: {
          pages: {
            '1': {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/a.ogg',
                  extmetadata: license ? { LicenseShortName: { value: license } } : {},
                },
              ],
            },
          },
        },
      });
    }
    return json({});
  };
  return fetchStub;
}

interface FakeUpdate {
  where: { id: string };
  data: Record<string, unknown>;
}

function fakePrisma(rows: ClubRow[]) {
  const updates: FakeUpdate[] = [];
  const rawExecs: string[] = [];
  const rawArgs: unknown[][] = [];
  return {
    updates,
    rawExecs,
    rawArgs,
    client: {
      club: {
        findMany: async () => rows,
        update: async (args: FakeUpdate) => {
          updates.push(args);
          return {};
        },
      },
      // T547 — a tentativa é gravada por MESCLA (`||` no JSONB), não por substituição do
      // objeto: o fake registra as chamadas para os testes conferirem o patch.
      $executeRaw: async (...args: unknown[]) => {
        // O patch é INTERPOLADO (`${patch}::jsonb`), não fragmento estático: junta os
        // valores para os testes conferirem o que foi mesclado.
        rawExecs.push(
          args
            .slice(1)
            .map((v) => JSON.stringify(v))
            .join(' '),
        );
        return 1;
      },
      $queryRaw: async (...args: unknown[]) => {
        // A seleção do cursor roda em SQL cru; o predicado `IS NULL` / `IS NOT NULL`
        // é exercitado em PRODUÇÃO (foi ali que a versão com `not: Prisma.DbNull`
        // falhou). Aqui basta devolver os ids do cenário do teste — mas os argumentos
        // são GUARDADOS para o teste do T575 conferir QUAL predicado foi usado.
        rawArgs.push(args);
        return rows.map((r) => ({ id: r.id }));
      },
      $disconnect: async () => undefined,
    },
  };
}

describe('T528 — enrichAllMediaBatch (lote, fetch stubado)', () => {
  /** Todo argumento cru de `$queryRaw`, serializado e com as aspas desescapadas. */
  const textoSql = (rawArgs: unknown[][]): string =>
    rawArgs
      .map((args) => args.map((v) => JSON.stringify(v) ?? '').join(' '))
      .join('\n')
      .replace(/\\"/g, '"');

  it('dry-run: mede o lote e NÃO escreve', async () => {
    vi.stubGlobal('fetch', stubFetch({ wikitext: '[[Ficheiro:Hino do Clube de Teste.ogg]]' }));
    const { client, updates } = fakePrisma([club({ id: 'a' }), club({ id: 'b', qid: 'Q2' })]);
    const out = await enrichAllMediaBatch(500, {
      apply: false,
      prisma: client as unknown as PrismaClient,
    });
    expect(out.processed).toBe(2);
    expect(out.enriched).toBe(1); // só o clube com hino verificado
    expect(out.gaps).toBe(1); // o clube sem página na Wikipédia
    expect(out.byMedia.anthem.found).toBe(1);
    expect(updates).toHaveLength(0);
  });

  it('apply: grava os campos novos E o registro de tentativa nas três mídias', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch({
        wikitext: '[[Ficheiro:Hino do Clube de Teste.ogg]]',
        category: ['File:Flamula do Clube de Teste.jpg'],
      }),
    );
    const { client, updates, rawExecs } = fakePrisma([club({ id: 'a' })]);
    const out = await enrichAllMediaBatch(500, {
      apply: true,
      prisma: client as unknown as PrismaClient,
    });
    expect(out.enriched).toBe(1);
    expect(updates).toHaveLength(1);
    const data = updates[0]!.data;
    // T547 — a tentativa NÃO vai mais no update do Prisma (substituiria o objeto e
    // apagaria as chaves dos outros jobs): vai por mescla SQL com as três mídias.
    expect(data.mediaEnrichment).toBeUndefined();
    expect(data.anthem).toBeDefined();
    expect(data.pennants).toBeDefined();
    const patch = rawExecs.join(' ');
    expect(patch).toContain('kits');
    expect(patch).toContain('anthem');
    expect(patch).toContain('pennants');
  });

  it('apply NUNCA sobrescreve campo já preenchido (curadoria T524 preservada)', async () => {
    vi.stubGlobal('fetch', stubFetch({ wikitext: '[[Ficheiro:Hino do Clube de Teste.ogg]]' }));
    const { client, updates, rawExecs } = fakePrisma([
      club({ id: 'a', anthem: { composer: 'curado' } }),
    ]);
    await enrichAllMediaBatch(500, { apply: true, prisma: client as unknown as PrismaClient });
    // Não há NADA a gravar (o único campo encontrado já existia) — o update é omitido
    // de propósito; a tentativa ainda é registrada para o cursor avançar.
    expect(updates).toHaveLength(0);
    expect(rawExecs.length).toBeGreaterThan(0);
  });

  it('recheck: reprocessa os já tentados e prova o noop (enriched=0)', async () => {
    vi.stubGlobal('fetch', stubFetch({ wikitext: 'sem uniforme aqui' }));
    const tentado = {
      kits: { at: 'T', status: 'no_source' },
      anthem: { at: 'T', status: 'no_source' },
      pennants: { at: 'T', status: 'no_source' },
    };
    const { client, updates, rawExecs } = fakePrisma([club({ id: 'a', mediaEnrichment: tentado })]);
    const out = await enrichAllMediaBatch(500, {
      apply: true,
      recheck: true,
      prisma: client as unknown as PrismaClient,
    });
    expect(out.processed).toBe(1);
    expect(out.enriched).toBe(0);
    expect(out.byMedia.kits.already).toBe(1);
    expect(updates).toHaveLength(0); // nada a gravar (já estava tudo lá)
    expect(rawExecs.length).toBeGreaterThan(0); // mas a tentativa é re-carimbada
  });

  it('lote vazio: não faz nada e não quebra', async () => {
    vi.stubGlobal('fetch', stubFetch({}));
    const { client } = fakePrisma([]);
    const out = await enrichAllMediaBatch(500, {
      apply: true,
      prisma: client as unknown as PrismaClient,
    });
    expect(out).toMatchObject({ processed: 0, enriched: 0, gaps: 0 });
  });

  it('T575 — o modo normal pergunta ao CURSOR POR CHAVE, não ao registro inteiro', async () => {
    // Antes: `"mediaEnrichment" IS NULL`. Como o job de mídia (04:00) carimba TODO clube
    // que passa, e o unificado roda às 07:00, a fila de uniforme/hino/flâmula parava de
    // ter candidatos conforme o acervo era carimbado — cursor existia, seleção não o
    // consultava. O guarda é o texto que vai ao banco.
    vi.stubGlobal('fetch', stubFetch({}));
    const { client, rawArgs } = fakePrisma([]);
    await enrichAllMediaBatch(500, { apply: false, prisma: client as unknown as PrismaClient });
    const sql = textoSql(rawArgs);
    expect(sql).toContain('"mediaEnrichment" IS NULL');
    expect(sql).not.toContain('"mediaEnrichment" IS NOT NULL');
    expect(sql).toContain('kits');
    expect(sql).toContain('anthem');
    expect(sql).toContain('pennants');
  });

  it('T575 — `recheck` continua reprocessando os JÁ tentados (prova de noop preservada)', async () => {
    vi.stubGlobal('fetch', stubFetch({}));
    const { client, rawArgs } = fakePrisma([]);
    await enrichAllMediaBatch(500, {
      apply: false,
      recheck: true,
      prisma: client as unknown as PrismaClient,
    });
    expect(textoSql(rawArgs)).toContain('"mediaEnrichment" IS NOT NULL');
  });
});
