import { describe, it, expect } from 'vitest';
import {
  syncStadiums,
  stadiumsDedupKey,
  WIKIDATA_ITEM_URL_BASE,
  type StadiumEntry,
  type StadiumsRepository,
  type StadiumCreateInput,
} from '../../../src/modules/etl/connectors/wikidata-stadiums.connector.js';

// T428 FASE 3 (stadiums) — sync idempotente + anti-órfão + sourceUrl, tudo com
// repositório fake em memória (zero rede, zero banco). CI nunca faz rede externa.

interface FakeRow {
  id: string;
  input: StadiumCreateInput;
}

function makeRepo(seedClubs: Array<{ id: string; qid: string }> = []) {
  const clubs = new Map(seedClubs.map((c) => [c.qid, c.id]));
  const stadiums = new Map<string, FakeRow>();
  const repo: StadiumsRepository = {
    async findClubByQid(qid: string) {
      const id = clubs.get(qid);
      return id ? { id } : null;
    },
    async findStadiumByQid(qid: string) {
      const row = stadiums.get(qid);
      return row ? { id: row.id } : null;
    },
    async createStadium(args: StadiumCreateInput) {
      const id = `stadium-${args.qid}`;
      stadiums.set(args.qid, { id, input: args });
      return { id };
    },
  };
  return { repo, stadiums };
}

function makeEntry(overrides: Partial<StadiumEntry> = {}): StadiumEntry {
  return {
    qid: 'Q483110',
    name: 'Estádio Teste',
    latitude: -23.5,
    longitude: -46.6,
    capacity: 40000,
    city: 'São Paulo',
    country: 'BR',
    surface: 'grass',
    clubQid: null,
    ...overrides,
  };
}

describe('stadiumsDedupKey (chave estável)', () => {
  it('qid é a chave (idempotência entre rodadas)', () => {
    expect(stadiumsDedupKey({ qid: 'Q1' })).toBe('Q1');
    expect(stadiumsDedupKey(makeEntry({ qid: 'Q2' }))).toBe('Q2');
  });
});

describe('syncStadiums (fake repo em memória)', () => {
  it('preenche sourceUrl canônico nos criados (default + override)', async () => {
    const { repo, stadiums } = makeRepo();
    const res = await syncStadiums([makeEntry({ qid: 'Q100' })], repo);
    expect(res.persisted).toHaveLength(1);
    expect(stadiums.get('Q100')?.input.sourceUrl).toBe(`${WIKIDATA_ITEM_URL_BASE}Q100`);

    const res2 = await syncStadiums([makeEntry({ qid: 'Q101' })], repo, {
      sourceUrlBase: 'https://example.org/wiki/',
    });
    expect(res2.persisted).toHaveLength(1);
    expect(stadiums.get('Q101')?.input.sourceUrl).toBe('https://example.org/wiki/Q101');
  });

  it('dedup no lote: mesmo qid 2× → 1 persisted + 1 skipped', async () => {
    const { repo } = makeRepo();
    const res = await syncStadiums([makeEntry({ qid: 'Q200' }), makeEntry({ qid: 'Q200' })], repo);
    expect(res.persisted).toHaveLength(1);
    expect(res.skipped).toHaveLength(1);
    expect(res.total).toBe(2);
  });

  it('anti-órfão: clubQid sem clube no acervo → orphans, nunca persiste', async () => {
    const { repo, stadiums } = makeRepo([]);
    const res = await syncStadiums([makeEntry({ qid: 'Q300', clubQid: 'Q999' })], repo);
    expect(res.persisted).toHaveLength(0);
    expect(res.orphans).toHaveLength(1);
    expect(res.orphans[0].reason).toBe('club_missing');
    expect(stadiums.has('Q300')).toBe(false);
  });

  it('sem clubQid → persiste com clubId null', async () => {
    const { repo, stadiums } = makeRepo([]);
    const res = await syncStadiums([makeEntry({ qid: 'Q301', clubQid: null })], repo);
    expect(res.persisted).toHaveLength(1);
    expect(stadiums.get('Q301')?.input.clubId).toBeNull();
  });

  it('idempotência: 2ª execução sobre o mesmo estado → tudo skipped, 0 persisted', async () => {
    const { repo } = makeRepo();
    const first = await syncStadiums(
      [makeEntry({ qid: 'Q400' }), makeEntry({ qid: 'Q401' })],
      repo,
    );
    expect(first.persisted).toHaveLength(2);
    const second = await syncStadiums(
      [makeEntry({ qid: 'Q400' }), makeEntry({ qid: 'Q401' })],
      repo,
    );
    expect(second.persisted).toHaveLength(0);
    expect(second.skipped).toHaveLength(2);
  });
});
