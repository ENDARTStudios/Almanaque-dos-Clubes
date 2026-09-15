import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import type { Ranking, RankingEntry } from '@almanaque/domain';

export interface ListRankingsParams {
  competitionId?: string;
  season?: string;
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
    const { competitionId, season, published, search, limit = 50, offset = 0 } = params;
    return prisma.ranking.findMany({
      where: {
        AND: [
          competitionId ? { competitionId } : {},
          season ? { season } : {},
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
    const { competitionId, season, published, search } = params;
    return prisma.ranking.count({
      where: {
        AND: [
          competitionId ? { competitionId } : {},
          season ? { season } : {},
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

  /** Último Ranking publicado que casa com os filtros (ano/competição). */
  async findLatestPublished(
    filter: { season?: string; competitionId?: string } = {},
  ): Promise<Ranking | null> {
    return prisma.ranking.findFirst({
      where: {
        publishedAt: { not: null },
        ...(filter.season ? { season: filter.season } : {}),
        ...(filter.competitionId ? { competitionId: filter.competitionId } : {}),
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
  }) {
    return prisma.rankingEntry.findMany({
      where: {
        rankingId: params.rankingId,
        position: {
          not: null,
          ...(params.cursorPosition ? { gt: params.cursorPosition } : {}),
        },
        ...(params.gender ? { gender: params.gender } : {}),
        ...(params.country || params.state || params.city
          ? {
              club: {
                ...(params.country ? { country: params.country } : {}),
                ...(params.state ? { state: params.state } : {}),
                ...(params.city ? { city: params.city } : {}),
              },
            }
          : {}),
      },
      orderBy: { position: 'asc' },
      take: params.limit,
      include: {
        club: { select: { id: true, name: true, country: true, state: true, city: true } },
      },
    });
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
