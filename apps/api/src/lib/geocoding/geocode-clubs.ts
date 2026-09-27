/**
 * WS-D M1a-3 — Mapeamento PURO para geocodificação de clubes (nome + país → coordenada aproximada).
 * Sem I/O: recebe o resultado do Nominatim já parseado.
 */
import type { NominatimResult } from './nominatim-client.js';

/** Classes aceitáveis (evita casar loja/rodovia/etc. ao buscar o nome do clube). */
const ALLOWED_CLASSES = new Set(['place', 'boundary', 'amenity', 'leisure', 'landuse']);

/** Normaliza o nome do clube para uma query limpa (remove parênteses/variantes). */
export function buildQuery(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}.'\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O resultado é plausível (classe aceitável e coordenada válida)? */
export function isPlausibleResult(r: NominatimResult | null): r is NominatimResult {
  if (!r) return false;
  if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) return false;
  if (r.lat < -90 || r.lat > 90 || r.lon < -180 || r.lon > 180) return false;
  if (r.class && !ALLOWED_CLASSES.has(r.class)) return false;
  return true;
}
