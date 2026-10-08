/**
 * Mapeamento do portal (Operador, 08/10 — Entrega 2) — overview de competição
 * derivado das arestas WON do Knowledge Graph. PURO (testável, sem Prisma).
 *
 * Honestidade: a aresta PARTICIPATED_IN não existe no enum do grafo — os
 * "participantes" são os clubes com títulos catalogados nesta competição
 * (rotulados como tal na UI). Ano com MÚLTIPLOS campeões ativos = ambíguo →
 * fora das edições (mesma regra honesta do carrossel T441).
 */

export interface OverviewEdge {
  sourceId: string;
  metadata: unknown;
}

export interface OverviewClub {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface EditionRow {
  year: number;
  champion: { id: string; name: string };
}

export interface TopWinner {
  clubId: string;
  name: string;
  titles: number;
}

export interface CompetitionOverview {
  editions: EditionRow[];
  topWinners: TopWinner[];
  participants: OverviewClub[];
  totalEditions: number;
  /** Anos com múltiplos campeões ativos — ficam fora das edições (honesto). */
  ambiguousYears: number;
}

export function isEdgeSoftDeleted(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as { deletedAt?: unknown }).deletedAt != null;
}

export function buildCompetitionOverview(
  edges: OverviewEdge[],
  clubs: OverviewClub[],
): CompetitionOverview {
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const yearMap = new Map<number, Map<string, string>>(); // year → clubId → clubName
  const titlesPerClub = new Map<string, number>();

  for (const e of edges) {
    if (isEdgeSoftDeleted(e.metadata)) continue;
    const meta = (e.metadata as Record<string, unknown> | null) ?? {};
    const year = typeof meta.year === 'number' ? meta.year : 0;
    if (year <= 0) continue;
    const club = clubById.get(e.sourceId);
    if (!club) continue; // clube ausente do acervo — não inventa campeão
    const perYear = yearMap.get(year) ?? new Map<string, string>();
    perYear.set(e.sourceId, club.name);
    yearMap.set(year, perYear);
    titlesPerClub.set(e.sourceId, (titlesPerClub.get(e.sourceId) ?? 0) + 1);
  }

  const editions: EditionRow[] = [];
  let ambiguousYears = 0;
  for (const [year, perClub] of [...yearMap.entries()].sort((a, b) => b[0] - a[0])) {
    if (perClub.size !== 1) {
      ambiguousYears += 1;
      continue;
    }
    const [clubId, clubName] = [...perClub.entries()][0];
    editions.push({ year, champion: { id: clubId, name: clubName } });
  }

  const topWinners: TopWinner[] = [...titlesPerClub.entries()]
    .map(([clubId, titles]) => ({ clubId, name: clubById.get(clubId)?.name ?? '—', titles }))
    .sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name));

  const participants: OverviewClub[] = [...titlesPerClub.keys()]
    .map((clubId) => clubById.get(clubId))
    .filter((c): c is OverviewClub => !!c)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    editions,
    topWinners,
    participants,
    totalEditions: editions.length,
    ambiguousYears,
  };
}
