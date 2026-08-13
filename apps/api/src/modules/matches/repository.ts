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
    const {
      homeClubId,
      awayClubId,
      competitionId,
      seasonId,
      status,
      limit = 50,
      offset = 0,
    } = params;
    return prisma.match.findMany({
      where: {
        AND: [
          homeClubId ? { homeClubId } : {},
          awayClubId ? { awayClubId } : {},
          competitionId ? { competitionId } : {},
          seasonId ? { seasonId } : {},
          status ? { status: status as any } : {},
        ].filter(Boolean),
      },
      orderBy: { date: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Match[]>;
  },
  async count(params: ListMatchesParams = {}): Promise<number> {
    const { homeClubId, awayClubId, competitionId, seasonId, status } = params;
    return prisma.match.count({
      where: {
        AND: [
          homeClubId ? { homeClubId } : {},
          awayClubId ? { awayClubId } : {},
          competitionId ? { competitionId } : {},
          seasonId ? { seasonId } : {},
          status ? { status: status as any } : {},
        ].filter(Boolean),
      },
    });
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
