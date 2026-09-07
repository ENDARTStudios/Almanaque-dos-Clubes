import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCoords, parseP625 } from '../../../scripts/enrich-club-coords.js';

// T428 FASE 5 — 1º teste do enrich-club-coords: zero rede, valida o contrato
// de mapeamento (P625 → lat/lng) e a tolerância a dados ausentes/malformados.
// CI nunca faz rede externa: fetch é stubado via globalThis.fetch.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Constrói a resposta da API wbgetentities no formato que fetchCoords consome. */
function wbPayload(entities: Record<string, unknown>) {
  return { entities };
}

describe('parseP625 (lógica pura de extração do P625)', () => {
  it('mapeamento feliz: P625 com lat/lng numéricos → Coord', () => {
    const claims = {
      P625: [
        {
          mainsnak: { datavalue: { value: { latitude: -22.9, longitude: -43.2 } } },
        },
      ],
    };
    expect(parseP625(claims)).toEqual({ lat: -22.9, lng: -43.2 });
  });

  it('coordenada ausente (sem P625): retorna null (clube pulado, sem overwrite)', () => {
    expect(parseP625(undefined)).toBeNull();
    expect(parseP625({})).toBeNull();
    expect(parseP625({ P31: [] })).toBeNull();
  });

  it('coordenada malformada (lat/lng como string): tratada como ausente, não crasha', () => {
    const claims = {
      P625: [{ mainsnak: { datavalue: { value: { latitude: '-22.9', longitude: 'west' } } } }],
    };
    expect(parseP625(claims)).toBeNull();
  });

  it('P625 com value incompleto (só lat, falta lng): null', () => {
    const claims = {
      P625: [{ mainsnak: { datavalue: { value: { latitude: -22.9 } } } }],
    };
    expect(parseP625(claims)).toBeNull();
  });
});

describe('fetchCoords (mock de globalThis.fetch)', () => {
  it('mapeia QIDs com P625 válida; ignora ausentes e malformadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        wbPayload({
          Q1: {
            claims: {
              P625: [{ mainsnak: { datavalue: { value: { latitude: 1, longitude: 1 } } } }],
            },
          },
          Q2: { claims: { P31: [] } }, // sem P625
          Q3: { claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: 'x' } } } }] } }, // malformada
          Q4: {
            claims: {
              P625: [{ mainsnak: { datavalue: { value: { latitude: -10, longitude: -20 } } } }],
            },
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const map = await fetchCoords(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(map.size).toBe(2);
    expect(map.get('Q1')).toEqual({ lat: 1, lng: 1 });
    expect(map.get('Q4')).toEqual({ lat: -10, lng: -20 });
    expect(map.has('Q2')).toBe(false);
    expect(map.has('Q3')).toBe(false);
  });

  it('idempotência: rodar 2× sobre o mesmo payload produz o mesmo Map', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        wbPayload({
          Q1: {
            claims: {
              P625: [{ mainsnak: { datavalue: { value: { latitude: 1, longitude: 1 } } } }],
            },
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchCoords(['Q1']);
    const second = await fetchCoords(['Q1']);
    expect(second).toEqual(first);
    expect(second.get('Q1')).toEqual({ lat: 1, lng: 1 });
  });
});
