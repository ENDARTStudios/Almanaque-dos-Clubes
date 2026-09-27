/**
 * WS-D M1a-3 — Mapeamento PURO para geocodificação de clubes (nome + país → coordenada aproximada).
 * Sem I/O: recebe o resultado do Nominatim já parseado.
 */
import type { NominatimResult } from './nominatim-client.js';

/**
 * Tipos (`type`) aceitáveis — o Nominatim (jsonv2) frequentemente devolve `class` vazio,
 * então o discriminador confiável é o `type`. Aceita localidades e praças esportivas;
 * REJEITA `path`/`road`/`track`/`house`/... (evita casar "RP IF" com um caminho de outro clube).
 */
const ALLOWED_TYPES = new Set([
  'city',
  'town',
  'village',
  'suburb',
  'neighbourhood',
  'quarter',
  'municipality',
  'administrative',
  'county',
  'borough',
  'locality',
  'sports_centre',
  'stadium',
  'pitch',
  'park',
]);

/** Normaliza o nome do clube para uma query limpa (remove parênteses/variantes). */
export function buildQuery(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}.'\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O resultado é plausível (tipo aceitável e coordenada válida)? */
export function isPlausibleResult(r: NominatimResult | null): r is NominatimResult {
  if (!r) return false;
  if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) return false;
  if (r.lat < -90 || r.lat > 90 || r.lon < -180 || r.lon > 180) return false;
  if (!r.type || !ALLOWED_TYPES.has(r.type)) return false;
  return true;
}
