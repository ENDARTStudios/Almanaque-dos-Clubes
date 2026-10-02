import { describe, it, expect } from 'vitest';
import { extractClubCoordinates } from '../../../src/lib/wikidata/extract-club-coordinates.js';
import type { WikidataEntity } from '../../../src/lib/wikidata/wikidata-client.js';

// WS-D M1a-2 — prioridade P625 > P159 > P115 > P131.

const coord = (lat: number, lng: number) => ({
  mainsnak: { datavalue: { value: { latitude: lat, longitude: lng } } },
});
const idc = (id: string) => ({ mainsnak: { datavalue: { value: { id } } } });
const ent = (
  claims: Record<string, unknown[]>,
  labels?: Record<string, { value: string }>,
): WikidataEntity => ({ id: 'Qx', claims: claims as never, labels });

function fetcher(map: Record<string, WikidataEntity | null>) {
  return async (qid: string) => map[qid] ?? null;
}

describe('WS-D M1a-2 — extractClubCoordinates', () => {
  it('P625 direto → high', async () => {
    const f = fetcher({ Q1: ent({ P625: [coord(1, 2)] }) });
    expect(await extractClubCoordinates('Q1', f)).toMatchObject({
      lat: 1,
      lng: 2,
      source: 'direct_P625',
      confidence: 'high',
    });
  });

  it('P159 com P625 → high + cityLabel', async () => {
    const f = fetcher({
      Q1: ent({ P159: [idc('QHQ')] }),
      QHQ: ent({ P625: [coord(-22.9, -43.2)] }, { pt: { value: 'Rio de Janeiro' } }),
    });
    expect(await extractClubCoordinates('Q1', f)).toMatchObject({
      lat: -22.9,
      source: 'P159',
      cityLabel: 'Rio de Janeiro',
      confidence: 'high',
    });
  });

  it('P159 sem P625 cai para P115 (medium)', async () => {
    const f = fetcher({
      Q1: ent({ P159: [idc('QHQ')], P115: [idc('QV')] }),
      QHQ: ent({ P31: [idc('Q5')] }),
      QV: ent({ P625: [coord(-23.5, -46.6)] }, { pt: { value: 'São Paulo' } }),
    });
    expect(await extractClubCoordinates('Q1', f)).toMatchObject({
      source: 'P115',
      confidence: 'medium',
      cityLabel: 'São Paulo',
    });
  });

  it('P131 com P625 → low', async () => {
    const f = fetcher({
      Q1: ent({ P131: [idc('QC')] }),
      QC: ent({ P625: [coord(-25, -49)] }, { pt: { value: 'Curitiba' } }),
    });
    expect(await extractClubCoordinates('Q1', f)).toMatchObject({
      source: 'P131',
      confidence: 'low',
    });
  });

  it('nenhuma fonte → null', async () => {
    const f = fetcher({ Q1: ent({ P31: [idc('Q476028')] }) });
    expect(await extractClubCoordinates('Q1', f)).toBeNull();
  });
});
