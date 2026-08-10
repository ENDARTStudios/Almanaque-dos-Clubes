import { CreateSeasonSchema, NotFoundError, type Season } from '@almanaque/domain';
import { seasonsRepository, type ListSeasonsParams } from './repository.js';

export const seasonsService = {
  async create(input: unknown): Promise<Season> {
    const parsed = CreateSeasonSchema.parse(input);
    return seasonsRepository.create({
      name: parsed.name,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      status: parsed.status,
    });
  },
  async list(params: ListSeasonsParams) {
    const [data, total] = await Promise.all([
      seasonsRepository.findMany(params),
      seasonsRepository.count(params),
    ]);
    return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
  },
  async getById(id: string): Promise<Season> {
    const season = await seasonsRepository.findById(id);
    if (!season) throw new NotFoundError('Temporada', id);
    return season;
  },
  async update(id: string, input: unknown): Promise<Season> {
    const existing = await seasonsRepository.findById(id);
    if (!existing) throw new NotFoundError('Temporada', id);
    const parsed = CreateSeasonSchema.partial().parse(input);
    return seasonsRepository.update(id, {
      name: parsed.name ?? existing.name,
      startDate: parsed.startDate ? new Date(parsed.startDate) : existing.startDate,
      endDate: parsed.endDate ? new Date(parsed.endDate) : existing.endDate,
      status: parsed.status ?? existing.status,
    });
  },
  async remove(id: string): Promise<void> {
    const existing = await seasonsRepository.findById(id);
    if (!existing) throw new NotFoundError('Temporada', id);
    await seasonsRepository.remove(id);
  },
};
