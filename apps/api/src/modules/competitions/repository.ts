import { prisma } from '../../config/prisma.js';
import { searchMatchedIds, idsInCondition } from '../../lib/search.js';

// T448b-2i — busca case/acento-insensível (translate nativo, sem extensão).
async function searchCondition(search: string | undefined) {
  if (!search) return {};
  const ids = await searchMatchedIds(prisma, 'competitions', ['name'], search);
  return idsInCondition(ids);
}
import type { Competition } from '@almanaque/domain';

export interface ListCompetitionsParams {
  country?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const competitionsRepository = {
  async create(data: Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>): Promise<Competition> {
    return prisma.competition.create({ data: data as any }) as Promise<Competition>;
  },

  async findMany(params: ListCompetitionsParams = {}): Promise<Competition[]> {
    const { country, type, search, limit = 50, offset = 0 } = params;
    return prisma.competition.findMany({
      where: {
        AND: [
          country ? { country } : {},
          type ? { type: type as any } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
      orderBy: { name: 'asc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Competition[]>;
  },

  async count(params: ListCompetitionsParams = {}): Promise<number> {
    const { country, type, search } = params;
    return prisma.competition.count({
      where: {
        AND: [
          country ? { country } : {},
          type ? { type: type as any } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
    });
  },

  async findById(id: string): Promise<Competition | null> {
    return prisma.competition.findUnique({ where: { id } }) as Promise<Competition | null>;
  },

  async update(
    id: string,
    data: Partial<Omit<Competition, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Competition> {
    return prisma.competition.update({ where: { id }, data: data as any }) as Promise<Competition>;
  },

  async remove(id: string): Promise<void> {
    await prisma.competition.delete({ where: { id } });
  },
};
