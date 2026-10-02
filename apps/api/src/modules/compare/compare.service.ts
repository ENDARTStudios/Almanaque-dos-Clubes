/**
 * T440 — Comparadores clube×clube e jogador×jogador.
 *
 * Métricas AUDITÁVEIS a partir do acervo real:
 *  - Títulos por hierarquia: arestas KnowledgeGraph `WON` (club WON competition),
 *    hierarquia pela mesma resolução do Ranking 0-100 (T425/T438).
 *  - Ranking histórico: entradas publicadas por temporada (0-100).
 *  - Fundação, estádio/capacidade, país/estado/cidade: colunas do schema.
 *
 * HONESTIDADE (princípio 1.3): partidas=0 e gols/jogador sem fonte no schema
 * hoje → as métricas correspondentes vêm como `null` com `reason` (NUNCA
 * inventadas). Quando o ETL de partidas/estatísticas chegar (M4), os campos
 * passam a ser preenchidos sem mudança de contrato.
 */
import { prisma } from '../../config/prisma.js';
import {
  resolveHierarchy,
  RANKING_HIERARCHIES,
  type RankHierarchy,
} from '../rankings/ranking-algorithm.service.js';
import { isEdgeSoftDeleted } from '../graph/soft-delete.js';

export type HierarchyBreakdown = Record<RankHierarchy, number> & { total: number };

export function emptyBreakdown(): HierarchyBreakdown {
  const out = { total: 0 } as HierarchyBreakdown;
  for (const h of RANKING_HIERARCHIES) out[h] = 0;
  return out;
}

/** Puro: lider por categoria (maior valor vence; empate → null). */
export function leader(a: number | null, b: number | null): 'a' | 'b' | null {
  if (a === null || b === null) return null;
  if (a > b) return 'a';
  if (b > a) return 'b';
  return null;
}

export interface ClubCompareView {
  id: string;
  name: string;
  fullName: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  foundedYear: number | null;
  stadium: { name: string; capacity: number | null } | null;
  titles: HierarchyBreakdown;
  /** Histórico de rankings publicados (mais recente primeiro). */
  rankingHistory: Array<{
    season: string | null;
    rankingName: string;
    position: number;
    points: number | null;
  }>;
}

export interface ClubComparison {
  titles: { a: number; b: number; leader: 'a' | 'b' | null };
  foundedYear: { a: number | null; b: number | null; leader: 'a' | 'b' | null }; // mais antigo "lidera"
  stadiumCapacity: { a: number | null; b: number | null; leader: 'a' | 'b' | null };
  rankingPoints: { a: number | null; b: number | null; leader: 'a' | 'b' | null };
  /** Honestidade: métricas de partidas sem fonte hoje. */
  matches: { a: null; b: null; leader: null; reason: string };
}

export interface PlayerCompareView {
  id: string;
  name: string;
  position: string | null;
  country: string | null;
  birthDate: string | null;
  club: { id: string; name: string } | null;
}

export interface PlayerComparison {
  note: string;
}

export type CompareResult =
  | { kind: 'clubs'; a: ClubCompareView; b: ClubCompareView; comparison: ClubComparison }
  | { kind: 'players'; a: PlayerCompareView; b: PlayerCompareView; comparison: PlayerComparison };

/** Computação pura da comparação de clubes (testável sem banco). */
export function buildClubComparison(a: ClubCompareView, b: ClubCompareView): ClubComparison {
  const pointsOf = (c: ClubCompareView): number | null => {
    const latest = c.rankingHistory[0];
    return latest ? (latest.points ?? null) : null;
  };
  return {
    titles: {
      a: a.titles.total,
      b: b.titles.total,
      leader: leader(a.titles.total, b.titles.total),
    },
    foundedYear: {
      a: a.foundedYear,
      b: b.foundedYear,
      leader:
        a.foundedYear && b.foundedYear
          ? a.foundedYear < b.foundedYear
            ? 'a'
            : b.foundedYear < a.foundedYear
              ? 'b'
              : null
          : null,
    },
    stadiumCapacity: {
      a: a.stadium?.capacity ?? null,
      b: b.stadium?.capacity ?? null,
      leader: leader(a.stadium?.capacity ?? null, b.stadium?.capacity ?? null),
    },
    rankingPoints: {
      a: pointsOf(a),
      b: pointsOf(b),
      leader: leader(pointsOf(a), pointsOf(b)),
    },
    matches: {
      a: null,
      b: null,
      leader: null,
      reason: 'sem partidas no acervo — disponível após o ETL de partidas (M4)',
    },
  };
}

/** Carrega e compara 2 clubes. Lança NotFoundError (via rotas) se faltar algum. */
export async function compareClubs(ids: [string, string]): Promise<CompareResult> {
  const clubs = await prisma.club.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      fullName: true,
      country: true,
      state: true,
      city: true,
      foundedYear: true,
      stadiums: { select: { name: true, capacity: true } },
    },
  });
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    const { NotFoundError } = await import('@almanaque/domain');
    throw new NotFoundError('Clube', missing[0]);
  }

  // Títulos por hierarquia (arestas WON do KnowledgeGraph).
  const wonEdges = (
    await prisma.knowledgeGraph.findMany({
      where: { relation: 'WON', OR: ids.map((id) => ({ sourceId: id, sourceType: 'Club' })) },
      select: {
        sourceId: true,
        targetId: true,
        targetType: true,
        metadata: true,
      },
    })
  ).filter((e) => !isEdgeSoftDeleted(e.metadata)); // T448b-2b FASE 2
  const compIds = new Set<string>();
  for (const e of wonEdges) {
    if (e.targetType === 'Competition') compIds.add(e.targetId);
  }
  const comps = compIds.size
    ? await prisma.competition.findMany({
        where: { id: { in: [...compIds] } },
        select: { id: true, qid: true, name: true, type: true, country: true },
      })
    : [];
  const compById = new Map(comps.map((c) => [c.id, c]));

  const titlesFor = (clubId: string): HierarchyBreakdown => {
    const breakdown = emptyBreakdown();
    for (const e of wonEdges) {
      if (e.sourceId !== clubId || e.targetType !== 'Competition') continue;
      const comp = compById.get(e.targetId) ?? null;
      breakdown[resolveHierarchy(comp)] += 1;
      breakdown.total += 1;
    }
    return breakdown;
  };

  // Histórico de rankings publicados (entradas com posição).
  const historyRaw = await prisma.rankingEntry.findMany({
    where: {
      clubId: { in: ids },
      position: { not: null },
      ranking: { publishedAt: { not: null } },
    },
    orderBy: [{ ranking: { season: 'desc' } }],
    select: {
      clubId: true,
      position: true,
      points: true,
      ranking: { select: { season: true, name: true, publishedAt: true } },
    },
  });

  const views: ClubCompareView[] = ids.map((id) => {
    const c = byId.get(id)!;
    return {
      id: c.id,
      name: c.name,
      fullName: c.fullName,
      country: c.country,
      state: c.state,
      city: c.city,
      foundedYear: c.foundedYear,
      stadium:
        c.stadiums.length > 0
          ? c.stadiums.reduce(
              (big, s) => ((s.capacity ?? 0) > (big.capacity ?? 0) ? s : big),
              c.stadiums[0],
            )
          : null,
      stadiumsCount: c.stadiums.length,
      titles: titlesFor(id),
      rankingHistory: historyRaw
        .filter((h) => h.clubId === id)
        .map((h) => ({
          season: h.ranking.season,
          rankingName: h.ranking.name,
          position: h.position ?? 0,
          points: h.points,
        })),
    };
  });

  return {
    kind: 'clubs',
    a: views[0],
    b: views[1],
    comparison: buildClubComparison(views[0], views[1]),
  };
}

/**
 * Comparação de jogadores: PERFIS apenas (honesto) — o schema não tem
 * estatísticas jogador↔partida (gols/assistências) nem títulos de jogador;
 * ranking de jogador-ano é NULL documentado (T425 §8). Contrato pronto para
 * o ETL M4 preencher.
 */
export async function comparePlayers(ids: [string, string]): Promise<CompareResult> {
  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      fullName: true,
      position: true,
      country: true,
      birthDate: true,
      club: { select: { id: true, name: true } },
    },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    const { NotFoundError } = await import('@almanaque/domain');
    throw new NotFoundError('Jogador', missing[0]);
  }
  const views: PlayerCompareView[] = ids.map((id) => {
    const p = byId.get(id)!;
    return {
      id: p.id,
      name: p.fullName,
      position: p.position,
      country: p.country,
      birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : null,
      club: p.club ? { id: p.club.id, name: p.club.name } : null,
    };
  });
  return {
    kind: 'players',
    a: views[0],
    b: views[1],
    comparison: {
      note: 'Métricas de carreira (gols/assistências/títulos) dependem do ETL de estatísticas (M4) — não inventadas.',
    },
  };
}
