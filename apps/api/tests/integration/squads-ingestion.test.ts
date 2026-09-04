/**
 * T421 — Ingestão de elencos clube↔jogador (Wikidata P54) — testes de integração SEM rede/banco.
 *
 * Mocka `globalThis.fetch` (vi.stubGlobal) com uma resposta SPARQL de exemplo e usa um
 * repositório em memória (anti-órfão + idempotência). Nenhuma escrita em produção: o banco e a
 * rede nunca são tocados.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildSquadsQuery,
  parseSquadsResponse,
  squadsDedupKey,
  fetchSquads,
  syncSquads,
  PLAYED_FOR_RELATION,
  SQUADS_LICENSE,
  SQUADS_DATASOURCE,
  type SquadsEntry,
  type SquadsRepository,
} from '../../src/modules/etl/connectors/wikidata-squads.connector.js';

interface EdgeRecord {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relation: string;
  metadata: Record<string, unknown>;
}

interface InMemoryRepository extends SquadsRepository {
  edges: EdgeRecord[];
}

function makeRepo(players: string[], clubs: string[]): InMemoryRepository {
  const edges: EdgeRecord[] = [];
  return {
    edges,
    async findPlayerByQid(qid) {
      return players.includes(qid) ? { id: 'p-' + qid } : null;
    },
    async findClubByQid(qid) {
      return clubs.includes(qid) ? { id: 'c-' + qid } : null;
    },
    async findEdgeByKey({ sourceId, targetId, relation, year }) {
      const found = edges.find(
        (e) =>
          e.sourceId === sourceId &&
          e.targetId === targetId &&
          e.relation === relation &&
          e.metadata.year === year,
      );
      return found ? { id: found.id } : null;
    },
    async createEdge(args) {
      const id = 'edge-' + (edges.length + 1);
      edges.push({ id, ...args });
      return { id };
    },
  };
}

function binding(player: string, club: string, start: string) {
  return {
    player: { type: 'uri', value: 'http://www.wikidata.org/entity/' + player },
    club: { type: 'uri', value: 'http://www.wikidata.org/entity/' + club },
    start: { type: 'literal', value: start },
  };
}

function sparqlResponse(bindings: ReturnType<typeof binding>[]) {
  return { head: { vars: ['player', 'club', 'start'] }, results: { bindings } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wikidata-squads connector', () => {
  it('buildSquadsQuery monta P54/P580 com filtros de acervo e paginação', () => {
    const q = buildSquadsQuery({
      playerQids: ['Q1', 'Q2'],
      clubQids: ['Q9'],
      minYear: 1900,
      offset: 100,
      limit: 500,
    });
    expect(q).toContain('p:P54');
    expect(q).toContain('ps:P54');
    expect(q).toContain('pq:P580');
    expect(q).toContain('VALUES ?player { wd:Q1 wd:Q2 }');
    expect(q).toContain('VALUES ?club { wd:Q9 }');
    expect(q).toContain('LIMIT 500 OFFSET 100');
  });

  it('buildSquadsQuery omite VALUES quando não há QIDs (consulta genérica)', () => {
    const q = buildSquadsQuery({ limit: 10 });
    expect(q).not.toContain('VALUES');
  });

  it('buildSquadsQuery permite amostragem barata (sem DISTINCT/ORDER BY)', () => {
    const q = buildSquadsQuery({ distinct: false, orderBy: false, limit: 5 });
    expect(q).not.toContain('SELECT DISTINCT');
    expect(q).toContain('SELECT ?player ?club ?start');
    expect(q).not.toContain('ORDER BY');
    expect(q).toContain('LIMIT 5');
  });

  it('parseSquadsResponse valida e destila elencos (player/club/year)', () => {
    const json = sparqlResponse([binding('Q1', 'Q9', '2023-01-01T00:00:00Z')]);
    const entries = parseSquadsResponse(json);
    expect(entries).toEqual([{ playerQid: 'Q1', clubQid: 'Q9', year: 2023 }]);
  });

  it('parseSquadsResponse descarta ano < 1900 via Zod', () => {
    const json = sparqlResponse([
      binding('Q1', 'Q9', '1899-06-01T00:00:00Z'),
      binding('Q1', 'Q9', '1900-06-01T00:00:00Z'),
      binding('Q1', 'Q9', '2023-01-01T00:00:00Z'),
    ]);
    const entries = parseSquadsResponse(json);
    expect(entries.length).toBe(2);
    expect(entries.map((e) => e.year)).toEqual([1900, 2023]);
  });

  it('parseSquadsResponse ignora binding sem year/QID e payload inválido', () => {
    const noYear = sparqlResponse([
      {
        player: { value: 'http://www.wikidata.org/entity/Q1' },
        club: { value: 'http://www.wikidata.org/entity/Q9' },
      },
    ]);
    expect(parseSquadsResponse(noYear)).toEqual([]);
    expect(parseSquadsResponse({ garbage: true })).toEqual([]);
    expect(parseSquadsResponse(null)).toEqual([]);
  });

  it('dedup key é estável (playerQid|clubQid|year)', () => {
    expect(squadsDedupKey({ playerQid: 'Q1', clubQid: 'Q9', year: 2023 })).toBe('Q1|Q9|2023');
    expect(squadsDedupKey({ year: 2023, clubQid: 'Q9', playerQid: 'Q1' })).toBe('Q1|Q9|2023');
  });

  it('fetchSquads usa globalThis.fetch (stub) e devolve entradas validadas', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        sparqlResponse([
          binding('Q1', 'Q9', '2023-01-01T00:00:00Z'),
          binding('Q2', 'Q9', '1998-05-02T00:00:00Z'),
        ]),
    });
    vi.stubGlobal('fetch', mockFetch);

    const entries = await fetchSquads({ maxPages: 1, limit: 100 });
    expect(entries.length).toBe(2);
    expect(entries[0]).toEqual({ playerQid: 'Q1', clubQid: 'Q9', year: 2023 });
    expect(entries[1]).toEqual({ playerQid: 'Q2', clubQid: 'Q9', year: 1998 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('query=');
    expect(url).toContain('format=json');
  });

  it('fetchSquads faz retry com backoff em erro HTTP', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sparqlResponse([binding('Q1', 'Q9', '2023-01-01T00:00:00Z')]),
      });
    vi.stubGlobal('fetch', mockFetch);

    const entries = await fetchSquads({
      maxPages: 1,
      maxRetries: 1,
      backoffMs: 1,
      sleep: async () => {},
    });
    expect(entries.length).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('syncSquads não cria órfãos (player/clube fora do acervo) e devolve fila de revisão', async () => {
    const repo = makeRepo(['Q1'], ['Q9']);
    const entries: SquadsEntry[] = [
      { playerQid: 'Q1', clubQid: 'Q9', year: 2023 }, // válido
      { playerQid: 'QX', clubQid: 'Q9', year: 2023 }, // player ausente
      { playerQid: 'Q1', clubQid: 'QY', year: 2023 }, // club ausente
    ];
    const res = await syncSquads(entries, repo);

    expect(res.persisted.length).toBe(1);
    expect(res.orphans.length).toBe(2);
    expect(res.orphans.find((o) => o.playerQid === 'QX')?.reason).toBe('player_missing');
    expect(res.orphans.find((o) => o.clubQid === 'QY')?.reason).toBe('club_missing');
    expect(repo.edges.length).toBe(1);
  });

  it('syncSquads grava proveniência obrigatória no metadata', async () => {
    const repo = makeRepo(['Q1'], ['Q9']);
    await syncSquads([{ playerQid: 'Q1', clubQid: 'Q9', year: 2023 }], repo);

    expect(repo.edges).toHaveLength(1);
    const edge = repo.edges[0];
    expect(edge.sourceType).toBe('Player');
    expect(edge.targetType).toBe('Club');
    expect(edge.relation).toBe(PLAYED_FOR_RELATION);
    expect(edge.metadata.dataSource).toBe(SQUADS_DATASOURCE);
    expect(edge.metadata.license).toBe(SQUADS_LICENSE);
    expect(edge.metadata.year).toBe(2023);
    expect(edge.metadata.season).toBe('2023');
    expect(edge.metadata.sourceUrl).toBe('https://www.wikidata.org/wiki/Q1');
  });

  it('syncSquads é idempotente (rodar 2x não duplica)', async () => {
    const repo = makeRepo(['Q1'], ['Q9']);
    const entries: SquadsEntry[] = [{ playerQid: 'Q1', clubQid: 'Q9', year: 2023 }];

    const first = await syncSquads(entries, repo);
    expect(first.persisted.length).toBe(1);

    const second = await syncSquads(entries, repo);
    expect(second.persisted.length).toBe(0);
    expect(second.skipped.length).toBe(1);
    expect(repo.edges.length).toBe(1);
  });

  it('syncSquads deduplica chaves repetidas no mesmo lote', async () => {
    const repo = makeRepo(['Q1'], ['Q9']);
    const entries: SquadsEntry[] = [
      { playerQid: 'Q1', clubQid: 'Q9', year: 2023 },
      { playerQid: 'Q1', clubQid: 'Q9', year: 2023 },
    ];
    const res = await syncSquads(entries, repo);
    expect(res.persisted.length).toBe(1);
    expect(res.skipped.length).toBe(1);
    expect(repo.edges.length).toBe(1);
  });

  it('syncSquads mantém vínculos distintos por ano (mesmo par, temporadas diferentes)', async () => {
    const repo = makeRepo(['Q1'], ['Q9']);
    const entries: SquadsEntry[] = [
      { playerQid: 'Q1', clubQid: 'Q9', year: 2022 },
      { playerQid: 'Q1', clubQid: 'Q9', year: 2023 },
    ];
    const res = await syncSquads(entries, repo);
    expect(res.persisted.length).toBe(2);
    expect(repo.edges.length).toBe(2);
  });
});
