/**
 * Camada de repositório — isolamento das chamadas Prisma.
 * Facilita mocks em testes e troca futura de ORM.
 */
import { prisma } from '../../config/prisma.js';
import type { Club } from '@almanaque/domain';

export interface ListClubsParams {
  country?: string;
  hasCoordinates?: boolean;
  city?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const clubsRepository = {
  async create(data: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<Club> {
    return prisma.club.create({ data: data as any }) as Promise<Club>;
  },

  async findMany(params: ListClubsParams = {}): Promise<Club[]> {
    const { country, city, status, search, hasCoordinates, limit = 50, offset = 0 } = params;

    return prisma.club.findMany({
      where: {
        AND: [
          country ? { country } : {},
          city ? { city } : {},
          status ? { status: status as never } : {},
          hasCoordinates ? { latitude: { not: null } } : {},
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { fullName: { contains: search } },
                  { shortName: { contains: search } },
                ],
              }
            : {},
        ],
      },
      orderBy: { name: 'asc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Club[]>;
  },

  async count(params: ListClubsParams = {}): Promise<number> {
    const { country, city, status, search, hasCoordinates } = params;
    return prisma.club.count({
      where: {
        AND: [
          country ? { country } : {},
          city ? { city } : {},
          status ? { status: status as never } : {},
          hasCoordinates ? { latitude: { not: null } } : {},
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { fullName: { contains: search } },
                  { shortName: { contains: search } },
                ],
              }
            : {},
        ],
      },
    });
  },

  async findById(id: string): Promise<Club | null> {
    return prisma.club.findUnique({ where: { id } }) as Promise<Club | null>;
  },

  async existsByName(name: string, country?: string): Promise<boolean> {
    const count = await prisma.club.count({
      where: { name, country: country ?? null },
    });
    return count > 0;
  },
};
