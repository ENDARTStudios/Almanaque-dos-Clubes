/**
 * WS-C-1 — Carrossel determinístico de campeões (READ-ONLY, API-only).
 *
 * Usa SOMENTE arestas KnowledgeGraph `WON` ativas e COM proveniência. Regras inegociáveis:
 *  - identidade é o QID (nunca o nome);
 *  - mais de um clube campeão ativo para o mesmo escopo/temporada → OMITIR (ambiguous);
 *  - sem campeão ativo → OMITIR (no_active_provenanced_champion); nunca inventar;
 *  - gênero isolado (nunca misturar masculino/feminino);
 *  - hierarquia só do dado (metadata.hierarchy conhecida ou derivada da competição);
 *  - guarda de vigência: edição com ano futuro não existe.
 *
 * A lógica de seleção é PURA (`buildCarousel`) para testes.
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import {
  isWomensCompetition,
  resolveHierarchy,
  type RankHierarchy,
} from '../rankings/ranking-algorithm.service.js';
import { isKnownHierarchy } from '../etl/connectors/wikidata-won-edges.connector.js';
import { excludeSoftDeleted } from '../graph/soft-delete.js';
import { isNonFifaWorldCompetition } from '../../lib/champions/non-fifa.js';

const CAROUSEL_TTL_SECONDS = 3600;
export const CAROUSEL_RULES_VERSION = 'ws-c-1-carousel-v1';

/** Ordem de exibição (mundial → municipal). */
export const HIERARCHY_ORDER: RankHierarchy[] = [
  'mundial',
  'continental',
  'nacional',
  'estadual',
  'municipal',
];

export interface CarouselEdge {
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  metadata: unknown;
}

export interface CarouselComp {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
}

export interface CarouselClub {
  id: string;
  qid: string | null;
  name: string;
}

export interface CarouselSource {
  type: 'wikidata' | 'rsssf' | 'knowledge_graph';
  sourceUrl: string | null;
  authorCredit: string | null;
  license: string | null;
  retrievedAt: string | null;
}

export interface CarouselScope {
  hierarchy: RankHierarchy;
  season: number;
  gender: 'men' | 'women';
  competition: { id: string; qid: string | null; name: string | null };
  champion: { id: string; qid: string | null; name: string };
  /** Auditoria 08-10 — competições mundiais de federações não-FIFA (ConIFA etc.) */
  nonFifa: boolean;
  source: CarouselSource;
  confidence: 'single_active_record';
}

export interface CarouselUnavailable {
  hierarchy: RankHierarchy;
  season: number | null;
  gender: 'men' | 'women' | null;
  competitionId: string | null;
  reason: 'ambiguous_multiple_champions' | 'no_active_provenanced_champion';
}

export interface CarouselResponse {
  generatedAt: string;
  rulesVersion: string;
  scopes: CarouselScope[];
  unavailable: CarouselUnavailable[];
  limitations: string[];
}

function sourceOf(meta: Record<string, unknown>): CarouselSource {
  const raw = typeof meta.source === 'string' ? meta.source.toLowerCase() : '';
  const type: CarouselSource['type'] =
    raw === 'rsssf' ? 'rsssf' : raw === 'wikidata' ? 'wikidata' : 'knowledge_graph';
  const license =
    typeof meta.licenseText === 'string'
      ? meta.licenseText
      : type === 'rsssf'
        ? 'RSSSF attribution (não é domínio público)'
        : type === 'wikidata'
          ? 'CC0'
          : null;
  return {
    type,
    sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null,
    authorCredit: typeof meta.authorCredit === 'string' ? meta.authorCredit : null,
    license,
    retrievedAt: typeof meta.retrievedAt === 'string' ? meta.retrievedAt : null,
  };
}

/** Seleção PURA (determinística; ordem de entrada não importa). */
export function buildCarousel(
  edges: CarouselEdge[],
  comps: CarouselComp[],
  clubs: CarouselClub[],
  currentYear: number = new Date().getUTCFullYear(),
): { scopes: CarouselScope[]; unavailable: CarouselUnavailable[] } {
  const compById = new Map(comps.map((c) => [c.id, c]));
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  // agrupa por (hierarquia, competição, gênero) → ano → clube → source
  interface Group {
    hierarchy: RankHierarchy;
    compId: string;
    gender: 'men' | 'women';
    byYear: Map<number, Map<string, CarouselSource>>;
  }
  const groups = new Map<string, Group>();

  for (const e of edges) {
    if (e.sourceType !== 'Club' || e.targetType !== 'Competition') continue;
    const comp = compById.get(e.targetId) ?? null;
    const meta = (e.metadata as Record<string, unknown> | null) ?? {};
    const year = typeof meta.year === 'number' ? meta.year : 0;
    if (year <= 0 || year > currentYear) continue;
    const gender: 'men' | 'women' =
      meta.gender === 'women' || (comp ? isWomensCompetition(comp) : false) ? 'women' : 'men';
    const hierarchy: RankHierarchy = isKnownHierarchy(meta.hierarchy)
      ? meta.hierarchy
      : resolveHierarchy(comp);
    const key = `${hierarchy}|${e.targetId}|${gender}`;
    let g = groups.get(key);
    if (!g) {
      g = { hierarchy, compId: e.targetId, gender, byYear: new Map() };
      groups.set(key, g);
    }
    const yearMap = g.byYear.get(year) ?? new Map<string, CarouselSource>();
    yearMap.set(e.sourceId, sourceOf(meta));
    g.byYear.set(year, yearMap);
  }

  const scopes: CarouselScope[] = [];
  const unavailable: CarouselUnavailable[] = [];
  const seenHierarchies = new Set<RankHierarchy>();

  for (const g of groups.values()) {
    seenHierarchies.add(g.hierarchy);
    const years = [...g.byYear.keys()].sort((a, b) => b - a);
    const latestYear = years[0];
    const champions = g.byYear.get(latestYear) ?? new Map<string, CarouselSource>();
    const comp = compById.get(g.compId) ?? null;

    if (champions.size === 0) continue;
    if (champions.size > 1) {
      unavailable.push({
        hierarchy: g.hierarchy,
        season: latestYear,
        gender: g.gender,
        competitionId: g.compId,
        reason: 'ambiguous_multiple_champions',
      });
      continue;
    }
    const [clubId, source] = [...champions.entries()][0];
    const club = clubById.get(clubId);
    if (!club) continue; // clube ausente do acervo ativo — não emite campeão órfão
    scopes.push({
      hierarchy: g.hierarchy,
      season: latestYear,
      gender: g.gender,
      competition: { id: g.compId, qid: comp?.qid ?? null, name: comp?.name ?? null },
      champion: { id: club.id, qid: club.qid, name: club.name },
      nonFifa: isNonFifaWorldCompetition(comp?.qid ?? null),
      source,
      confidence: 'single_active_record',
    });
  }

  // Hierarquias sem nenhuma aresta ativa → declaradas indisponíveis.
  for (const h of HIERARCHY_ORDER) {
    if (!seenHierarchies.has(h)) {
      unavailable.push({
        hierarchy: h,
        season: null,
        gender: null,
        competitionId: null,
        reason: 'no_active_provenanced_champion',
      });
    }
  }

  scopes.sort(
    (a, b) =>
      HIERARCHY_ORDER.indexOf(a.hierarchy) - HIERARCHY_ORDER.indexOf(b.hierarchy) ||
      b.season - a.season ||
      (a.competition.name ?? '').localeCompare(b.competition.name ?? '') ||
      a.competition.id.localeCompare(b.competition.id),
  );
  unavailable.sort(
    (a, b) =>
      HIERARCHY_ORDER.indexOf(a.hierarchy) - HIERARCHY_ORDER.indexOf(b.hierarchy) ||
      (a.season ?? 0) - (b.season ?? 0),
  );

  return { scopes, unavailable };
}

async function loadCarousel(): Promise<CarouselResponse> {
  const raw = await prisma.knowledgeGraph.findMany({
    where: { relation: 'WON' },
    select: {
      sourceId: true,
      sourceType: true,
      targetId: true,
      targetType: true,
      metadata: true,
    },
  });
  const edges = excludeSoftDeleted(raw);

  const compIds = new Set<string>();
  const clubIds = new Set<string>();
  for (const e of edges) {
    if (e.sourceType === 'Club' && e.targetType === 'Competition') {
      clubIds.add(e.sourceId);
      compIds.add(e.targetId);
    }
  }

  const [comps, clubs] = await Promise.all([
    compIds.size
      ? prisma.competition.findMany({
          where: { id: { in: [...compIds] }, deletedAt: null },
          select: { id: true, qid: true, name: true, type: true, country: true },
        })
      : Promise.resolve([]),
    clubIds.size
      ? prisma.club.findMany({
          where: { id: { in: [...clubIds] }, deletedAt: null },
          select: { id: true, qid: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const { scopes, unavailable } = buildCarousel(edges, comps, clubs);

  return {
    generatedAt: new Date().toISOString(),
    rulesVersion: CAROUSEL_RULES_VERSION,
    scopes,
    unavailable,
    limitations: [
      'only_active_knowledge_graph_WON_edges',
      'ambiguous_champions_are_omitted',
      'gender_isolated_when_available',
      'hierarchy_from_data_never_inferred_from_name',
    ],
  };
}

export async function getCarousel(): Promise<CarouselResponse> {
  return cache.remember('champions:carousel', CAROUSEL_TTL_SECONDS, loadCarousel);
}
