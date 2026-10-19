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
import {
  buildRecords,
  buildRoundEvolution,
  buildTable,
  championsBySeason,
  positionChanges,
} from './match-stats.js';

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
  /**
   * T30/T33 — histórico derivado das PARTIDAS: tabela de pontos corridos, recordes e campeões.
   *
   * `truncated` existe porque a resposta é limitada em 20 mil partidas: se o acervo crescer
   * além disso, a tabela parcial estaria SILENCIOSAMENTE errada. Declarar o corte é a diferença
   * entre "não temos tudo" e "temos e está certo".
   */
  async getMatchHistory(id: string): Promise<unknown> {
    await this.getById(id); // 404 honesto
    const partidas = await competitionsRepository.findMatches(id);
    const comTemporada = partidas.map((m) => ({
      date: m.date,
      season: m.seasonLabel ?? '',
      round: m.round,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    }));

    const tabela = buildTable(comTemporada);
    const records = buildRecords(comTemporada);
    const campeoes = championsBySeason(comTemporada);

    const ids = new Set<string>();
    for (const r of tabela) ids.add(r.clubId);
    for (const c of campeoes) ids.add(c.clubId);
    if (records.biggestWin) {
      ids.add(records.biggestWin.winnerClubId);
      ids.add(records.biggestWin.loserClubId);
      ids.add(records.biggestWin.homeClubId);
      ids.add(records.biggestWin.awayClubId);
    }
    if (records.highestScoring) {
      ids.add(records.highestScoring.homeClubId);
      ids.add(records.highestScoring.awayClubId);
    }
    const nomes = await competitionsRepository.findClubNames([...ids]);
    const nome = (clubId: string) => nomes.get(clubId)?.name ?? null;

    return {
      table: tabela.map((r) => ({ ...r, clubName: nome(r.clubId) })),
      records: {
        ...records,
        biggestWin: records.biggestWin
          ? {
              ...records.biggestWin,
              homeClubName: nome(records.biggestWin.homeClubId),
              awayClubName: nome(records.biggestWin.awayClubId),
              winnerName: nome(records.biggestWin.winnerClubId),
              loserName: nome(records.biggestWin.loserClubId),
            }
          : null,
        highestScoring: records.highestScoring
          ? {
              ...records.highestScoring,
              homeClubName: nome(records.highestScoring.homeClubId),
              awayClubName: nome(records.highestScoring.awayClubId),
            }
          : null,
      },
      champions: campeoes.map((c) => ({ ...c, clubName: nome(c.clubId) })),
      seasons: [...new Set(comTemporada.map((m) => m.season).filter(Boolean))].sort(),
      rounds: [...new Set(comTemporada.map((m) => m.round).filter((r): r is string => !!r))].length,
      matchesUsed: comTemporada.length,
      truncated: partidas.length >= 20000,
      pointsPerWin: 3,
      pointsRuleNote:
        'Vitória = 3 pontos. Vale para todas as partidas deste acervo (2015 em diante); ' +
        'competições anteriores a 1995 usavam 2, e somar as duas eras com a mesma régua ' +
        'produziria um total que nunca existiu.',
    };
  },

  /**
   * T31 — classificação rodada a rodada de UMA temporada (quem subiu e caiu jogo a jogo).
   *
   * A temporada é obrigatória: misturar temporadas na mesma evolução produziria uma
   * classificação que nunca existiu em campo — clubes de anos diferentes na mesma tabela.
   */
  async getSeasonRounds(id: string, season: string): Promise<unknown> {
    await this.getById(id);
    const partidas = await competitionsRepository.findMatches(id);
    const daTemporada = partidas
      .filter((m) => (m.seasonLabel ?? '') === season)
      .map((m) => ({
        date: m.date,
        season: m.seasonLabel ?? '',
        round: m.round,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      }));

    const evolucao = buildRoundEvolution(daTemporada);
    const ids = new Set<string>();
    for (const r of evolucao) for (const linha of r.table) ids.add(linha.clubId);
    const nomes = await competitionsRepository.findClubNames([...ids]);

    /* `positionChange` calculado aqui, entre rodadas consecutivas: é o dado que a interface
       desenha (subiu/caiu). Deixar a conta para o cliente permitiria que duas telas
       discordassem sobre a mesma variação. */
    let anterior: (typeof evolucao)[number]['table'] = [];
    const rounds = evolucao.map((r) => {
      const mudancas = positionChanges(anterior, r.table);
      anterior = r.table;
      return {
        round: r.round,
        roundNumber: r.roundNumber,
        matchesInRound: r.matchesInRound,
        table: r.table.map((linha) => ({
          ...linha,
          clubName: nomes.get(linha.clubId)?.name ?? null,
          positionChange: mudancas.get(linha.clubId) ?? null,
        })),
      };
    });

    return { season, rounds, matchesUsed: daTemporada.length };
  },

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
