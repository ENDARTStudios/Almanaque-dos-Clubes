/**
 * WS-D M1b-conservadora — Extrai city/coords de um candidato a partir das entidades-fonte
 * (prioridade: P625 direto > P159 sede > P115 estádio > P131 administrativo). PURO (mapa de entidades injetado).
 */
import { extractCoordinate, extractCityLabel, isCity } from '../enrich-attributes.js';
import type { WikidataEntity } from '../wikidata-client.js';
import type { RawCandidate } from './types.js';

export interface CandidateAttrs {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}

function firstCoord(
  ids: string[] | undefined,
  sources: Map<string, WikidataEntity | null>,
): { lat: number; lng: number; entity: WikidataEntity | null } | null {
  for (const id of ids ?? []) {
    const e = sources.get(id) ?? null;
    const c = extractCoordinate(e);
    if (c) return { lat: c.lat, lng: c.lng, entity: e };
  }
  return null;
}

/** Resolve coords/city do candidato (nunca inventa). */
export function extractCandidateAttrs(
  candidate: RawCandidate,
  sources: Map<string, WikidataEntity | null>,
): CandidateAttrs {
  if (candidate.p625) {
    return { latitude: candidate.p625.lat, longitude: candidate.p625.lng, city: null };
  }
  const chosen =
    firstCoord(candidate.p159, sources) ??
    firstCoord(candidate.p115, sources) ??
    firstCoord(candidate.p131, sources);
  if (!chosen) return { latitude: null, longitude: null, city: null };
  const city = chosen.entity && isCity(chosen.entity) ? extractCityLabel(chosen.entity) : null;
  return { latitude: chosen.lat, longitude: chosen.lng, city };
}
