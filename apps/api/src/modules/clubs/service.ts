/**
 * Camada de serviço — regras de negócio.
 * Não conhece Fastify; recebe e retorna entidades de domínio.
 */
import {
  CreateClubSchema,
  ConflictError,
  type Club,
  type CreateClubInput,
} from '@almanaque/domain';
import { clubsRepository, type ListClubsParams } from './repository.js';
import { cache } from '../../services/cache.js';

const CLUBS_LIST_TTL_SECONDS = 60;
const CLUBS_BY_ID_TTL_SECONDS = 300;

function listCacheKey(params: ListClubsParams): string {
  return `clubs:list:${JSON.stringify(params)}`;
}

export const clubsService = {
  async create(input: unknown): Promise<Club> {
    // 1. Validação de entrada (Zod)
    const parsed = CreateClubSchema.parse(input);

    // 2. Regra de negócio: unicidade (name, country)
    if (await clubsRepository.existsByName(parsed.name, parsed.country)) {
      throw new ConflictError(
        `Já existe um clube com nome "${parsed.name}" no país ${parsed.country ?? '(sem país)'}`,
      );
    }

    // 3. Persistência
    const club = await clubsRepository.create({
      name: parsed.name,
      fullName: parsed.fullName ?? null,
      shortName: parsed.shortName ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      country: parsed.country ?? null,
      foundedYear: parsed.foundedYear ?? null,
      status: parsed.status,
      primaryColor: parsed.primaryColor ?? null,
      website: parsed.website ?? null,
    });

    // 4. Invalida cache de listagens (escrita invalida — item 6.3)
    await cache.invalidate('clubs:list:*');
    return club;
  },

  async list(
    params: ListClubsParams,
  ): Promise<{ data: Club[]; total: number; limit: number; offset: number }> {
    return cache.remember(listCacheKey(params), CLUBS_LIST_TTL_SECONDS, async () => {
      const [data, total] = await Promise.all([
        clubsRepository.findMany(params),
        clubsRepository.count(params),
      ]);
      return {
        data,
        total,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
    });
  },

  async getById(id: string): Promise<Club | null> {
    return cache.remember(`clubs:byId:${id}`, CLUBS_BY_ID_TTL_SECONDS, () =>
      clubsRepository.findById(id),
    );
  },
};

// Reexporta o schema para uso nos controllers
export { CreateClubSchema };
export type { CreateClubInput };
