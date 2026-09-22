/**
 * T441 — Campeões vigentes por hierarquia (fonte: KnowledgeGraph `WON`).
 *
 * Honestidade 1.3: hierarquia sem aresta WON auditável → `champion: null`
 * com `reason` ("sem dados auditáveis"). Nunca inventar campeão.
 * Cache 1h (campeões mudam anualmente).
 */
import { prisma } from '../../config/prisma.js';
import { cache } from '../../services/cache.js';
import {
  RANKING_HIERARCHIES,
  isWomensCompetition,
  resolveHierarchy,
  type RankHierarchy,
} from '../rankings/ranking-algorithm.service.js';
import { isKnownHierarchy } from '../etl/connectors/wikidata-won-edges.connector.js';

export interface ChampionView {
  hierarchy: RankHierarchy;
  champion: {
    club: { id: string; name: string; country: string | null };
    competition: { id: string; name: string | null; type: string | null };
    season: number | null;
    /** URL de imagem do troféu (metadata.imageUrl) — hoje o acervo não tem; placeholder no frontend. */
    trophy: string | null;
    gender: 'men' | 'women' | null;
    ranking: { name: string; position: number; points: number | null } | null;
    /** Fonte da aresta WON (URL da EDIÇÃO no Wikidata) — citabilidade 1.3. */
    sourceUrl: string | null;
    /** T448c — auditoria do critério: edições da competição representante no acervo. */
    editions: number;
  } | null;
  reason?: string;
}

export interface ChampionsResponse {
  data: ChampionView[];
  generatedAt: string;
}

function isWomenEdge(
  comp: {
    qid: string | null;
    name: string | null;
    type: string | null;
    country: string | null;
  } | null,
  genderMeta: unknown,
): boolean {
  if (genderMeta === 'women') return true;
  return comp ? isWomensCompetition(comp) : false;
}

// ---------------------------------------------------------------------------
// T448c — Critério de representação por hierarquia (determinístico).
//
// Cada hierarquia é representada pela competição "vigente mais estabelecida":
//   1. maior ano no arquivo (vigência — o campeão mais recente vence);
//   2. mais edições registradas no acervo (longevidade = liga principal);
//   3. mais campeões distintos (diversidade competitiva);
//   4. nome asc (ordem de bytes, sem locale) → id asc.
//
// Restrições do dispatch: sem desempate por gênero (filtro de gênero é
// parâmetro, nunca critério) e sem depender da ordem implícita do findMany
// (comparador total — provado por testes com entrada embaralhada).
// Proxy consciente ATÉ o T449/ranking existir: reavaliar quando houver pontos
// de ranking por força de liga (D-2026-09-22-t448c-criterio-tiebreak).
// Proxies reprovados contra o dado de produção: "mais edições" elege o
// Campeonato Paulista (estadual congelado como nacional, parado em 2020) e
// "mais campeões distintos" elege a Serie B (paridade de divisão de acesso).
// ---------------------------------------------------------------------------

export const REPRESENTATIVE_CRITERION = 'latest-year-then-most-editions' as const;

/** Aresta WON normalizada para seleção (campos que o critério e a exibição usam). */
export interface WonEdgeInput {
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  metadata: unknown;
}

export interface CompRefInput {
  id: string;
  qid: string | null;
  name: string | null;
  type: string | null;
  country: string | null;
}

export interface ChampionEdge {
  clubId: string;
  year: number;
  gender: 'men' | 'women';
  sourceUrl: string | null;
}

export interface Representative {
  hierarchy: RankHierarchy;
  compId: string;
  compName: string | null;
  compType: string | null;
  editions: number;
  distinctChampions: number;
  latestYear: number;
  /** Aresta vigente da competição representante (ano mais recente, clubId asc). */
  champion: ChampionEdge;
}

function cmpAsc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * T448e — rank de tipo: LEAGUE representa o país antes de CUP (e de qualquer
 * outro/NULL). Campo OBJETIVO já existente no acervo (seed T429 = LEAGUE;
 * T448b-1 marcou as copas com CUP; backfill das 18 ligas com aresta executado
 * em produção) — não é tier subjetivo: 1ª-vs-2ª divisão segue dívida do T449.
 */
export function typeRank(type: string | null | undefined): number {
  if (type === 'LEAGUE') return 0;
  if (type === 'CUP') return 1;
  return 2;
}

/**
 * T448f — partição por grupo de flagship (valores REAIS de RANKING_HIERARCHIES,
 * lidos do fonte nesta tarefa — conjunto completo, sem órfãos):
 *   GRUPO-LIGA (flagship = liga): nacional, estadual, municipal
 *     → type-first (LEAGUE > CUP > outros/NULL) antes da vigência.
 *   GRUPO-COPA (flagship = copa): mundial, continental
 *     → vigência-primeiro (a copa É o flagship: UCL, FIFA Club World Cup).
 * Hierarquia fora do mapa (futuro do enum): default 'copa' (vigência-first,
 * sem demotion por tipo) — registrado no DECISOES, nunca em silêncio.
 */
export const FLAGSHIP_GROUP: Record<RankHierarchy, 'liga' | 'copa'> = {
  nacional: 'liga',
  estadual: 'liga',
  municipal: 'liga',
  mundial: 'copa',
  continental: 'copa',
};

const DEFAULT_FLAGSHIP_GROUP: 'liga' | 'copa' = 'copa';

/** Comparador total (nunca 0 entre candidatos distintos — id fecha a ordem). */
export function compareRepresentatives(a: Representative, b: Representative): number {
  // T448f — a partição é POR HIERARQUIA (a e b compartilham hierarquia por
  // construção em selectRepresentatives; nos usos diretos, a hierarquia de `a`).
  const group = FLAGSHIP_GROUP[a.hierarchy] ?? DEFAULT_FLAGSHIP_GROUP;
  const base =
    group === 'liga'
      ? typeRank(a.compType) - typeRank(b.compType) // T448e — só onde a liga é flagship
      : 0; // GRUPO-COPA: vigência-primeiro (T448c puro), sem demotion por tipo
  return (
    base ||
    b.latestYear - a.latestYear ||
    b.editions - a.editions ||
    b.distinctChampions - a.distinctChampions ||
    cmpAsc(a.compName ?? '', b.compName ?? '') ||
    cmpAsc(a.compId, b.compId)
  );
}

/**
 * Seleção PURA: agrega arestas por (hierarquia, competição) e elege o
 * representante de cada hierarquia pelo comparador acima (condicional por
 * grupo de flagship — ver FLAGSHIP_GROUP). Ordem de entrada NÃO afeta o
 * resultado (testes embaralham a entrada para provar).
 *
 * T448d — guarda de vigência: edição com year > currentYear (UTC, no momento
 * da comparação) NÃO existe para o carrossel — não é "vigente", não conta em
 * nenhuma métrica do representante. Motivo: bots pré-atribuem vencedores de
 * edições futuras no Wikidata; sem a guarda, a edição futura vence a recência
 * assim que o ano vira (D-2026-09-22-t448d-vigencia-nao-futura).
 */
export function selectRepresentatives(
  edges: WonEdgeInput[],
  comps: CompRefInput[],
  gender?: 'men' | 'women',
  currentYear: number = new Date().getUTCFullYear(),
): Map<RankHierarchy, Representative> {
  const compById = new Map(comps.map((c) => [c.id, c]));
  const aggs = new Map<string, Representative & { champions: Set<string> }>();

  for (const e of edges) {
    if (e.sourceType !== 'Club' || e.targetType !== 'Competition') continue;
    const comp = compById.get(e.targetId) ?? null;
    const meta = (e.metadata as Record<string, unknown> | null) ?? {};
    const year = typeof meta.year === 'number' ? meta.year : 0;
    if (year > currentYear) continue; // T448d — guarda de vigência (edição futura)
    const edgeGender: 'men' | 'women' = isWomenEdge(comp, meta.gender) ? 'women' : 'men';
    if (gender && edgeGender !== gender) continue;
    const hierarchy: RankHierarchy = isKnownHierarchy(meta.hierarchy)
      ? meta.hierarchy
      : resolveHierarchy(comp);
    const sourceUrl = typeof meta.sourceUrl === 'string' ? meta.sourceUrl : null;

    const key = `${hierarchy}|${e.targetId}`;
    let agg = aggs.get(key);
    if (!agg) {
      agg = {
        hierarchy,
        compId: e.targetId,
        compName: comp?.name ?? null,
        compType: comp?.type ?? null,
        editions: 0,
        distinctChampions: 0,
        latestYear: 0,
        champions: new Set<string>(),
        champion: { clubId: e.sourceId, year: 0, gender: edgeGender, sourceUrl },
      };
      aggs.set(key, agg);
    }
    agg.editions += 1;
    agg.champions.add(e.sourceId);
    if (year > agg.latestYear) agg.latestYear = year;
    // Campeão vigente DENTRO da competição: ano desc → clubId asc (total).
    const cur = agg.champion;
    if (year > cur.year || (year === cur.year && e.sourceId < cur.clubId)) {
      agg.champion = { clubId: e.sourceId, year, gender: edgeGender, sourceUrl };
    }
  }

  const byHierarchy = new Map<RankHierarchy, Representative>();
  for (const agg of aggs.values()) {
    const candidate: Representative = {
      hierarchy: agg.hierarchy,
      compId: agg.compId,
      compName: agg.compName,
      compType: agg.compType,
      editions: agg.editions,
      distinctChampions: agg.champions.size,
      latestYear: agg.latestYear,
      champion: agg.champion,
    };
    const current = byHierarchy.get(agg.hierarchy);
    if (!current || compareRepresentatives(candidate, current) < 0) {
      byHierarchy.set(agg.hierarchy, candidate);
    }
  }
  return byHierarchy;
}

export async function loadChampions(gender?: 'men' | 'women'): Promise<ChampionsResponse> {
  const edges: WonEdgeInput[] = await prisma.knowledgeGraph.findMany({
    where: { relation: 'WON' },
    select: { sourceId: true, sourceType: true, targetId: true, targetType: true, metadata: true },
  });

  const compIds = new Set<string>();
  for (const e of edges) {
    if (e.targetType === 'Competition') compIds.add(e.targetId);
  }
  const comps: CompRefInput[] = compIds.size
    ? await prisma.competition.findMany({
        where: { id: { in: [...compIds] } },
        select: { id: true, qid: true, name: true, type: true, country: true },
      })
    : [];

  // T448c — representante por hierarquia (determinístico; sem ordem de banco).
  const representatives = selectRepresentatives(edges, comps, gender);

  // Clubes + ranking vigente (último ranking publicado) em lote.
  const clubIds = [...representatives.values()].map((r) => r.champion.clubId);
  const clubs = clubIds.length
    ? await prisma.club.findMany({
        where: { id: { in: clubIds } },
        select: { id: true, name: true, country: true },
      })
    : [];
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  const latestRanking = await prisma.ranking.findFirst({
    where: { publishedAt: { not: null } },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, name: true },
  });
  const rankingEntries =
    latestRanking && clubIds.length
      ? await prisma.rankingEntry.findMany({
          where: { rankingId: latestRanking.id, clubId: { in: clubIds }, position: { not: null } },
          select: { clubId: true, position: true, points: true },
        })
      : [];
  const entryByClub = new Map(rankingEntries.map((e) => [e.clubId, e]));
  const compById = new Map(comps.map((c) => [c.id, c]));

  const data: ChampionView[] = RANKING_HIERARCHIES.map((hierarchy) => {
    const rep = representatives.get(hierarchy);
    if (!rep) return { hierarchy, champion: null, reason: 'sem dados auditáveis' };
    const club = clubById.get(rep.champion.clubId);
    if (!club) return { hierarchy, champion: null, reason: 'sem dados auditáveis' };
    const comp = compById.get(rep.compId) ?? null;
    const entry = entryByClub.get(rep.champion.clubId);
    return {
      hierarchy,
      champion: {
        club: { id: club.id, name: club.name, country: club.country },
        competition: { id: rep.compId, name: comp?.name ?? null, type: comp?.type ?? null },
        season: rep.champion.year || null,
        trophy: null, // acervo ainda sem imagens de troféu (HAS_TROPHY/imageUrl) — placeholder no frontend
        gender: rep.champion.gender,
        sourceUrl: rep.champion.sourceUrl,
        // T448c — auditoria do critério: nº de edições da competição representante.
        editions: rep.editions,
        ranking:
          entry && latestRanking
            ? { name: latestRanking.name, position: entry.position ?? 0, points: entry.points }
            : null,
      },
    };
  });

  return { data, generatedAt: new Date().toISOString() };
}

export async function getChampions(gender?: 'men' | 'women'): Promise<ChampionsResponse> {
  // Campeões mudam anualmente — cache longo é seguro (invalidação via re-run).
  return cache.remember(`champions:${gender ?? 'all'}`, 3600, async () => loadChampions(gender));
}
