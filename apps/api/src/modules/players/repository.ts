import { prisma } from '../../config/prisma.js';
import { searchMatchedIds, idsInCondition } from '../../lib/search.js';

// T448b-2i — busca case/acento-insensível (translate nativo, sem extensão).
async function searchCondition(search: string | undefined) {
  if (!search) return {};
  const ids = await searchMatchedIds(prisma, 'players', ['fullName'], search);
  return idsInCondition(ids);
}
import type { Player } from '@almanaque/domain';

export interface ListPlayersParams {
  country?: string;
  position?: string;
  clubId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const playersRepository = {
  async create(data: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    return prisma.player.create({ data }) as Promise<Player>;
  },

  async findMany(params: ListPlayersParams = {}): Promise<Player[]> {
    const { country, position, clubId, search, limit = 50, offset = 0 } = params;
    return prisma.player.findMany({
      where: {
        AND: [
          country ? { country } : {},
          position ? { position } : {},
          clubId ? { clubId } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
      orderBy: { fullName: 'asc' },
      take: Math.min(limit, 100),
      skip: offset,
    }) as Promise<Player[]>;
  },

  async count(params: ListPlayersParams = {}): Promise<number> {
    const { country, position, clubId, search } = params;
    return prisma.player.count({
      where: {
        AND: [
          country ? { country } : {},
          position ? { position } : {},
          clubId ? { clubId } : {},
          ...(search ? [await searchCondition(search)] : []),
        ],
      },
    });
  },

  async findById(id: string): Promise<Player | null> {
    return prisma.player.findUnique({ where: { id } }) as Promise<Player | null>;
  },

  async update(
    id: string,
    data: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Player> {
    return prisma.player.update({ where: { id }, data }) as Promise<Player>;
  },

  async remove(id: string): Promise<void> {
    await prisma.player.delete({ where: { id } });
  },
};
