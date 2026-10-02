/**
 * T424 — Ingestão de futebol feminino via Wikidata — testes de integração SEM rede/banco.
 *
 * Mocka `globalThis.fetch` (vi.stubGlobal) com respostas SPARQL de exemplo e usa um
 * repositório em memória (anti-órfão + idempotência + isolamento por gênero). Nenhuma
 * escrita em produção: o banco e a rede nunca são tocados.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildCompetitionsQuery,
  buildEdgesQuery,
  parseCompetitionsResponse,
  parseEdgesResponse,
  fetchCompetitions,
  fetchEdges,
  syncWomensFootball,
  womensEdgeDedupKey,
  PLAYED_FOR_RELATION,
  WOMENS_LICENSE,
  WOMENS_DATASOURCE,
  WOMENS_GENDER_VALUE,
  WOMENS_COMPETITION_QIDS,
  type WomensSyncData,
  type WomensRepository,
  type WomensProvenance,
} from '../../src/modules/etl/connectors/wikidata-womens-football.connector.js';

interface EdgeRecord {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relation: string;
  metadata: Record<string, unknown>;
}

interface EntityRecord {
  id: string;
  qid: string;
  name: string;
  country: string | null;
  fullName?: string;
  position?: string | null;
  provenance?: WomensProvenance;
}

interface InMemoryRepo extends WomensRepository {
  competitions: Map<string, EntityRecord>;
  clubs: Map<string, EntityRecord>;
  players: Map<string, EntityRecord>;
  edges: EdgeRecord[];
}

function makeRepo(): InMemoryRepo {
  const competitions = new Map<string, EntityRecord>();
  const clubs = new Map<string, EntityRecord>();
  const players = new Map<string, EntityRecord>();
  const edges: EdgeRecord[] = [];
  let n = 0;
  return {
    competitions,
    clubs,
    players,
    edges,
    async findCompetitionByQid(qid) {
      const e = competitions.get(qid);
      return e ? { id: e.id } : null;
    },
    async upsertCompetition(row, provenance) {
      if (competitions.has(row.qid)) return { id: competitions.get(row.qid)!.id, created: false };
      n += 1;
      const id = 'comp-' + n;
      competitions.set(row.qid, {
        id,
        qid: row.qid,
        name: row.name,
        country: row.country,
        provenance,
      });
      return { id, created: true };
    },
    async findClubByQid(qid) {
      const e = clubs.get(qid);
      return e ? { id: e.id } : null;
    },
    async upsertClub(row, provenance) {
      if (clubs.has(row.qid)) return { id: clubs.get(row.qid)!.id, created: false };
      n += 1;
      const id = 'club-' + n;
      clubs.set(row.qid, { id, qid: row.qid, name: row.name, country: row.country, provenance });
      return { id, created: true };
    },
    async findPlayerByQid(qid) {
      const e = players.get(qid);
      return e ? { id: e.id } : null;
    },
    async upsertPlayer(row, provenance) {
      if (players.has(row.qid)) return { id: players.get(row.qid)!.id, created: false };
      n += 1;
      const id = 'player-' + n;
      players.set(row.qid, {
        id,
        qid: row.qid,
        name: row.fullName,
        country: row.country,
        position: row.position,
        provenance,
      });
      return { id, created: true };
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

function binding(values: Record<string, string>) {
  const out: Record<string, { value: string }> = {};
  // eslint-disable-next-line security/detect-object-injection
  for (const [k, v] of Object.entries(values)) out[k] = { value: v };
  return out;
}

function sparqlResponse(bindings: ReturnType<typeof binding>[]) {
  return { results: { bindings } };
}

function edgeBinding(player: string, club: string, year: number) {
  return {
    player: { value: 'http://www.wikidata.org/entity/' + player },
    club: { value: 'http://www.wikidata.org/entity/' + club },
    year: { value: String(year) },
  };
}

function baseData(): WomensSyncData {
  return {
    competitions: [{ qid: 'Q1', name: 'Frauen-Bundesliga', country: 'DE' }],
    clubs: [{ qid: 'Q5', name: 'VfL Wolfsburg', country: 'DE' }],
    players: [{ qid: 'Q9', fullName: 'Homare Sawa', country: 'JP', position: 'midfielder' }],
    edges: [{ playerQid: 'Q9', clubQid: 'Q5', year: 2023 }],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wikidata-womens-football connector', () => {
  it('buildCompetitionsQuery usa a classe de liga feminina e paginação', () => {
    const q = buildCompetitionsQuery({ offset: 100, limit: 500 });
    expect(q).toContain('wdt:P31/wdt:P279* wd:Q135641755');
    expect(q).toContain('SELECT DISTINCT ?comp ?compLabel ?country');
    expect(q).toContain('LIMIT 500 OFFSET 100');
  });

  it('buildCompetitionsQuery omite valores de clubes nas consultas de entidades', () => {
    expect(buildCompetitionsQuery({ limit: 10 })).not.toContain('VALUES');
  });

  it('buildEdgesQuery usa P54/P580 e VALUES quando recebe clubes do acervo', () => {
    const q = buildEdgesQuery({ clubQids: ['Q5', 'Q7'], limit: 100 });
    expect(q).toContain('p:P54');
    expect(q).toContain('ps:P54');
    expect(q).toContain('pq:P580');
    expect(q).toContain('FILTER(?year >= 1900)');
    expect(q).toContain('VALUES ?club { wd:Q5 wd:Q7 }');
  });

  it('parseCompetitionsResponse valida e destila competições, descartando QID-como-label', () => {
    const json = sparqlResponse([
      binding({
        comp: 'http://www.wikidata.org/entity/Q1',
        compLabel: 'Frauen-Bundesliga',
        country: 'de',
      }),
      binding({ comp: 'http://www.wikidata.org/entity/Q2', compLabel: 'Q140159744' }),
    ]);
    const res = parseCompetitionsResponse(json);
    expect(res).toEqual([{ qid: 'Q1', name: 'Frauen-Bundesliga', country: 'DE' }]);
  });

  it('parseEdgesResponse valida vínculos com ano inteiro e descarta ano < 1900 / QID ausente', () => {
    const json = sparqlResponse([
      edgeBinding('Q9', 'Q5', 2023),
      edgeBinding('Q9', 'Q5', 1899),
      { player: { value: 'http://www.wikidata.org/entity/Q9' } } as never,
    ]);
    const res = parseEdgesResponse(json);
    expect(res).toEqual([{ playerQid: 'Q9', clubQid: 'Q5', year: 2023 }]);
  });

  it('womensEdgeDedupKey é estável (playerQid|clubQid|year)', () => {
    expect(womensEdgeDedupKey({ playerQid: 'Q9', clubQid: 'Q5', year: 2023 })).toBe('Q9|Q5|2023');
    expect(womensEdgeDedupKey({ year: 2023, clubQid: 'Q5', playerQid: 'Q9' })).toBe('Q9|Q5|2023');
  });

  it('fetchCompetitions usa globalThis.fetch (stub) e devolve entradas validadas', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        sparqlResponse([
          binding({ comp: 'http://www.wikidata.org/entity/Q1', compLabel: 'Frauen-Bundesliga' }),
        ]),
    });
    vi.stubGlobal('fetch', mockFetch);
    const res = await fetchCompetitions({ maxPages: 1, limit: 100 });
    expect(res).toEqual([{ qid: 'Q1', name: 'Frauen-Bundesliga' }]);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('query=');
    expect(url).toContain('format=json');
  });

  it('fetchEdges faz retry com backoff em erro HTTP', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sparqlResponse([edgeBinding('Q9', 'Q5', 2023)]),
      });
    vi.stubGlobal('fetch', mockFetch);
    const res = await fetchEdges({
      maxPages: 1,
      maxRetries: 1,
      backoffMs: 1,
      sleep: async () => {},
    });
    expect(res).toEqual([{ playerQid: 'Q9', clubQid: 'Q5', year: 2023 }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('syncWomensFootball cria competições/clubes/jogadoras com proveniência e vínculos com gênero', async () => {
    const repo = makeRepo();
    const res = await syncWomensFootball(baseData(), repo);
    expect(res.competitions.created).toEqual(['Q1']);
    expect(res.clubs.created).toEqual(['Q5']);
    expect(res.players.created).toEqual(['Q9']);
    expect(res.edgesPersisted).toHaveLength(1);
    expect(repo.edges).toHaveLength(1);
    const edge = repo.edges[0];
    expect(edge.relation).toBe(PLAYED_FOR_RELATION);
    expect(edge.sourceType).toBe('Player');
    expect(edge.targetType).toBe('Club');
    expect(edge.metadata.gender).toBe(WOMENS_GENDER_VALUE);
    expect(edge.metadata.dataSource).toBe(WOMENS_DATASOURCE);
    expect(edge.metadata.license).toBe(WOMENS_LICENSE);
    expect(edge.metadata.year).toBe(2023);
    const comp = repo.competitions.get('Q1')!;
    expect(comp.provenance?.dataSource).toBe(WOMENS_DATASOURCE);
    expect(comp.provenance?.gender).toBe(WOMENS_GENDER_VALUE);
    expect(comp.provenance?.sourceUrl).toBe('https://www.wikidata.org/wiki/Q1');
  });

  it('syncWomensFootball é idempotente (rodar 2x não duplica)', async () => {
    const repo = makeRepo();
    const first = await syncWomensFootball(baseData(), repo);
    expect(first.competitions.created).toEqual(['Q1']);
    expect(first.edgesPersisted).toHaveLength(1);
    const second = await syncWomensFootball(baseData(), repo);
    expect(second.competitions.created).toHaveLength(0);
    expect(second.competitions.skipped).toEqual(['Q1']);
    expect(second.edgesPersisted).toHaveLength(0);
    expect(second.edgesSkipped).toHaveLength(1);
    expect(repo.edges).toHaveLength(1);
  });

  it('syncWomensFootball não cria órfãos (jogadora/clube fora do acervo)', async () => {
    const repo = makeRepo();
    const data: WomensSyncData = {
      competitions: [],
      clubs: [],
      players: [{ qid: 'Q9', fullName: 'Homare Sawa' }],
      edges: [
        { playerQid: 'Q9', clubQid: 'Q5', year: 2023 }, // clube ausente
        { playerQid: 'QX', clubQid: 'Q5', year: 2023 }, // jogadora ausente
      ],
    };
    const res = await syncWomensFootball(data, repo);
    expect(res.edgesPersisted).toHaveLength(0);
    expect(res.orphans).toHaveLength(2);
    expect(res.orphans.find((o) => o.playerQid === 'Q9')?.reason).toBe('club_missing');
    expect(res.orphans.find((o) => o.playerQid === 'QX')?.reason).toBe('player_missing');
    expect(repo.edges).toHaveLength(0);
  });

  it('syncWomensFootball deduplica chaves repetidas no mesmo lote', async () => {
    const repo = makeRepo();
    const data: WomensSyncData = {
      competitions: [
        { qid: 'Q1', name: 'Frauen-Bundesliga' },
        { qid: 'Q1', name: 'Frauen-Bundesliga' },
      ],
      clubs: [],
      players: [],
      edges: [],
    };
    const res = await syncWomensFootball(data, repo);
    expect(res.competitions.created).toEqual(['Q1']);
    expect(repo.competitions.size).toBe(1);
  });

  it('syncWomensFootball isola por gênero (registro separado womensQids + classe documentada)', async () => {
    const repo = makeRepo();
    const res = await syncWomensFootball(baseData(), repo);
    expect(res.womensQids).toContain('Q1');
    expect(res.womensQids).toContain('Q5');
    expect(res.womensQids).toContain('Q9');
    expect(res.womensQids.length).toBe(3);
    expect(WOMENS_COMPETITION_QIDS).toContain('Q606060');
    expect(WOMENS_COMPETITION_QIDS).toContain('Q135641755');
    expect(repo.edges[0].metadata.gender).toBe(WOMENS_GENDER_VALUE);
    expect(repo.edges[0].metadata.gender === 'women').toBe(true);
  });
});
