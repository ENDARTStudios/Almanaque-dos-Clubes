import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import type { Ranking, RankingEntry } from '@almanaque/domain';

export interface ListRankingsParams {
  competitionId?: string;
  season?: string;
  /** T522 — 'club' (padrão) | 'player'. */
  type?: string;
  scope?: string;
  country?: string;
  published?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export const rankingsRepository = {
  async create(
    data: Omit<Ranking, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>,
  ): Promise<Ranking> {
    return prisma.ranking.create({ data }) as Promise<Ranking>;
  },

  async findMany(params: ListRankingsParams = {}): Promise<Ranking[]> {
    const {
      competitionId,
      season,
      type,
      scope,
      country,
      published,
      search,
      limit = 50,
      offset = 0,
    } = params;
    return prisma.ranking.findMany({
      where: {
        AND: [
          competitionId ? { competitionId } : {},
          type ? { type } : {},
          season ? { season } : {},
          scope ? { scope } : {},
          country ? { country } : {},
          published === true ? { publishedAt: { not: null } } : {},
          published === false ? { publishedAt: null } : {},
          search ? { name: { contains: search } } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Ranking[]>;
  },

  async count(params: ListRankingsParams = {}): Promise<number> {
    const { competitionId, season, scope, country, published, search } = params;
    return prisma.ranking.count({
      where: {
        AND: [
          competitionId ? { competitionId } : {},
          season ? { season } : {},
          scope ? { scope } : {},
          country ? { country } : {},
          published === true ? { publishedAt: { not: null } } : {},
          published === false ? { publishedAt: null } : {},
          search ? { name: { contains: search } } : {},
        ],
      },
    });
  },

  async findById(id: string): Promise<Ranking | null> {
    return prisma.ranking.findUnique({ where: { id } }) as Promise<Ranking | null>;
  },

  /**
   * T449c-v2 — mapa clube→(level, qid) a partir das entries dos rankings POR DIVISÃO (scope NULL)
   * de uma temporada nas competições dadas. Usado para enriquecer o agregado `country_pyramid`.
   */
  async findDivisionTierByClub(
    season: string,
    competitionQids: string[],
  ): Promise<
    Array<{ clubId: string; level: number | null; qid: string | null; points: number | null }>
  > {
    const rows = await prisma.rankingEntry.findMany({
      where: { ranking: { season, scope: null, competition: { qid: { in: competitionQids } } } },
      select: {
        clubId: true,
        points: true,
        ranking: { select: { competition: { select: { level: true, qid: true } } } },
      },
    });
    // T522 — `clubId` é nullable no schema (entradas de ranking de jogador); aqui só
    // interessam as entradas de clube.
    return rows
      .filter((r): r is typeof r & { clubId: string } => r.clubId !== null)
      .map((r) => ({
        clubId: r.clubId,
        level: r.ranking.competition?.level ?? null,
        qid: r.ranking.competition?.qid ?? null,
        points: r.points,
      }));
  },

  /** T449c-v1 — competições (com `level`) para enriquecer rankings (sem N+1). */
  async findCompetitionsByIds(
    ids: string[],
  ): Promise<Array<{ id: string; qid: string | null; name: string | null; level: number | null }>> {
    if (ids.length === 0) return [];
    return prisma.competition.findMany({
      where: { id: { in: ids } },
      select: { id: true, qid: true, name: true, level: true },
    });
  },

  async update(
    id: string,
    data: Partial<Omit<Ranking, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>>,
  ): Promise<Ranking> {
    return prisma.ranking.update({ where: { id }, data }) as Promise<Ranking>;
  },

  async remove(id: string): Promise<void> {
    await prisma.ranking.delete({ where: { id } });
  },

  async publish(id: string): Promise<Ranking> {
    return prisma.ranking.update({
      where: { id },
      data: { publishedAt: new Date() },
    }) as Promise<Ranking>;
  },

  async findEntries(rankingId: string): Promise<RankingEntry[]> {
    return prisma.rankingEntry.findMany({
      where: { rankingId },
      orderBy: { position: 'asc' },
    }) as Promise<RankingEntry[]>;
  },

  // --- T438 — leitura pública otimizada (cursor-based) ---

  /** Último Ranking publicado que casa com os filtros (ano/competição/escopo/país). */
  async findLatestPublished(
    filter: {
      season?: string;
      competitionId?: string;
      /** T521 — só o agregado GERAL (competitionId IS NULL). */
      globalOnly?: boolean;
      /** T522 — 'club' (padrão) | 'player'. */
      type?: string;
      scope?: string;
      country?: string;
    } = {},
  ): Promise<Ranking | null> {
    return prisma.ranking.findFirst({
      where: {
        publishedAt: { not: null },
        ...(filter.season ? { season: filter.season } : {}),
        // `globalOnly` filtra explicitamente o agregado geral (sem competição);
        // sem ele, `competitionId` ausente significa "qualquer competição".
        ...(filter.globalOnly
          ? { competitionId: null }
          : filter.competitionId
            ? { competitionId: filter.competitionId }
            : {}),
        // Default: ranking por competição/divisão (scope NULL). Só troca com `scope` explícito.
        ...(filter.scope ? { scope: filter.scope } : { scope: null }),
        type: filter.type ?? 'club',
        /**
         * T579 (ITEM 21) — `country` escolhe o RANKING, não só as linhas.
         *
         * A página mostra UM ranking por vez e o padrão é o mais recente publicado — medido:
         * o "Ranking 0-100 Serie A 2024-2025 — Masculino", 23 entradas, todas de clubes
         * italianos. Filtrar só as linhas faria o filtro "País" oferecer ES/GB/BR (países que
         * TÊM ranking no acervo) e devolver tabela vazia: filtro que não filtra. Com esta
         * condição, pedir `country=ES` carrega a publicação mais recente que TEM clube
         * espanhol ranqueado (medido: "Ranking 0-100 La Liga 2017-18", 23 entradas).
         *
         * Só vale quando o recorte NÃO foi fixado em uma competição: com competição
         * escolhida, o ranking é o dela e o país é uma INTERSEÇÃO explícita dos dois filtros
         * (a lista de países do select, nesse caso, já vem só com os daquela competição).
         *
         * O `country` do PRÓPRIO ranking (agregado de país, ex.: 'GB' na Pirâmide Inglesa)
         * continua valendo: o casamento é por país declarado OU por entrada de clube do país.
         */
        ...(filter.country && !filter.competitionId && !filter.globalOnly
          ? {
              OR: [
                { country: filter.country },
                {
                  entries: {
                    some: { position: { not: null }, club: { country: filter.country } },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    }) as Promise<Ranking | null>;
  },

  /** Entradas RANQUEADAS (position não-nula) em ordem de posição; cursor = última posição. */
  async findRankedEntries(params: {
    rankingId: string;
    cursorPosition?: number | null;
    limit: number;
    country?: string;
    state?: string;
    city?: string;
    gender?: string;
    /**
     * T579 — busca por nome do clube. O `<input>` "Buscar clube" de `/rankings` já mandava
     * `search` e a rota pública IGNORAVA o parâmetro: o campo parecia filtrar e só recarregava
     * a mesma tabela (a rota não lia `search`, o repositório não tinha o filtro). Agora vale.
     */
    search?: string;
  }) {
    const clubFilter = {
      ...(params.country ? { country: params.country } : {}),
      ...(params.state ? { state: params.state } : {}),
      ...(params.city ? { city: params.city } : {}),
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' as const } } : {}),
    };
    return prisma.rankingEntry.findMany({
      where: {
        rankingId: params.rankingId,
        position: {
          not: null,
          ...(params.cursorPosition ? { gt: params.cursorPosition } : {}),
        },
        ...(params.gender ? { gender: params.gender } : {}),
        ...(Object.keys(clubFilter).length > 0 ? { club: clubFilter } : {}),
      },
      orderBy: { position: 'asc' },
      take: params.limit,
      include: {
        club: { select: { id: true, name: true, country: true, state: true, city: true } },
        // T522 — entradas de ranking de jogador trazem o jogador (clubId é NULL).
        player: { select: { id: true, fullName: true } },
      },
    });
  },

  /**
   * T579 (ITEM 21) — PAÍSES com RANKING no recorte (facets do filtro "País" de `/rankings`).
   *
   * O defeito medido em produção: o `<select>` de país era montado no CLIENTE, com
   * `res.data.map(r => r.country)` — os países da PRIMEIRA PÁGINA da tabela (25 linhas). No
   * ranking que a página carrega por padrão ("Ranking 0-100 Serie A 2024-2025 — Masculino"),
   * 23 das 25 linhas são `IT` e 2 são nulas ⇒ a lista saía com UM país. E não era só a
   * página: medido no banco, aquele ranking tem 23 entradas e TODAS italianas — a lista
   * "só IT" tinha duas causas somadas, a paginação e o recorte ser nacional.
   *
   * A lista de países do recorte é FACET: sai do conjunto filtrado inteiro, não da página.
   * Aqui ela agrega por `Club.country` (a MESMA coluna que a consulta de entradas filtra —
   * contar por outra daria números que não batem com o clique) sobre TODAS as publicações
   * que casam com o recorte (ano, tipo, escopo e, se houver, competição). Com isso o filtro
   * passa a oferecer os países que de fato têm ranking: medido, sem o filtro de ano o recorte
   * de clubes dá 58 países (AD…ZA) — contra o `IT` único que a versão anterior oferecia.
   */
  async findCountriesInScope(params: {
    season?: string;
    competitionId?: string;
    globalOnly?: boolean;
    type?: string;
    scope?: string;
    gender?: string;
    state?: string;
    city?: string;
  }): Promise<string[]> {
    const rows = await prisma.rankingEntry.findMany({
      where: {
        position: { not: null },
        ...(params.gender ? { gender: params.gender } : {}),
        club: {
          country: { not: null },
          ...(params.state ? { state: params.state } : {}),
          ...(params.city ? { city: params.city } : {}),
        },
        ranking: {
          publishedAt: { not: null },
          type: params.type ?? 'club',
          ...(params.season ? { season: params.season } : {}),
          // `globalOnly` = o agregado GERAL (competitionId NULL) — mesmo sentinela do T521.
          ...(params.globalOnly
            ? { competitionId: null }
            : params.competitionId
              ? { competitionId: params.competitionId }
              : {}),
          // Default: rankings por competição/divisão (scope NULL), como em `findLatestPublished`.
          ...(params.scope ? { scope: params.scope } : { scope: null }),
        },
      },
      select: { club: { select: { country: true } } },
    });
    const codes = new Set<string>();
    for (const row of rows) {
      const country = row.club?.country;
      if (country) codes.add(country.toUpperCase());
    }
    return [...codes].sort((a, b) => a.localeCompare(b));
  },

  async clubExists(clubId: string): Promise<boolean> {
    const c = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
    return c !== null;
  },

  /** Histórico de rankings de um clube (entradas publicadas, mais recente primeiro). */
  async findClubHistory(clubId: string, year?: string) {
    return prisma.rankingEntry.findMany({
      where: {
        clubId,
        position: { not: null },
        ranking: {
          publishedAt: { not: null },
          ...(year ? { season: year } : {}),
        },
      },
      orderBy: [{ ranking: { season: 'desc' } }, { ranking: { publishedAt: 'desc' } }],
      include: {
        club: { select: { id: true, name: true } },
        ranking: {
          select: { id: true, name: true, season: true, competitionId: true, publishedAt: true },
        },
      },
    });
  },

  async addEntry(data: Prisma.RankingEntryUncheckedCreateInput): Promise<RankingEntry> {
    return prisma.rankingEntry.create({ data }) as Promise<RankingEntry>;
  },

  async updateEntry(
    id: string,
    data: Prisma.RankingEntryUncheckedUpdateInput,
  ): Promise<RankingEntry> {
    return prisma.rankingEntry.update({ where: { id }, data }) as Promise<RankingEntry>;
  },

  async removeEntry(id: string): Promise<void> {
    await prisma.rankingEntry.delete({ where: { id } });
  },
};
