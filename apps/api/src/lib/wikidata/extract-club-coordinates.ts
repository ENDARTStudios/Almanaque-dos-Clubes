/**
 * WS-D M1a-2 — Resolve coordenadas de um clube via Wikidata, com prioridade
 * `P625` direto > `P159` (sede) > `P115` (estádio) > `P131` (administrativo).
 * Download de endpoints injetável para teste (default: `fetchEntity`/`fetchEntities`).
 */
import { fetchEntity, fetchEntities, type WikidataEntity } from './wikidata-client.js';
import { extractCoordinate, extractP131Qid } from './enrich-attributes.js';

export type ClubCoordinateSource = 'P159' | 'P115' | 'P131' | 'direct_P625';

export interface ClubCoordinateResult {
  lat: number;
  lng: number;
  source: ClubCoordinateSource;
  cityLabel?: string;
  confidence: 'high' | 'medium' | 'low';
}

type SingleFetcher = (qid: string) => Promise<WikidataEntity | null>;
type BulkFetcher = (qids: string[]) => Promise<Map<string, WikidataEntity | null>>;

function claimIds(entity: WikidataEntity | null, prop: string): string[] {
  return (entity?.claims?.[prop] ?? [])
    .map((c) => (c.mainsnak?.datavalue?.value as { id?: string })?.id)
    .filter((v): v is string => typeof v === 'string');
}
function labelOf(entity: WikidataEntity | null): string | undefined {
  return entity?.labels?.pt?.value ?? entity?.labels?.en?.value ?? undefined;
}

/** Resolve a coordenada de um clube (uma QID). */
export async function extractClubCoordinates(
  qid: string,
  fetchFn: SingleFetcher = fetchEntity,
): Promise<ClubCoordinateResult | null> {
  const entity = await fetchFn(qid);
  if (!entity) return null;

  const direct = extractCoordinate(entity);
  if (direct) return { ...direct, source: 'direct_P625', confidence: 'high' };

  const p159 = claimIds(entity, 'P159')[0];
  if (p159) {
    const hq = await fetchFn(p159);
    const c = extractCoordinate(hq);
    if (c) return { ...c, source: 'P159', cityLabel: labelOf(hq), confidence: 'high' };
  }
  const p115 = claimIds(entity, 'P115')[0];
  if (p115) {
    const v = await fetchFn(p115);
    const c = extractCoordinate(v);
    if (c) return { ...c, source: 'P115', cityLabel: labelOf(v), confidence: 'medium' };
  }
  const p131 = extractP131Qid(entity);
  if (p131) {
    const loc = await fetchFn(p131);
    const c = extractCoordinate(loc);
    if (c) return { ...c, source: 'P131', cityLabel: labelOf(loc), confidence: 'low' };
  }
  return null;
}

/** Variante em lote (para o gate): busca clubes + fontes em blocos e resolve tudo. */
export async function extractClubCoordinatesBulk(
  qids: string[],
  bulkFn: BulkFetcher = fetchEntities,
): Promise<Map<string, ClubCoordinateResult | null>> {
  const out = new Map<string, ClubCoordinateResult | null>();
  const clubs = await bulkFn(qids);

  const p159Set = new Set<string>();
  const p115Set = new Set<string>();
  const p131Set = new Set<string>();
  for (const q of qids) {
    const e = clubs.get(q) ?? null;
    if (!e || extractCoordinate(e)) continue;
    const p159 = claimIds(e, 'P159')[0];
    const p115 = claimIds(e, 'P115')[0];
    const p131 = extractP131Qid(e);
    if (p159) p159Set.add(p159);
    if (p115) p115Set.add(p115);
    if (p131) p131Set.add(p131);
  }
  const sources = await bulkFn([...p159Set, ...p115Set, ...p131Set]);

  for (const q of qids) {
    const e = clubs.get(q) ?? null;
    if (!e) {
      out.set(q, null);
      continue;
    }
    const direct = extractCoordinate(e);
    if (direct) {
      out.set(q, { ...direct, source: 'direct_P625', confidence: 'high' });
      continue;
    }
    const tryFrom = (
      id: string | undefined,
      source: ClubCoordinateSource,
      conf: 'high' | 'medium' | 'low',
    ) => {
      if (!id) return undefined;
      const src = sources.get(id) ?? null;
      const c = extractCoordinate(src);
      return c
        ? ({ ...c, source, cityLabel: labelOf(src), confidence: conf } as ClubCoordinateResult)
        : undefined;
    };
    const r =
      tryFrom(claimIds(e, 'P159')[0], 'P159', 'high') ??
      tryFrom(claimIds(e, 'P115')[0], 'P115', 'medium') ??
      tryFrom(extractP131Qid(e) ?? undefined, 'P131', 'low');
    out.set(q, r ?? null);
  }
  return out;
}
