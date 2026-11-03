import { NotFoundError } from '@almanaque/domain';
import { stadiumsRepository, type ListStadiumsParams, type StadiumRow } from './repository.js';

/**
 * ESTÁDIOS — serviço de leitura.
 *
 * O serviço não decide nada além de paginação e do erro de não-encontrado: a regra de negócio
 * aqui é "o que está no banco", e inventar camada sobre isso só criaria divergência.
 */
export const stadiumsService = {
  async list(params: ListStadiumsParams): Promise<{
    data: StadiumRow[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const [data, total] = await Promise.all([
      stadiumsRepository.findMany(params),
      stadiumsRepository.count(params),
    ]);
    return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
  },

  async getById(id: string): Promise<StadiumRow> {
    const estadio = await stadiumsRepository.findById(id);
    if (!estadio) throw new NotFoundError('Estádio', id);
    return estadio;
  },

  async countries(): Promise<Array<{ code: string; count: number }>> {
    return stadiumsRepository.countries();
  },
};
