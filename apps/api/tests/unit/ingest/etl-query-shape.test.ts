import { describe, it, expect, vi, afterEach } from 'vitest';
import { SPARQL as SPARQL_CLUBS } from '../../../scripts/ingest-clubs-wikidata.js';
import { SPARQL as SPARQL_COMPETITIONS } from '../../../scripts/ingest-competitions-wikidata.js';
import { SPARQL as SPARQL_PLAYERS } from '../../../scripts/ingest-players-wikidata.js';

// T428 FASE 4 — determinismo da query: ORDER BY garante rodadas
// reprodutíveis (sem ORDER, o SPARQL retorna amostras variáveis). O teste
// é puramente sobre a string — CI nunca faz rede externa; o stub abaixo
// só valida que fetchBatch dispara com a query alterada.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('T428 FASE 4 — ORDER BY nos templates SPARQL', () => {
  it('ingest-clubs: SELECT DISTINCT termina com ORDER BY ?club', () => {
    expect(SPARQL_CLUBS).toMatch(/SELECT DISTINCT/);
    expect(SPARQL_CLUBS).toMatch(/ORDER BY\s+\?club\s*$/m);
  });

  it('ingest-competitions: ORDER BY ?comp (rodada reprodutível)', () => {
    expect(SPARQL_COMPETITIONS).toMatch(/ORDER BY\s+\?comp\s*$/m);
  });

  it('ingest-players: ORDER BY ?player (rodada reprodutível)', () => {
    expect(SPARQL_PLAYERS).toMatch(/ORDER BY\s+\?player\s*$/m);
  });

  it('fetchBatch monta a query com ORDER BY no payload real enviado', async () => {
    // Spy no fetch: captura a URL e decodifica para asserção fim-a-fim
    // (garante que o template é de fato concatenado e enviado).
    let capturedUrl = '';
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({ results: { bindings: [] } }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchBatch } = await import('../../../scripts/ingest-competitions-wikidata.js');
    await fetchBatch(0);

    // A URL chega URL-encoded; o `?query=` precede a query serializada.
    // URLSearchParams.get decodifica automaticamente → `?comp` aparece literal.
    const queryParam = new URL(capturedUrl).searchParams.get('query') ?? '';
    expect(queryParam).toMatch(/ORDER BY\s+\?comp\b/);
    expect(queryParam).toMatch(/LIMIT\s+1000\s+OFFSET\s+0\b/);
  });
});
