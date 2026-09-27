import { describe, it, expect } from 'vitest';
import { NominatimClient } from '../../../src/lib/geocoding/nominatim-client.js';
import { buildQuery, isPlausibleResult } from '../../../src/lib/geocoding/geocode-clubs.js';

// WS-D M1a-3 (Opção C) — geocodificação Nominatim: query, plausibilidade e cliente.

describe('buildQuery', () => {
  it('remove parênteses e pontuação, colapsa espaços', () => {
    expect(buildQuery('Sport Clube (SC) Beira-Mar!')).toBe('Sport Clube Beira-Mar');
  });
  it('preserva letras acentuadas', () => {
    expect(buildQuery('Grêmio  Foot-Ball')).toBe('Grêmio Foot-Ball');
  });
});

describe('isPlausibleResult', () => {
  const base = {
    lat: 1,
    lon: 2,
    displayName: 'x',
    placeId: 1,
    type: 'city',
    class: 'place',
    countryCode: 'se',
  };
  it('aceita classe place', () => expect(isPlausibleResult(base)).toBe(true));
  it('rejeita classe não-plausível', () =>
    expect(isPlausibleResult({ ...base, class: 'highway' })).toBe(false));
  it('rejeita coordenada fora do range', () =>
    expect(isPlausibleResult({ ...base, lat: 999 })).toBe(false));
  it('rejeita null', () => expect(isPlausibleResult(null)).toBe(false));
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('NominatimClient.search', () => {
  it('retorna o primeiro resultado e envia countrycodes', async () => {
    let seenUrl = '';
    const fetchImpl = (async (u: string | URL | Request) => {
      seenUrl = String(u);
      return jsonResponse([
        {
          lat: '-22.9',
          lon: '-43.2',
          display_name: 'Rio',
          place_id: 9,
          type: 'city',
          class: 'place',
        },
      ]);
    }) as unknown as typeof fetch;
    const c = new NominatimClient({
      userAgent: 't',
      minIntervalMs: 0,
      fetchImpl,
      sleepImpl: async () => {},
    });
    const r = await c.search('Flamengo', 'BR');
    expect(r).toMatchObject({ lat: -22.9, lon: -43.2, placeId: 9 });
    expect(seenUrl).toContain('countrycodes=br');
  });

  it('cacheia: segunda busca não faz nova request', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return jsonResponse([
        { lat: '1', lon: '2', display_name: 'x', place_id: 1, type: 'city', class: 'place' },
      ]);
    }) as unknown as typeof fetch;
    const c = new NominatimClient({
      userAgent: 't',
      minIntervalMs: 0,
      fetchImpl,
      sleepImpl: async () => {},
    });
    await c.search('X', 'SE');
    await c.search('X', 'SE');
    expect(calls).toBe(1);
  });

  it('retry em 429 e sucesso depois', async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n += 1;
      if (n === 1) return jsonResponse({}, 429);
      return jsonResponse([
        { lat: '1', lon: '2', display_name: 'x', place_id: 1, type: 'city', class: 'place' },
      ]);
    }) as unknown as typeof fetch;
    const c = new NominatimClient({
      userAgent: 't',
      minIntervalMs: 0,
      maxRetries: 2,
      fetchImpl,
      sleepImpl: async () => {},
    });
    expect(await c.search('Y', 'SE')).toMatchObject({ placeId: 1 });
    expect(n).toBe(2);
  });

  it('403 aborta', async () => {
    const fetchImpl = (async () => jsonResponse({}, 403)) as unknown as typeof fetch;
    const c = new NominatimClient({
      userAgent: 't',
      minIntervalMs: 0,
      fetchImpl,
      sleepImpl: async () => {},
    });
    await expect(c.search('Z', 'SE')).rejects.toThrow(/403/);
  });

  it('sem resultados → null', async () => {
    const fetchImpl = (async () => jsonResponse([])) as unknown as typeof fetch;
    const c = new NominatimClient({
      userAgent: 't',
      minIntervalMs: 0,
      fetchImpl,
      sleepImpl: async () => {},
    });
    expect(await c.search('Nada', 'SE')).toBeNull();
  });
});
