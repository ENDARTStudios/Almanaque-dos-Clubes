/**
 * T423 — Ingestão de estádios (Wikidata Q483110 + PostGIS) — testes de integração SEM rede/banco.
 *
 * Mocka globalThis.fetch (vi.stubGlobal) com uma resposta SPARQL de exemplo e usa um repositório
 * em memória (anti-órfão + idempotência por QID). Nenhuma escrita em produção: banco e rede nunca
 * são tocados. A coluna PostGIS `location` é preenchida apenas no repositório Prisma (seed --apply);
 * aqui validamos o contrato do connector puro.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildStadiumsQuery,
  parseStadiums,
  parseCoordinates,
  stadiumsDedupKey,
  fetchStadiums,
  syncStadiums,
  STADIUMS_DATASOURCE,
  STADIUM_CLASS_QID,
  type StadiumEntry,
  type StadiumsRepository,
  type StadiumCreateInput,
} from '../../src/modules/etl/connectors/wikidata-stadiums.connector.js';

interface StadiumRecord {
  id: string;
  name: string;
  qid: string;
  clubId: string | null;
  importedFrom: string;
  importedAt: Date;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface InMemoryRepository extends StadiumsRepository {
  stadiums: StadiumRecord[];
}

function makeRepo(clubs: string[], existing: StadiumRecord[] = []): InMemoryRepository {
  const stadiums = [...existing];
  return {
    stadiums,
    async findClubByQid(qid) {
      return clubs.includes(qid) ? { id: 'c-' + qid } : null;
    },
    async findStadiumByQid(qid) {
      const s = stadiums.find((x) => x.qid === qid);
      return s ? { id: s.id } : null;
    },
    async createStadium(args: StadiumCreateInput) {
      const id = 'st-' + (stadiums.length + 1);
      stadiums.push({
        id,
        name: args.name,
        qid: args.qid,
        clubId: args.clubId ?? null,
        importedFrom: args.importedFrom,
        importedAt: args.importedAt,
        capacity: args.capacity ?? null,
        latitude: args.latitude ?? null,
        longitude: args.longitude ?? null,
      });
      return { id };
    },
  };
}

function binding(opts: {
  stadium?: string;
  name?: string;
  capacity?: string;
  point?: string;
  city?: string;
  country?: string;
  club?: string;
}): Record<string, { type: string; value: string }> {
  const b: Record<string, { type: string; value: string }> = {};
  const set = (k: string, value: string, type = 'uri') => {
    // eslint-disable-next-line security/detect-object-injection -- chaves fixas do SPARQL (bindings)
    if (value !== undefined) b[k] = { type, value };
  };
  set('stadium', opts.stadium ?? 'http://www.wikidata.org/entity/Q12345');
  set('stadiumLabel', opts.name ?? 'Maracanã Stadium', 'literal');
  set('capacity', opts.capacity, 'literal');
  set('point', opts.point, 'literal');
  set('cityLabel', opts.city, 'literal');
  set('countryCode', opts.country, 'literal');
  set('club', opts.club);
  return b;
}

function sparqlResponse(bindings: ReturnType<typeof binding>[]) {
  return {
    head: {
      vars: ['stadium', 'stadiumLabel', 'capacity', 'point', 'cityLabel', 'countryCode', 'club'],
    },
    results: { bindings },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wikidata-stadiums connector', () => {
  it('buildStadiumsQuery usa P31/P279* de Q483110 e extrai P1083/P625/P131/P17/P297/P466', () => {
    const q = buildStadiumsQuery({ offset: 100, limit: 500 });
    expect(q).toContain('wdt:P31/wdt:P279* wd:' + STADIUM_CLASS_QID);
    expect(q).toContain('wdt:P1083 ?capacity');
    expect(q).toContain('wdt:P625 ?point');
    expect(q).toContain('wdt:P131 ?city');
    expect(q).toContain('wdt:P17 ?country');
    expect(q).toContain('wdt:P297 ?countryCode');
    expect(q).toContain('wdt:P466 ?club');
    expect(q).toContain('wikibase:language "pt,en"');
    expect(q).toContain('LIMIT 500 OFFSET 100');
  });

  it('buildStadiumsQuery omite VALUES quando não há clubQids (consulta genérica)', () => {
    const q = buildStadiumsQuery({ limit: 10 });
    expect(q).not.toContain('VALUES');
  });

  it('buildStadiumsQuery adiciona VALUES ?club para os clubes do acervo', () => {
    const q = buildStadiumsQuery({ clubQids: ['Q37351', 'Q5567'], limit: 10 });
    expect(q).toContain('VALUES ?club { wd:Q37351 wd:Q5567 }');
  });

  it('buildStadiumsQuery permite amostragem barata (sem DISTINCT/ORDER BY)', () => {
    const q = buildStadiumsQuery({ distinct: false, orderBy: false, limit: 5 });
    expect(q).not.toContain('SELECT DISTINCT');
    expect(q).toContain(
      'SELECT ?stadium ?stadiumLabel ?capacity ?point ?cityLabel ?countryCode ?club',
    );
    expect(q).not.toContain('ORDER BY');
    expect(q).toContain('LIMIT 5');
  });

  it('parseCoordinates converte OGC POINT(lon lat) para { lat, lon }', () => {
    expect(parseCoordinates('POINT(-43.2231 -22.9121)')).toEqual({ lat: -22.9121, lon: -43.2231 });
    expect(parseCoordinates('Point(45.0 12.5)')).toEqual({ lat: 12.5, lon: 45.0 });
    expect(parseCoordinates('INVALID')).toBeNull();
    expect(parseCoordinates(undefined)).toBeNull();
  });

  it('parseStadiums valida e destila um estádio completo', () => {
    const json = sparqlResponse([
      binding({
        capacity: '78838',
        point: 'POINT(-43.2231 -22.9121)',
        city: 'Rio de Janeiro',
        country: 'BR',
        club: 'http://www.wikidata.org/entity/Q37351',
      }),
    ]);
    const entries = parseStadiums(json);
    expect(entries).toEqual([
      {
        qid: 'Q12345',
        name: 'Maracanã Stadium',
        latitude: -22.9121,
        longitude: -43.2231,
        capacity: 78838,
        city: 'Rio de Janeiro',
        country: 'BR',
        surface: null,
        clubQid: 'Q37351',
      },
    ]);
  });

  it('parseStadiums mantém estádio sem P625/P1083 (coords/capacidade null)', () => {
    const json = sparqlResponse([binding({ name: 'Estádio sem geo' })]);
    const entries = parseStadiums(json);
    expect(entries).toHaveLength(1);
    expect(entries[0].latitude).toBeNull();
    expect(entries[0].longitude).toBeNull();
    expect(entries[0].capacity).toBeNull();
    expect(entries[0].clubQid).toBeNull();
  });

  it('parseStadiums descarta coordenadas fora de faixa via Zod', () => {
    const badLat = sparqlResponse([binding({ point: 'POINT(-43.0 95.0)' })]);
    const badLon = sparqlResponse([binding({ point: 'POINT(200.0 -22.0)' })]);
    expect(parseStadiums(badLat)).toEqual([]);
    expect(parseStadiums(badLon)).toEqual([]);
  });

  it('parseStadiums descarta capacidade negativa via Zod', () => {
    const json = sparqlResponse([binding({ capacity: '-1', point: 'POINT(-43.0 -22.0)' })]);
    expect(parseStadiums(json)).toEqual([]);
  });

  it('parseStadiums ignora binding sem QID e payload inválido', () => {
    const noQid = sparqlResponse([binding({ stadium: 'http://example.com/x' })]);
    expect(parseStadiums(noQid)).toEqual([]);
    expect(parseStadiums({ garbage: true })).toEqual([]);
    expect(parseStadiums(null)).toEqual([]);
  });

  it('dedup key é o QID (estável)', () => {
    expect(stadiumsDedupKey({ qid: 'Q12345' } as unknown as StadiumEntry)).toBe('Q12345');
  });

  it('fetchStadiums usa globalThis.fetch (stub) e devolve entradas validadas', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        sparqlResponse([
          binding({
            capacity: '78838',
            point: 'POINT(-43.2231 -22.9121)',
            club: 'http://www.wikidata.org/entity/Q37351',
          }),
          binding({ stadium: 'http://www.wikidata.org/entity/Q999', name: 'Outro estádio' }),
        ]),
    });
    vi.stubGlobal('fetch', mockFetch);

    const entries = await fetchStadiums({ maxPages: 1, limit: 100 });
    expect(entries.length).toBe(2);
    expect(entries[0]).toEqual({
      qid: 'Q12345',
      name: 'Maracanã Stadium',
      latitude: -22.9121,
      longitude: -43.2231,
      capacity: 78838,
      city: null,
      country: null,
      surface: null,
      clubQid: 'Q37351',
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('query=');
    expect(url).toContain('format=json');
  });

  it('fetchStadiums faz retry com backoff em erro HTTP', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sparqlResponse([binding({ point: 'POINT(-43.2231 -22.9121)' })]),
      });
    vi.stubGlobal('fetch', mockFetch);

    const entries = await fetchStadiums({
      maxPages: 1,
      maxRetries: 1,
      backoffMs: 1,
      sleep: async () => {},
    });
    expect(entries.length).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('syncStadiums não cria órfãos (clube fora do acervo) e devolve fila de revisão', async () => {
    const repo = makeRepo(['Q37351']);
    const entries: StadiumEntry[] = [
      {
        qid: 'Q1',
        name: 'Maracanã',
        latitude: -22.9,
        longitude: -43.2,
        capacity: 78000,
        city: 'Rio',
        country: 'BR',
        surface: null,
        clubQid: 'Q37351',
      },
      { qid: 'Q2', name: 'Sem clube', city: null, country: null, surface: null, clubQid: null },
      { qid: 'Q3', name: 'Clube desconhecido', clubQid: 'Q88888' },
    ];
    const res = await syncStadiums(entries, repo);

    expect(res.persisted.length).toBe(2);
    expect(res.orphans.length).toBe(1);
    expect(res.orphans[0].qid).toBe('Q3');
    expect(res.orphans[0].reason).toBe('club_missing');
    expect(repo.stadiums.length).toBe(2);
    expect(repo.stadiums.find((s) => s.qid === 'Q1')?.clubId).toBe('c-Q37351');
    expect(repo.stadiums.find((s) => s.qid === 'Q2')?.clubId).toBeNull();
  });

  it('syncStadiums é idempotente (rodar 2x não duplica)', async () => {
    const repo = makeRepo([]);
    const entries: StadiumEntry[] = [
      { qid: 'Q1', name: 'Maracanã', city: null, country: null, surface: null, clubQid: null },
    ];

    const first = await syncStadiums(entries, repo);
    expect(first.persisted.length).toBe(1);

    const second = await syncStadiums(entries, repo);
    expect(second.persisted.length).toBe(0);
    expect(second.skipped.length).toBe(1);
    expect(repo.stadiums.length).toBe(1);
  });

  it('syncStadiums deduplica QIDs repetidos no mesmo lote', async () => {
    const repo = makeRepo([]);
    const entries: StadiumEntry[] = [
      { qid: 'Q1', name: 'Maracanã', city: null, country: null, surface: null, clubQid: null },
      { qid: 'Q1', name: 'Maracanã', city: null, country: null, surface: null, clubQid: null },
    ];
    const res = await syncStadiums(entries, repo);
    expect(res.persisted.length).toBe(1);
    expect(res.skipped.length).toBe(1);
    expect(repo.stadiums.length).toBe(1);
  });

  it('syncStadiums grava proveniência obrigatória (importedFrom/importedAt)', async () => {
    const repo = makeRepo([]);
    const t0 = new Date('2026-09-05T00:00:00Z');
    await syncStadiums(
      [{ qid: 'Q1', name: 'Maracanã', city: null, country: null, surface: null, clubQid: null }],
      repo,
      { now: () => t0 },
    );

    expect(repo.stadiums).toHaveLength(1);
    const s = repo.stadiums[0];
    expect(s.importedFrom).toBe(STADIUMS_DATASOURCE);
    expect(s.importedAt).toBe(t0);
    expect(s.qid).toBe('Q1');
  });
});
