import { describe, it, expect } from 'vitest';
import { resolveDeepCoordinatesBulk } from '../../../src/lib/wikidata/deep-coordinates.js';
import type { WikidataEntity } from '../../../src/lib/wikidata/wikidata-client.js';

// WS-D M1a-3 — resolução profunda (exact: P625/P115/P159; municipality: P131/cadeia/P276/P937).

const coord = (lat: number, lng: number) => ({
  mainsnak: { datavalue: { value: { latitude: lat, longitude: lng } } },
});
const idc = (id: string) => ({ mainsnak: { datavalue: { value: { id } } } });
const ent = (
  claims: Record<string, unknown[]>,
  labels?: Record<string, { value: string }>,
): WikidataEntity => ({ id: 'Qx', claims: claims as never, labels });

function bulk(map: Record<string, WikidataEntity | null>) {
  return async (qids: string[]) =>
    new Map<string, WikidataEntity | null>(
      qids.map((q) => [q, Object.prototype.hasOwnProperty.call(map, q) ? map[q] : null]),
    );
}

async function resolveOne(q: string, map: Record<string, WikidataEntity | null>) {
  const r = await resolveDeepCoordinatesBulk([q], bulk(map));
  return r.get(q) ?? null;
}

describe('WS-D M1a-3 — resolveDeepCoordinatesBulk', () => {
  it('P625 direto → exact', async () => {
    expect(await resolveOne('Q1', { Q1: ent({ P625: [coord(1, 2)] }) })).toMatchObject({
      lat: 1,
      lng: 2,
      source: 'P625_direct',
      precision: 'exact',
    });
  });

  it('P115 (estádio) com P625 → exact', async () => {
    expect(
      await resolveOne('Q1', {
        Q1: ent({ P115: [idc('QV')] }),
        QV: ent({ P625: [coord(-23.5, -46.6)] }, { pt: { value: 'São Paulo' } }),
      }),
    ).toMatchObject({ source: 'P115', precision: 'exact' });
  });

  it('P159 com P625 → exact', async () => {
    expect(
      await resolveOne('Q1', {
        Q1: ent({ P159: [idc('QHQ')] }),
        QHQ: ent({ P625: [coord(-22.9, -43.2)] }),
      }),
    ).toMatchObject({ source: 'P159', precision: 'exact' });
  });

  it('P131 com P625 (cidade) → municipality + cityLabel', async () => {
    expect(
      await resolveOne('Q1', {
        Q1: ent({ P131: [idc('QC')] }),
        QC: ent({ P31: [idc('Q515')], P625: [coord(-25, -49)] }, { pt: { value: 'Curitiba' } }),
      }),
    ).toMatchObject({ source: 'P131', precision: 'municipality', cityLabel: 'Curitiba' });
  });

  it('P937 (local de trabalho) com P625 → municipality', async () => {
    expect(
      await resolveOne('Q1', {
        Q1: ent({ P937: [idc('QW')] }),
        QW: ent({ P625: [coord(10, 20)] }),
      }),
    ).toMatchObject({ source: 'P937', precision: 'municipality' });
  });

  it('P115 sem P625 → P131 do estádio → municipality', async () => {
    expect(
      await resolveOne('Q1', {
        Q1: ent({ P115: [idc('QV')] }),
        QV: ent({ P131: [idc('QADMIN')] }),
        QADMIN: ent({ P625: [coord(-20, -44)] }),
      }),
    ).toMatchObject({ source: 'P115_P131', precision: 'municipality' });
  });

  it('P131 sem P625 → cadeia P131 aninhada → municipality', async () => {
    expect(
      await resolveOne('Q1', {
        Q1: ent({ P131: [idc('QA1')] }),
        QA1: ent({ P131: [idc('QA2')] }),
        QA2: ent({ P131: [idc('QA3')] }),
        QA3: ent({ P625: [coord(-15, -47)] }),
      }),
    ).toMatchObject({ source: 'P131_chain', precision: 'municipality' });
  });

  it('prioridade: P115 vence P131', async () => {
    const r = await resolveOne('Q1', {
      Q1: ent({ P115: [idc('QV')], P131: [idc('QC')] }),
      QV: ent({ P625: [coord(1, 1)] }),
      QC: ent({ P625: [coord(2, 2)] }),
    });
    expect(r).toMatchObject({ source: 'P115' });
  });

  it('maxChain=1 não alcança o 2º nível da cadeia → null', async () => {
    const map = {
      Q1: ent({ P131: [idc('QA1')] }),
      QA1: ent({ P131: [idc('QA2')] }),
      QA2: ent({ P625: [coord(-15, -47)] }),
    };
    const r = await resolveDeepCoordinatesBulk(['Q1'], bulk(map), { maxChain: 1 });
    expect(r.get('Q1')).toBeNull();
  });

  it('sem fonte alguma → null', async () => {
    expect(await resolveOne('Q1', { Q1: ent({ P31: [idc('Q476028')] }) })).toBeNull();
  });
});
