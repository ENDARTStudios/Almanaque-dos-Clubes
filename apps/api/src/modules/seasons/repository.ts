import { prisma } from '../../config/prisma.js';
import type { Season } from '@almanaque/domain';

export interface ListSeasonsParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const seasonsRepository = {
  async create(data: Omit<Season, 'id' | 'createdAt' | 'updatedAt'>): Promise<Season> {
    return prisma.season.create({ data: data as any }) as Promise<Season>;
  },
  async findMany(params: ListSeasonsParams = {}): Promise<Season[]> {
    const { status, search, limit = 50, offset = 0 } = params;
    return prisma.season.findMany({
      where: {
        AND: [
          status ? { status: status as any } : {},
          search ? { name: { contains: search } } : {},
        ],
      },
      orderBy: { startDate: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Season[]>;
  },
  async count(params: ListSeasonsParams = {}): Promise<number> {
    const { status, search } = params;
    return prisma.season.count({
      where: {
        AND: [
          status ? { status: status as any } : {},
          search ? { name: { contains: search } } : {},
        ],
      },
    });
  },
  async findById(id: string): Promise<Season | null> {
    return prisma.season.findUnique({ where: { id } }) as Promise<Season | null>;
  },
  async update(
    id: string,
    data: Partial<Omit<Season, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Season> {
    return prisma.season.update({ where: { id }, data: data as any }) as Promise<Season>;
  },
  async remove(id: string): Promise<void> {
    await prisma.season.delete({ where: { id } });
  },
};
