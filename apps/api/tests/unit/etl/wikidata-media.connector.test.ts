/**
 * Defeito do LOTE CORTADO do connector compartilhado de mídia.
 *
 * O `wbgetentities` tem teto de resposta (12.582.912 bytes). Quando o lote de 50 estoura,
 * a API responde **HTTP 200 + `success: 1`** com `warnings.result.*` ("This result was
 * truncated…") e `entities` com MENOS chaves do que foi pedido — medido contra a API real:
 * 50 países → 42 entidades, 28 MB. Antes deste fix o connector devolvia esse Map
 * incompleto como se fosse completo; o job fazia `entities.get(qid)` → `undefined`,
 * concluía "a fonte não tem" e carimbava `no_source` no cursor, que nunca é re-tentado:
 * gap FALSO permanente.
 *
 * O que este teste trava (sem rede — o `fetchImpl` é injetado):
 *  1. lote normal continua funcionando (1 requisição, nada de falso positivo);
 *  2. resposta truncada é DETECTADA e repartida, e o resultado final vem completo;
 *  3. truncamento que não resolve vira `WikidataBatchError` — NUNCA ausência silenciosa;
 *  4. a repartição é LIMITADA (sem laço infinito) e as requisições aos pares mantêm o
 *     intervalo mínimo entre si;
 *  5. `missing` (entidade que não existe), redirect e id repetido não são confundidos
 *     com truncamento — os três motivos LEGÍTIMOS de ausência.
 */
import { describe, expect, it } from 'vitest';
import {
  WikidataBatchError,
  fetchEntities,
  inspecionarLote,
} from '../../../src/modules/etl/connectors/wikidata-media.connector.js';

const AVISO =
  'This result was truncated because it would otherwise be larger than the limit of 12,582,912 bytes.';

const entidade = (qid: string) => ({
  type: 'item',
  id: qid,
  labels: { pt: { language: 'pt', value: `Rótulo ${qid}` } },
  claims: {},
});

const semEspera = { sleep: async () => {}, minIntervalMs: 0 };

/** `fetch` falso: devolve o payload da fila e registra as URLs pedidas. */
function fetchFalso(payloads: unknown[]) {
  const urls: string[] = [];
  let i = 0;
  const fetchImpl = (async (url: string) => {
    urls.push(url);
    const payload = payloads[Math.min(i, payloads.length - 1)];
    i += 1;
    return { ok: true, status: 200, json: async () => payload } as unknown as Response;
  }) as unknown as typeof globalThis.fetch;
  return {
    fetchImpl,
    urls,
    idsPedidos: () => urls.map((u) => /ids=([^&]*)/.exec(u)![1].split('|')),
  };
}

const ids = (qids: string[]) => qids;
const pedir = (qids: string[]) => qids;

describe('fetchEntities — contrato do lote (defeito do corte em 12 MB)', () => {
  it('lote normal: uma requisição e todos os qids no Map', async () => {
    const qids = ['Q1', 'Q2', 'Q3'];
    const { fetchImpl, urls } = fetchFalso([
      { entities: Object.fromEntries(qids.map((q) => [q, entidade(q)])) },
    ]);
    const out = await fetchEntities(qids, { ...semEspera, fetchImpl });
    expect(urls).toHaveLength(1);
    expect([...out.keys()].sort()).toEqual(qids);
    expect(out.get('Q2')?.labels?.pt?.value).toBe('Rótulo Q2');
  });

  it('payload TRUNCADO: detecta, reparte em metades e devolve TODO mundo', async () => {
    const qids = ['Q1', 'Q2', 'Q3', 'Q4'];
    const primeira = {
      warnings: { result: { '*': AVISO } },
      success: 1,
      entities: { Q1: entidade('Q1'), Q2: entidade('Q2') },
    };
    const metadeA = { entities: { Q1: entidade('Q1'), Q2: entidade('Q2') } };
    const metadeB = { entities: { Q3: entidade('Q3'), Q4: entidade('Q4') } };
    const { fetchImpl, urls, idsPedidos } = fetchFalso([primeira, metadeA, metadeB]);
    const avisos: number[] = [];
    const out = await fetchEntities(qids, {
      ...semEspera,
      fetchImpl,
      onTruncation: () => avisos.push(1),
    });
    // o lote original é repartido: 1 requisição que truncou + 2 metades
    expect(urls).toHaveLength(3);
    expect(idsPedidos()).toEqual([
      ['Q1', 'Q2', 'Q3', 'Q4'],
      ['Q1', 'Q2'],
      ['Q3', 'Q4'],
    ]);
    expect(avisos).toHaveLength(1);
    expect([...out.keys()].sort()).toEqual(qids);
    expect(out.get('Q4')?.id).toBe('Q4');
  });

  it('truncamento que NÃO resolve: lança WikidataBatchError (nunca ausência silenciosa)', async () => {
    // Fixture da forma MEDIDA em produção: o MediaWiki corta a CAUDA do lote — só o
    // primeiro id pedido volta. Aqui nem repartindo resolve, e o fundo do poço é o lote
    // de 1 id: em vez de devolver o Map incompleto, o conector tem de LANÇAR.
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      const chunk = /ids=([^&]*)/.exec(url)![1].split('|');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          warnings: { result: { '*': AVISO } },
          success: 1,
          entities: { [chunk[0]]: entidade(chunk[0]) },
        }),
      } as unknown as Response;
    }) as unknown as typeof globalThis.fetch;

    const erro = await fetchEntities(['Q1', 'Q2', 'Q3'], {
      ...semEspera,
      fetchImpl,
      maxSplitDepth: 2,
    }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(WikidataBatchError);
    expect((erro as WikidataBatchError).message).toContain('falha de LEITURA');
    expect((erro as WikidataBatchError).qidsAusentes.length).toBeGreaterThan(0);
    for (const q of (erro as WikidataBatchError).qidsAusentes) {
      expect(['Q1', 'Q2', 'Q3']).toContain(q);
    }
    // LOTE LIMITADO: raiz + 2 do nível 1 + 4 do nível 2 = no máximo 7 requisições.
    expect(urls.length).toBeGreaterThan(1);
    expect(urls.length).toBeLessThanOrEqual(7);
  });

  it('maxSplitDepth=0 em lote suspeito: erro imediato, sem repartir, com os ids ausentes', async () => {
    const { fetchImpl, urls } = fetchFalso([
      { success: 1, entities: { Q1: entidade('Q1') } }, // sem warnings e sem Q2: gap MUDO
    ]);
    const erro = await fetchEntities(['Q1', 'Q2'], {
      ...semEspera,
      fetchImpl,
      maxSplitDepth: 0,
    }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(WikidataBatchError);
    expect((erro as WikidataBatchError).qidsAusentes).toEqual(['Q2']);
    expect((erro as WikidataBatchError).message).toContain('não devolveu 1 de 2');
    expect(urls).toHaveLength(1);
  });

  it('`missing` (entidade inexistente), redirect e id repetido NÃO viram erro', async () => {
    const payload = {
      success: 1,
      entities: { Q1: entidade('Q1'), Q999: { id: 'Q999', missing: '' }, Q7: entidade('Q7') },
      redirects: [{ from: 'Q6', to: 'Q7' }],
    };
    const { fetchImpl, urls } = fetchFalso([payload]);
    const out = await fetchEntities(pedir(ids(['Q1', 'Q999', 'Q6', 'Q1'])), {
      ...semEspera,
      fetchImpl,
    });
    expect(urls).toHaveLength(1); // id repetido não gera "ausente" — a API deduplica
    expect(out.get('Q999')).toMatchObject({ missing: '' });
    expect(out.get('Q6')?.id).toBe('Q7'); // pedido Q6 responde via redirect
    expect(out.get('Q7')?.id).toBe('Q7');
  });

  it('falha de transporte e erro da API também sobem (nada de Map vazio)', async () => {
    const http500 = (async () =>
      ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }) as unknown as Response) as unknown as typeof globalThis.fetch;
    await expect(fetchEntities(['Q1'], { ...semEspera, fetchImpl: http500 })).rejects.toThrow(
      /HTTP 500/,
    );

    const toomany = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ error: { code: 'toomanyvalues', info: 'The limit is 50.' } }),
      }) as unknown as Response) as unknown as typeof globalThis.fetch;
    await expect(fetchEntities(['Q1'], { ...semEspera, fetchImpl: toomany })).rejects.toThrow(
      /toomanyvalues/,
    );
  });

  it('lotes maiores que batchSize: reparte em requisições de 50 com intervalo', async () => {
    const qids = Array.from({ length: 120 }, (_, i) => `Q${i + 1}`);
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      const chunk = /ids=([^&]*)/.exec(url)![1].split('|');
      return {
        ok: true,
        status: 200,
        json: async () => ({ entities: Object.fromEntries(chunk.map((q) => [q, entidade(q)])) }),
      } as unknown as Response;
    }) as unknown as typeof globalThis.fetch;
    const dormidas: number[] = [];
    const out = await fetchEntities(qids, {
      fetchImpl,
      minIntervalMs: 7,
      sleep: async (ms) => {
        dormidas.push(ms);
      },
    });
    expect(urls).toHaveLength(3);
    expect(urls.map((u) => /ids=([^&]*)/.exec(u)![1].split('|').length)).toEqual([50, 50, 20]);
    expect(dormidas).toEqual([7, 7]);
    expect(out.size).toBe(120);
  });
});

describe('inspecionarLote (parte pura)', () => {
  it('identifica o aviso de truncamento em qualquer idioma de chave', () => {
    const lote = inspecionarLote(
      { warnings: { main: { '*': AVISO } }, entities: { Q1: entidade('Q1') } },
      ['Q1', 'Q2'],
    );
    expect(lote.avisoTruncamento).toContain('truncated');
    expect(lote.ausentes).toEqual(['Q2']);
    expect(lote.alias.size).toBe(0);
  });

  it('sem aviso e sem chave: gap MUDO, marcado como ausente', () => {
    const lote = inspecionarLote({ entities: { Q1: entidade('Q1') } }, ['Q1', 'Q2']);
    expect(lote.avisoTruncamento).toBeNull();
    expect(lote.ausentes).toEqual(['Q2']);
  });
});
