import { prisma } from '../../config/prisma.js';
import type { Match } from '@almanaque/domain';

export interface ListMatchesParams {
  homeClubId?: string;
  awayClubId?: string;
  competitionId?: string;
  seasonId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const matchesRepository = {
  async create(data: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<Match> {
    return prisma.match.create({ data: data as any }) as Promise<Match>;
  },
  async findMany(params: ListMatchesParams = {}): Promise<Match[]> {
    return prisma.match.findMany({
      where: buildWhere(params),
      orderBy: { date: 'desc' },
      take: Math.min(params.limit ?? 50, 100),
      skip: params.offset ?? 0,
      // T541 — a LISTA precisa dos nomes para ser renderizável (a página /matches
      // mostra mandante x visitante). Aditivo: quem já consumia só ids continua igual.
      // T579 — `logoUrl` entra no MESMO select: a lista pública passou a mostrar o
      // escudo de cada time ao lado do nome, e o logo é coluna do próprio `Club`
      // (`Club.logoUrl`, 592 clubes com mídia). Sem isso a página teria de fazer uma
      // segunda chamada por linha só para buscar um campo que já está na tabela.
      include: {
        homeClub: { select: { id: true, name: true, logoUrl: true } },
        awayClub: { select: { id: true, name: true, logoUrl: true } },
        competition: { select: { id: true, name: true } },
        season: { select: { id: true, name: true } },
      },
    }) as unknown as Promise<Match[]>;
  },

  /**
   * T541 — FACETS para os filtros da página: quais competições e temporadas TÊM
   * partidas (com contagem). Evita lista hardcoded na UI e evita oferecer filtro
   * que devolve vazio.
   */
  async facets(): Promise<{
    competitions: Array<{ id: string; name: string; count: number }>;
    seasons: Array<{ id: string; name: string; count: number }>;
  }> {
    const [comps, seasons] = await Promise.all([
      prisma.match.groupBy({ by: ['competitionId'], _count: { _all: true } }),
      prisma.match.groupBy({ by: ['seasonId'], _count: { _all: true } }),
    ]);
    const compIds = comps.map((c) => c.competitionId).filter((x): x is string => x != null);
    const seasonIds = seasons.map((s) => s.seasonId).filter((x): x is string => x != null);
    const [compRows, seasonRows] = await Promise.all([
      prisma.competition.findMany({
        where: { id: { in: compIds } },
        select: { id: true, name: true },
      }),
      prisma.season.findMany({
        where: { id: { in: seasonIds } },
        select: { id: true, name: true },
      }),
    ]);
    const compName = new Map(compRows.map((c) => [c.id, c.name]));
    const seasonName = new Map(seasonRows.map((s) => [s.id, s.name]));
    return {
      competitions: comps
        .filter((c) => c.competitionId && compName.has(c.competitionId))
        .map((c) => ({
          id: c.competitionId!,
          name: compName.get(c.competitionId!)!,
          count: c._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      seasons: seasons
        .filter((s) => s.seasonId && seasonName.has(s.seasonId))
        .map((s) => ({
          id: s.seasonId!,
          name: seasonName.get(s.seasonId!)!,
          count: s._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  },
  async count(params: ListMatchesParams = {}): Promise<number> {
    return prisma.match.count({ where: buildWhere(params) });
  },
  async findById(id: string): Promise<Match | null> {
    return prisma.match.findUnique({ where: { id } }) as Promise<Match | null>;
  },
  async update(
    id: string,
    data: Partial<Omit<Match, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Match> {
    return prisma.match.update({ where: { id }, data: data as any }) as Promise<Match>;
  },
  async remove(id: string): Promise<void> {
    await prisma.match.delete({ where: { id } });
  },
};

/**
 * T541 — o `where` é UM só para lista e contagem (antes eram dois blocos que
 * divergiam) e passa a aplicar `dateFrom`/`dateTo`, que a ROTA já aceitava e o
 * repositório IGNORAVA — filtro que não filtrava.
 */
function buildWhere(params: ListMatchesParams) {
  const date: Record<string, Date> = {};
  if (params.dateFrom) date.gte = new Date(params.dateFrom);
  if (params.dateTo) date.lte = new Date(params.dateTo);
  return {
    AND: [
      params.homeClubId ? { homeClubId: params.homeClubId } : {},
      params.awayClubId ? { awayClubId: params.awayClubId } : {},
      params.competitionId ? { competitionId: params.competitionId } : {},
      params.seasonId ? { seasonId: params.seasonId } : {},
      params.status ? { status: params.status as never } : {},
      Object.keys(date).length > 0 ? { date } : {},
    ].filter((x) => Object.keys(x).length > 0),
  };
}
