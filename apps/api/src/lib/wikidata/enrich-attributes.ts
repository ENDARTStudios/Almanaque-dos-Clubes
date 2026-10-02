/**
 * WS-D M1a — Extratores PUROS de atributos a partir de uma entidade Wikidata.
 * Sem I/O: recebem o JSON da entidade (o fetch fica no cliente/script).
 */
import type { WikidataEntity } from './wikidata-client.js';

/** IDs das classes que consideramos "cidade" (P31): cidade / vila / cidade grande. */
const CITY_CLASS_QIDS = ['Q515', 'Q3957', 'Q1549591'];

function claimValues(entity: WikidataEntity | null, prop: string): unknown[] {
  return (entity?.claims?.[prop] ?? []).map((c) => c.mainsnak?.datavalue?.value);
}

function claimEntityIds(entity: WikidataEntity | null, prop: string): string[] {
  return claimValues(entity, prop)
    .map((v) => (v as { id?: string })?.id)
    .filter((v): v is string => typeof v === 'string');
}

export interface Coord {
  lat: number;
  lng: number;
}

/** Coordenada P625 da própria entidade (0 = ausente). */
export function extractCoordinate(entity: WikidataEntity | null): Coord | null {
  const v = claimValues(entity, 'P625')[0] as { latitude?: number; longitude?: number } | undefined;
  if (!v || typeof v.latitude !== 'number' || typeof v.longitude !== 'number') return null;
  return { lat: v.latitude, lng: v.longitude };
}

/** QID do território administrativo (P131) — candidato a cidade. */
export function extractP131Qid(entity: WikidataEntity | null): string | null {
  return claimEntityIds(entity, 'P131')[0] ?? null;
}

/** A entidade P131 é uma cidade (P31 ∈ CITY_CLASS_QIDS)? */
export function isCity(adminEntity: WikidataEntity | null): boolean {
  const p31 = claimEntityIds(adminEntity, 'P31');
  return p31.some((q) => CITY_CLASS_QIDS.includes(q));
}

/** Nome da cidade a partir da entidade do território (label pt → en). */
export function extractCityLabel(adminEntity: WikidataEntity | null): string | null {
  if (!adminEntity) return null;
  return adminEntity.labels?.pt?.value ?? adminEntity.labels?.en?.value ?? null;
}

/** fullName a partir do label pt (fallback en, depois aliases pt/en). */
export function extractFullName(entity: WikidataEntity | null): string | null {
  const l = entity?.labels?.pt?.value ?? entity?.labels?.en?.value;
  if (l) return l;
  const a = entity?.aliases?.pt?.[0]?.value ?? entity?.aliases?.en?.[0]?.value;
  return a ?? null;
}
