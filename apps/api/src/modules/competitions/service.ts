import { CreateCompetitionSchema, NotFoundError, type Competition } from '@almanaque/domain';
import {
  competitionsRepository,
  type ListCompetitionsParams,
  type CompetitionCountryIndex,
} from './repository.js';
import { cache } from '../../services/cache.js';
import { prisma } from '../../config/prisma.js';
import { buildCompetitionOverview, type CompetitionOverview } from './overview.js';
import {
  buildHistory,
  buildPodium,
  buildTotals,
  thirdFromStandings,
  type CompetitionHistory,
  type CompetitionPodium,
  type CompetitionTotals,
  type SeasonRowInput,
} from './insights.js';

/** T-24/25 — overview + blocos de insights (history/podium/totals), aditivo. */
export type CompetitionOverviewWithInsights = CompetitionOverview & {
  history: CompetitionHistory;
  podium: CompetitionPodium;
  totals: CompetitionTotals;
};

const COMPETITIONS_TTL_SECONDS = 5 * 60; // 5min

function cacheKeyCompetition(id: string): string {
  return `competitions:id:${id}`;
}

function listCacheKey(params: ListCompetitionsParams): string {
  return `competitions:list:${JSON.stringify(params)}`;
}

export const competitionsService = {
  /**
   * T577 — índice de países para a reorganização de `/competitions`.
   *
   * Cache read-through com o mesmo TTL da lista: o índice muda quando uma competição entra ou muda
   * de país, não a cada request.
   */
  async countryIndex(): Promise<CompetitionCountryIndex> {
    return cache.remember('competitions:country-index', COMPETITIONS_TTL_SECONDS, () =>
      competitionsRepository.countryIndex(),
    );
  },

  async create(input: unknown): Promise<Competition> {
    const parsed = CreateCompetitionSchema.parse(input);
    const competition = await competitionsRepository.create({
      name: parsed.name,
      country: parsed.country ?? null,
      type: parsed.type ?? null,
      qid: parsed.qid ?? null,
      importedFrom: parsed.importedFrom ?? null,
      importedAt: null,
    });
    await cache.invalidate('competitions:list:*');
    return competition;
  },

  async list(
    params: ListCompetitionsParams,
  ): Promise<{ data: Competition[]; total: number; limit: number; offset: number }> {
    return cache.remember(listCacheKey(params), COMPETITIONS_TTL_SECONDS, async () => {
      const [data, total] = await Promise.all([
        competitionsRepository.findMany(params),
        competitionsRepository.count(params),
      ]);
      return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
    });
  },

  async getById(id: string): Promise<Competition> {
    return cache.remember(cacheKeyCompetition(id), COMPETITIONS_TTL_SECONDS, async () => {
      const competition = await competitionsRepository.findById(id);
      if (!competition) throw new NotFoundError('Competição', id);
      return competition;
    });
  },

  /**
   * Mapeamento do portal (Entrega 2) — edições/maiores campeões/participantes
   * derivados das arestas WON do grafo (soft-delete respeitado via metadata).
   * Aditivo ao getById — nenhum contrato existente muda.
   *
   * T-24/25 — blocos ADITIVOS de insights (history/podium/totals) derivados das
   * linhas de CompetitionSeason + dissolvedAt do enriquecimento Wikidata.
   * Funções puras em `insights.ts`; nomes de clube resolvidos aqui (1 query de Club).
   */
  async getOverview(id: string): Promise<CompetitionOverviewWithInsights> {
    const competition = await this.getById(id); // 404 honesto se a competição não existe
    return cache.remember(`competitions:overview:${id}`, COMPETITIONS_TTL_SECONDS, async () => {
      const [edges, seasons] = await Promise.all([
        prisma.knowledgeGraph.findMany({
          where: { relation: 'WON', targetType: 'Competition', targetId: id },
          select: { sourceId: true, metadata: true },
        }),
        prisma.competitionSeason.findMany({
          where: { competitionId: id },
          select: {
            season: true,
            championId: true,
            runnerUpId: true,
            totalMatches: true,
            totalGoals: true,
            standings: true,
          },
          orderBy: { season: 'asc' },
        }),
      ]);
      const clubIds = [
        ...new Set([
          ...edges.map((e) => e.sourceId),
          ...seasons.flatMap((s) => [s.championId, s.runnerUpId]).filter((x): x is string => !!x),
        ]),
      ];
      const clubs = await prisma.club.findMany({
        where: { id: { in: clubIds }, deletedAt: null },
        select: { id: true, name: true, city: true, country: true },
      });
      const nameById = new Map(clubs.map((c) => [c.id, c.name]));
      const seasonInputs: SeasonRowInput[] = seasons.map((s) => ({
        season: s.season,
        championId: s.championId,
        championName: s.championId ? (nameById.get(s.championId) ?? null) : null,
        runnerUpId: s.runnerUpId,
        runnerUpName: s.runnerUpId ? (nameById.get(s.runnerUpId) ?? null) : null,
        totalMatches: s.totalMatches,
        totalGoals: s.totalGoals,
        standings: s.standings,
      }));
      return {
        ...buildCompetitionOverview(
          edges.map((e) => ({ sourceId: e.sourceId, metadata: e.metadata })),
          clubs,
        ),
        history: buildHistory(seasonInputs, competition.dissolvedAt ?? null),
        // 3º colocado só de tabela de LIGA — copa/grupos = null honesto (insights.ts).
        podium: buildPodium(seasonInputs, competition.type === 'LEAGUE'),
        totals: buildTotals(seasonInputs),
      };
    });
  },

  /** T508/T510 — temporadas da competição (classificação/artilheiro/campeão). */
  async getSeasons(id: string): Promise<unknown[]> {
    const competition = await this.getById(id); // 404 honesto
    // T-24/25 — third só derivável de tabela de liga (copa = fase de grupos).
    const isLeague = competition.type === 'LEAGUE';
    return cache.remember(`competitions:seasons:${id}`, COMPETITIONS_TTL_SECONDS, async () => {
      const seasons = await prisma.competitionSeason.findMany({
        where: { competitionId: id },
        select: {
          season: true,
          standings: true,
          topScorer: true,
          sourceUrl: true,
          championId: true,
          runnerUpId: true,
          totalMatches: true,
          totalGoals: true,
        },
        orderBy: { season: 'desc' },
      });
      // T510 — resolve os NOMES de campeão/vice (essencial para COPAS, onde a
      // classificação não tem posição 1 = campeão: o título vem da final).
      const clubIds = [
        ...new Set(
          seasons.flatMap((s) => [s.championId, s.runnerUpId]).filter((x): x is string => !!x),
        ),
      ];
      const clubs = clubIds.length
        ? await prisma.club.findMany({
            where: { id: { in: clubIds }, deletedAt: null },
            select: { id: true, name: true },
          })
        : [];
      const byId = new Map(clubs.map((c) => [c.id, c.name]));
      return seasons.map((s) => ({
        ...s,
        champion: s.championId ? { id: s.championId, name: byId.get(s.championId) ?? null } : null,
        runnerUp: s.runnerUpId ? { id: s.runnerUpId, name: byId.get(s.runnerUpId) ?? null } : null,
        // T-24/25 — 3º colocado quando a tabela é de liga (posições 1..N únicas).
        third: isLeague ? thirdFromStandings(s.standings) : null,
      }));
    });
  },

  async update(id: string, input: unknown): Promise<Competition> {
    const existing = await competitionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Competição', id);
    const parsed = CreateCompetitionSchema.partial().parse(input);
    const updated = await competitionsRepository.update(id, {
      name: parsed.name ?? existing.name,
      country: parsed.country ?? existing.country,
      type: parsed.type ?? existing.type,
    });
    await cache.invalidate(cacheKeyCompetition(id));
    await cache.invalidate('competitions:list:*');
    return updated;
  },

  async remove(id: string): Promise<void> {
    const existing = await competitionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Competição', id);
    await competitionsRepository.remove(id);
    await cache.invalidate(cacheKeyCompetition(id));
    await cache.invalidate('competitions:list:*');
  },
};
