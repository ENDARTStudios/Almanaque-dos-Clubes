import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  dedupeByNameCountry,
  dedupeClubRows,
  diffClubFields,
  fetchBatch,
  planClubSync,
  qidFrom,
  toClubCreate,
  wikidataItemUrl,
  yearFrom,
  type ClubRow,
} from '../../../scripts/ingest-clubs-wikidata.js';

// T426 — primeiros testes do repo para ingest/dedup (CI nunca faz rede externa:
// fetch global é mockado; sync é planejado sobre mapas em memória).

function makeRow(i: number, overrides: Partial<ClubRow> = {}): ClubRow {
  return {
    qid: `Q${1000 + i}`,
    name: `Clube Teste ${i}`,
    country: 'BR',
    city: `Cidade ${i}`,
    foundedYear: 1900 + (i % 120),
    ...overrides,
  };
}

function sparqlPayload(rows: Array<Record<string, string | undefined>>) {
  return {
    results: {
      bindings: rows.map((r) => ({
        club: { value: `http://www.wikidata.org/entity/${r.qid}` },
        clubLabel: { value: r.name },
        iso: r.country ? { value: r.country.toLowerCase() } : undefined,
        cityLabel: r.city ? { value: r.city } : undefined,
        inception: r.year ? { value: `${r.year}-01-01T00:00:00Z` } : undefined,
      })),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('qidFrom / yearFrom / wikidataItemUrl (puros)', () => {
  it('extrai o QID da URI da entidade', () => {
    expect(qidFrom('http://www.wikidata.org/entity/Q15944511')).toBe('Q15944511');
  });

  it('extrai o ano do inception', () => {
    expect(yearFrom('1898-07-21T00:00:00Z')).toBe(1898);
    expect(yearFrom(undefined)).toBeNull();
    expect(yearFrom('invalido')).toBeNull();
  });

  it('gera a URL canônica do item', () => {
    expect(wikidataItemUrl('Q15944511')).toBe('https://www.wikidata.org/wiki/Q15944511');
  });
});

describe('cenário 1 (novo): 10 clubes com QIDs distintos → count = 10', () => {
  it('insere os 10, sem colisão e com proveniência completa', () => {
    const incoming = Array.from({ length: 10 }, (_, i) => makeRow(i));
    const plan = planClubSync(new Map(), incoming);

    expect(plan.toInsert).toHaveLength(10);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.collisions).toHaveLength(0);

    const now = new Date('2026-09-07T00:00:00Z');
    for (const row of plan.toInsert) {
      const created = toClubCreate(row, now);
      expect(created.qid).toBeTruthy();
      expect(created.importedFrom).toBe('wikidata');
      expect(created.importedAt).toEqual(now);
      expect(created.sourceUrl).toBe(`https://www.wikidata.org/wiki/${row.qid}`);
    }
  });
});

describe('cenário 2 (idempotência): rodar 2× → count permanece 10', () => {
  it('segunda execução não insere nem atualiza nada', () => {
    const incoming = Array.from({ length: 10 }, (_, i) => makeRow(i));
    const first = planClubSync(new Map(), incoming);
    expect(first.toInsert).toHaveLength(10);

    // Estado após a 1ª execução: os 10 já existem com os mesmos campos.
    const existing = new Map(first.toInsert.map((r) => [r.qid, r]));
    const second = planClubSync(existing, incoming);

    expect(second.toInsert).toHaveLength(0);
    expect(second.toUpdate).toHaveLength(0);
    expect(second.collisions).toHaveLength(0);
  });
});

describe('cenário 3 (atualização): nome mudou na fonte → mesmo qid, nome atualizado', () => {
  it('gera update só do campo mudado, sem novo insert', () => {
    const existing = new Map([['Q1001', makeRow(1, { name: 'Nome Antigo' })]]);
    const incoming = [makeRow(1, { name: 'Nome Novo' })];
    const plan = planClubSync(existing, incoming);

    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0].qid).toBe('Q1001');
    expect(plan.toUpdate[0].diff).toEqual({ name: 'Nome Novo' });
    expect(diffClubFields(makeRow(1), makeRow(1))).toBeNull();
  });
});

describe('cenário 4 (colisão): mesmo qid, nomes distintos → loga, não sobrescreve', () => {
  it('mantém a 1ª ocorrência e reporta a colisão', () => {
    const incoming = [makeRow(1, { name: 'Nome A' }), makeRow(1, { name: 'Nome B' })];
    const { unique, collisions } = dedupeClubRows(incoming);

    expect(unique).toHaveLength(1);
    expect(unique[0].name).toBe('Nome A');
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toEqual({ qid: 'Q1001', kept: 'Nome A', dropped: 'Nome B' });

    const plan = planClubSync(new Map(), incoming);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].name).toBe('Nome A');
  });
});

describe('cenário 5 (name-country): QIDs distintos, mesmo (name, country) → pula e reporta', () => {
  it('mantém a 1ª ocorrência e marca batch-duplicate', () => {
    const incoming = [
      makeRow(1, { name: 'Atlético', country: 'BR' }),
      makeRow(2, { name: 'Atlético', country: 'BR' }),
      makeRow(3, { name: 'Atlético', country: 'PT' }),
    ];
    const { rows, dropped } = dedupeByNameCountry(incoming);

    expect(rows).toHaveLength(2);
    expect(rows[0].qid).toBe('Q1001');
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toEqual({
      qid: 'Q1002',
      name: 'Atlético',
      country: 'BR',
      reason: 'batch-duplicate',
    });
  });
});

describe('fetchBatch: retry com backoff (fetch mockado, sem rede)', () => {
  it('falha 2× com 503 e sucede na 3ª tentativa', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          sparqlPayload([
            { qid: 'Q1', name: 'Clube Um', country: 'BR', city: 'Rio', year: '1898' },
          ]),
      });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await fetchBatch(0);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      qid: 'Q1',
      name: 'Clube Um',
      country: 'BR',
      city: 'Rio',
      foundedYear: 1898,
    });
  }, 15000);

  it('falha definitiva após 1 + 3 tentativas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBatch(0)).rejects.toThrow('SPARQL HTTP 500');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 20000);
});
