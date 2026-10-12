/**
 * T528 — testes do job unificado de mídia. O que é travado aqui:
 *
 *  1. o CURSOR: um clube com tentativa registrada NÃO volta para a fila (era o
 *     defeito que congelava a cobertura — o mesmo lote alfabético toda noite);
 *  2. as regras ESTRITAS de aceitação (nada entra por semelhança de nome);
 *  3. o que NÃO é sobrescrito (curadoria T523-T526 preservada).
 */
import { describe, expect, it } from 'vitest';
import {
  attemptRecord,
  audioFileCandidates,
  enrichOneClub,
  isFullyAttempted,
  isPennantFile,
  pendingMedia,
  type ClubRow,
} from '../../../src/modules/etl/enrich-all-media.service.js';
import type { KitPart } from '../../../src/lib/wikipedia/kit-composition.js';

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
