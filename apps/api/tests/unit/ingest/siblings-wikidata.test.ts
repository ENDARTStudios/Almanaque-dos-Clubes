import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchBatch as fetchCompetitionsBatch,
  isQidLabel,
  wikidataItemUrl as compUrl,
  type CompRow,
} from '../../../scripts/ingest-competitions-wikidata.js';
import { countryToQid } from '../../../../worker/src/jobs/wikidata-connector.js';

// T428 FASE 3 — irmãos do ingest-clubs: helper compartilhado consumido, sem
// skipDuplicates (inexistente no SQLite), sourceUrl preenchido; + fix 3.5 do
// filtro-país do worker (ISO "BR" virava QID "QBR" → 0 resultados).
// CI nunca faz rede externa: fetch é mockado via fetchWithRetry/vi.stubGlobal.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sparqlPayload(
  rows: Array<{ qid: string; name: string; iso?: string; start?: string; end?: string }>,
) {
  return {
    results: {
      bindings: rows.map((r) => ({
        comp: { value: `http://www.wikidata.org/entity/${r.qid}` },
        compLabel: { value: r.name },
        iso: r.iso ? { value: r.iso.toLowerCase() } : undefined,
        start: r.start ? { value: `${r.start}-01-01T00:00:00Z` } : undefined,
        end: r.end ? { value: `${r.end}-01-01T00:00:00Z` } : undefined,
      })),
    },
  };
}

describe('ingest-competitions (irmão): parse + proveniência via helper', () => {
  it('parseia bindings e preenche proveniência', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        sparqlPayload([
          { qid: 'Q3245', name: 'Série A', iso: 'br', start: '1959', end: undefined },
          { qid: 'Q9999', name: 'Q9999', iso: undefined }, // label-QID: filtrado
        ]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows: CompRow[] = await fetchCompetitionsBatch(0);
    expect(rows).toHaveLength(1); // isQidLabel filtrado
    expect(rows[0]).toEqual({
      qid: 'Q3245',
      name: 'Série A',
      country: 'BR',
      startYear: 1959,
      endYear: null,
    });
    expect(compUrl('Q3245')).toBe('https://www.wikidata.org/wiki/Q3245');
    expect(isQidLabel('Q9999')).toBe(true);
  });

  it('sem skipDuplicates: idempotência é responsabilidade do plano (dedup por qid)', async () => {
    // O bug do T426-achado-1 era createMany({ skipDuplicates: true }) quebrando
    // no SQLite. Aqui asseguramos o contrato do script: fetchBatch devolve
    // rows cruas e o chamador deduplica por qid (padrão provado no T426).
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        sparqlPayload([
          { qid: 'Q1', name: 'Comp A' },
          { qid: 'Q1', name: 'Comp A' }, // duplicado no lote
          { qid: 'Q2', name: 'Comp B' },
        ]),
    });
    vi.stubGlobal('fetch', fetchMock);
    const rows = await fetchCompetitionsBatch(0);
    const byQid = new Set(rows.map((r: CompRow) => r.qid));
    expect(byQid.size).toBe(2); // dedup por qid elimina a duplicata do lote
  });
});

describe('T428 3.5 — countryToQid (fix do filtro-país do worker)', () => {
  it('resolve ISO "BR" para o QID correto (antes virava "QBR" → 0 resultados)', () => {
    expect(countryToQid('BR')).toBe('Q155');
    expect(countryToQid('br')).toBe('Q155'); // case-insensitive
  });

  it('aceita QID pronto e rejeita ISO desconhecido (null = não filtra)', () => {
    expect(countryToQid('Q155')).toBe('Q155');
    expect(countryToQid('XX')).toBeNull();
    // "QBR" (o bug original: ISO colado com prefixo Q) não é QID válido
    // sintaticamente — regex exige dígitos. Deve cair no mapa ISO → null.
    expect(countryToQid('QBR')).toBeNull();
  });
});
