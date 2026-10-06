/**
 * T450 wave 2 — script seed-brazilian-women-football (partes puras mockadas).
 * Unit do dedup/query + fetch com globalThis.fetch stubado (mesma convenção
 * do connector T424: módulo puro, rede mockável).
 */
import { describe, it, expect, vi, afterAll } from 'vitest';
import {
  buildBrWomensSparql,
  dedupeByQid,
  fetchBrWomensClubs,
  BR_WOMENS_LEAGUE_QIDS,
} from '../../src/scripts/seed-brazilian-women-football.js';

describe('T450 wave 2 — seed BR feminino (puro)', () => {
  it('query SPARQL inclui as 4 ligas verificadas', () => {
    const q = buildBrWomensSparql(BR_WOMENS_LEAGUE_QIDS);
    for (const liga of BR_WOMENS_LEAGUE_QIDS) expect(q).toContain(`wd:${liga}`);
    expect(q).toContain('P118');
  });

  it('dedup por QID remove repetidos', () => {
    const out = dedupeByQid([
      { qid: 'Q1', name: 'A', country: 'BR' },
      { qid: 'Q1', name: 'A duplicada', country: 'BR' },
      { qid: 'Q2', name: 'B', country: 'BR' },
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.qid)).toEqual(['Q1', 'Q2']);
  });

  it('fetch parseia SPARQL JSON e força country=BR', async () => {
    const payload = {
      results: {
        bindings: [
          {
            club: { value: 'http://www.wikidata.org/entity/Q99' },
            clubLabel: { value: 'Clube X' },
          },
          { club: { value: 'http://www.wikidata.org/entity/Q98' }, clubLabel: { value: '' } },
        ],
      },
    };
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }) as unknown as Response,
      );
    const out = await fetchBrWomensClubs(['Q5028272']);
    expect(out).toHaveLength(1); // rótulo vazio é filtrado
    expect(out[0]).toMatchObject({ qid: 'Q99', name: 'Clube X', country: 'BR' });
    expect(spy.mock.calls[0][0] as string).toContain('Q5028272');
    spy.mockRestore();
  });

  it('fetch propaga erro HTTP (504/503 transientes)', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('down', { status: 504 }) as unknown as Response);
    await expect(fetchBrWomensClubs(['Q5028272'])).rejects.toThrow('SPARQL HTTP 504');
    spy.mockRestore();
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
