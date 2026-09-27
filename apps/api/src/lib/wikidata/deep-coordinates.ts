/**
 * WS-D M1a-3 — Resolvedor PROFUNDO de coordenadas (Wikidata CC0).
 *
 * Estende o extrator de 1 nível (`extract-club-coordinates.ts`, já esgotado pelos
 * clubes sem coord) com caminhos mais fundos, sempre por CENTROIDE de município:
 *
 *   1. `P625` direto                                  → exact
 *   2. `P115` (estádio) / `P159` (sede) com P625       → exact
 *   3. `P131` (admin) com P625                         → municipality
 *   4. `P276`/`P937` (local) com P625                   → municipality
 *   5. `P115`/`P159` → P131 do estádio/sede com P625   → municipality
 *   6. cadeia `P131` aninhada (até `maxChain` níveis)  → municipality
 *
 * NUNCA usa o centroide do país (`P17`). PURO quanto à rede: o fetch é injetado.
 */
import { fetchEntities, type WikidataEntity } from './wikidata-client.js';
import { extractCityLabel, extractCoordinate, isCity } from './enrich-attributes.js';

export type DeepCoordSource =
  | 'P625_direct'
  | 'P115'
  | 'P159'
  | 'P131'
  | 'P276'
  | 'P937'
  | 'P115_P131'
  | 'P159_P131'
  | 'P131_chain';

export type DeepCoordPrecision = 'exact' | 'municipality';

export interface DeepCoordResult {
  lat: number;
  lng: number;
  source: DeepCoordSource;
  precision: DeepCoordPrecision;
  cityLabel?: string;
}

type BulkFetcher = (qids: string[]) => Promise<Map<string, WikidataEntity | null>>;

export interface DeepCoordOptions {
  maxChain?: number;
}

function ids(entity: WikidataEntity | null, prop: string): string[] {
  return (entity?.claims?.[prop] ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string })?.id)
    .filter((v): v is string => typeof v === 'string');
}

function cityOf(entity: WikidataEntity | null): string | undefined {
  return isCity(entity) ? (extractCityLabel(entity) ?? undefined) : undefined;
}

const ONE_LEVEL: Array<{ prop: string; source: DeepCoordSource; precision: DeepCoordPrecision }> = [
  { prop: 'P115', source: 'P115', precision: 'exact' },
  { prop: 'P159', source: 'P159', precision: 'exact' },
  { prop: 'P131', source: 'P131', precision: 'municipality' },
  { prop: 'P276', source: 'P276', precision: 'municipality' },
  { prop: 'P937', source: 'P937', precision: 'municipality' },
];

/** Resolve coordenadas de um conjunto de QIDs de clubes (em lote, com dedupe de fetch). */
export async function resolveDeepCoordinatesBulk(
  qids: string[],
  bulkFn: BulkFetcher = fetchEntities,
  opts: DeepCoordOptions = {},
): Promise<Map<string, DeepCoordResult | null>> {
  const maxChain = opts.maxChain ?? 3;
  const out = new Map<string, DeepCoordResult | null>();
  const entities = new Map<string, WikidataEntity | null>();

  const fetchInto = async (set: Set<string>): Promise<void> => {
    const missing = [...set].filter((q) => !entities.has(q));
    if (missing.length === 0) return;
    for (const [q, e] of await bulkFn(missing)) entities.set(q, e);
    for (const q of missing) if (!entities.has(q)) entities.set(q, null);
  };

  await fetchInto(new Set(qids));

  // 1. P625 direto (exact)
  for (const q of qids) {
    const c = extractCoordinate(entities.get(q) ?? null);
    if (c) out.set(q, { lat: c.lat, lng: c.lng, source: 'P625_direct', precision: 'exact' });
  }

  // 2-4. Um nível (exact para estádio/sede; municipality para admin/local), com prioridade
  const level1 = new Map<string, Array<{ owner: string }>>();
  for (const q of qids) {
    if (out.has(q)) continue;
    const e = entities.get(q) ?? null;
    for (const { prop } of ONE_LEVEL) {
      for (const cid of ids(e, prop)) {
        const arr = level1.get(cid) ?? [];
        arr.push({ owner: q });
        level1.set(cid, arr);
      }
    }
  }
  await fetchInto(new Set(level1.keys()));
  for (const q of qids) {
    if (out.has(q)) continue;
    const e = entities.get(q) ?? null;
    for (const { prop, source, precision } of ONE_LEVEL) {
      let hit = false;
      for (const cid of ids(e, prop)) {
        const ce = entities.get(cid) ?? null;
        const c = extractCoordinate(ce);
        if (c) {
          out.set(q, { lat: c.lat, lng: c.lng, source, precision, cityLabel: cityOf(ce) });
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }

  // 5-6. Cadeia: P115/P159 -> seu P131; e P131 aninhado (municipality)
  type Seed = { owner: string; source: DeepCoordSource };
  const addSeed = (map: Map<string, Seed[]>, admin: string, seed: Seed): void => {
    const arr = map.get(admin) ?? [];
    arr.push(seed);
    map.set(admin, arr);
  };
  let frontier = new Map<string, Seed[]>();
  for (const q of qids) {
    if (out.has(q)) continue;
    const e = entities.get(q) ?? null;
    for (const [prop, source] of [
      ['P115', 'P115_P131'],
      ['P159', 'P159_P131'],
    ] as Array<[string, DeepCoordSource]>) {
      for (const cid of ids(e, prop)) {
        const ce = entities.get(cid) ?? null;
        for (const aid of ids(ce, 'P131')) addSeed(frontier, aid, { owner: q, source });
      }
    }
    for (const cid of ids(e, 'P131')) addSeed(frontier, cid, { owner: q, source: 'P131_chain' });
  }

  for (let depth = 0; depth < maxChain && frontier.size > 0; depth++) {
    await fetchInto(new Set(frontier.keys()));
    for (const [admin, seeds] of frontier) {
      const ae = entities.get(admin) ?? null;
      const c = extractCoordinate(ae);
      if (!c) continue;
      for (const { owner, source } of seeds) {
        if (out.has(owner)) continue;
        out.set(owner, { lat: c.lat, lng: c.lng, source, precision: 'municipality', cityLabel: cityOf(ae) });
      }
    }
    const next = new Map<string, Seed[]>();
    for (const [admin, seeds] of frontier) {
      const ae = entities.get(admin) ?? null;
      for (const parent of ids(ae, 'P131')) {
        for (const { owner, source } of seeds) {
          if (!out.has(owner)) addSeed(next, parent, { owner, source });
        }
      }
    }
    frontier = next;
  }

  for (const q of qids) if (!out.has(q)) out.set(q, null);
  return out;
}
