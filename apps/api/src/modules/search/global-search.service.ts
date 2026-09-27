/**
 * WS-C-1 — Busca global tipada (READ-ONLY, API-only).
 *
 * Casa clubes e competições por `name/fullName/shortName` de forma case-insensitive e
 * acento-insensível, reutilizando `lib/search.ts` (translate()+lower() nativo do Postgres,
 * sem extensão). Homônimos NÃO são colapsados: cada linha é um resultado com QID/cidade/
 * estado/país. Jogadores ficam fora (limitação declarada) — não há índice/modelo de busca
 * consolidado ainda. Nunca usar fuzzy para criar identidade; nunca retornar soft-deleted.
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import { ACCENTED, PLAIN, searchMatchedIds } from '../../lib/search.js';
import {
  geoAttributionForMetadata,
  type GeoAttribution,
} from '../../lib/geocoding/geo-attribution.js';

const SEARCH_TTL_SECONDS = 60;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type SearchAttribution = GeoAttribution;

export interface ClubSearchResult {
  type: 'club';
  id: string;
  qid: string | null;
  name: string;
  subtitle: string | null;
  country: string | null;
  city: string | null;
  score: number;
  sourceUrl: string | null;
  attribution: SearchAttribution | null;
}

export interface CompetitionSearchResult {
  type: 'competition';
  id: string;
  qid: string | null;
  name: string;
  subtitle: string | null;
  country: string | null;
  score: number;
  sourceUrl: string | null;
}

export type GlobalSearchResult = ClubSearchResult | CompetitionSearchResult;

export interface GlobalSearchResponse {
  query: string;
  normalizedQuery: string;
  type: 'all' | 'club' | 'competition';
  results: GlobalSearchResult[];
  pagination: { limit: number; offset: number; total: number };
  limitations: string[];
}

/** Fold de acentos + lowercase (mesma tabela 1:1 do SQL). */
export function foldAccents(input: string): string {
  let out = '';
  for (const ch of input) {
    const i = ACCENTED.indexOf(ch);
    out += i >= 0 ? PLAIN[i] : ch;
  }
  return out.toLowerCase();
}

export function normalizeQuery(q: string): string {
  return foldAccents(q.trim()).replace(/\s+/g, ' ');
}

/** Relevância simples e determinística: exato > prefixo > contém. */
export function scoreName(name: string | null, normalized: string): number {
  if (!name || !normalized) return 0;
  const n = normalizeQuery(name);
  if (n === normalized) return 1;
  if (n.startsWith(normalized)) return 0.8;
  if (n.includes(normalized)) return 0.5;
  return 0;
}

export function buildSubtitle(parts: Array<string | null | undefined>): string | null {
  const s = parts.filter((p): p is string => typeof p === 'string' && p.trim() !== '').join(', ');
  return s === '' ? null : s;
}

export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

interface SearchInput {
  q: string;
  type?: 'all' | 'club' | 'competition';
  country?: string;
  limit?: number;
  offset?: number;
}

async function searchClubs(
  q: string,
  normalized: string,
  country?: string,
): Promise<ClubSearchResult[]> {
  const ids = await searchMatchedIds(prisma, 'clubs', ['name', 'fullName', 'shortName'], q, {
    softDeleteCol: 'deletedAt',
  });
  if (ids.length === 0) return [];
  const clubs = await prisma.club.findMany({
    where: { id: { in: ids }, deletedAt: null, ...(country ? { country } : {}) },
    select: {
      id: true,
      qid: true,
      name: true,
      fullName: true,
      shortName: true,
      city: true,
      state: true,
      country: true,
      sourceUrl: true,
      metadata: true,
    },
  });
  return clubs.map((c) => ({
    type: 'club' as const,
    id: c.id,
    qid: c.qid,
    name: c.name,
    subtitle: buildSubtitle([c.city, c.state, c.country]),
    country: c.country,
    city: c.city,
    score: Math.max(
      scoreName(c.name, normalized),
      scoreName(c.fullName, normalized),
      scoreName(c.shortName, normalized),
    ),
    sourceUrl: c.sourceUrl,
    attribution: geoAttributionForMetadata(c.metadata),
  }));
}

async function searchCompetitions(
  q: string,
  normalized: string,
  country?: string,
): Promise<CompetitionSearchResult[]> {
  const ids = await searchMatchedIds(prisma, 'competitions', ['name'], q);
  if (ids.length === 0) return [];
  const comps = await prisma.competition.findMany({
    where: { id: { in: ids }, deletedAt: null, ...(country ? { country } : {}) },
    select: { id: true, qid: true, name: true, type: true, country: true },
  });
  return comps.map((c) => ({
    type: 'competition' as const,
    id: c.id,
    qid: c.qid,
    name: c.name,
    subtitle: buildSubtitle([c.country, c.type]),
    country: c.country,
    score: scoreName(c.name, normalized),
    sourceUrl: c.qid ? `https://www.wikidata.org/wiki/${c.qid}` : null,
  }));
}

export async function globalSearch(input: SearchInput): Promise<GlobalSearchResponse> {
  const q = (input.q ?? '').trim();
  const type = input.type ?? 'all';
  const limit = clampLimit(input.limit);
  const offset = Math.max(Math.trunc(input.offset ?? 0) || 0, 0);
  const normalized = normalizeQuery(q);

  const limitations = [
    'players_not_indexed_yet',
    'search_uses_existing_postgres_indexes',
    'accent_insensitive_via_translate',
  ];
  if (!q) {
    return {
      query: input.q ?? '',
      normalizedQuery: '',
      type,
      results: [],
      pagination: { limit, offset, total: 0 },
      limitations: [...limitations, 'empty_query'],
    };
  }

  const data = await cache.remember(
    `search:global:${type}:${input.country ?? ''}:${normalized}`,
    SEARCH_TTL_SECONDS,
    async () => {
      const clubs = type === 'competition' ? [] : await searchClubs(q, normalized, input.country);
      const comps = type === 'club' ? [] : await searchCompetitions(q, normalized, input.country);
      return [...clubs, ...comps];
    },
  );

  const all = data
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const page = all.slice(offset, offset + limit);

  return {
    query: input.q ?? '',
    normalizedQuery: normalized,
    type,
    results: page,
    pagination: { limit, offset, total: all.length },
    limitations,
  };
}
