import { CreateCompetitionSchema, NotFoundError, type Competition } from '@almanaque/domain';
import { competitionsRepository, type ListCompetitionsParams } from './repository.js';

export const competitionsService = {
  async create(input: unknown): Promise<Competition> {
    const parsed = CreateCompetitionSchema.parse(input);
    return competitionsRepository.create({
      name: parsed.name,
      country: parsed.country ?? null,
      type: parsed.type ?? null,
    });
  },

  async list(
    params: ListCompetitionsParams,
  ): Promise<{ data: Competition[]; total: number; limit: number; offset: number }> {
    const [data, total] = await Promise.all([
      competitionsRepository.findMany(params),
      competitionsRepository.count(params),
    ]);
    return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
  },

  async getById(id: string): Promise<Competition> {
    const competition = await competitionsRepository.findById(id);
    if (!competition) throw new NotFoundError('Competição', id);
    return competition;
  },

  async update(id: string, input: unknown): Promise<Competition> {
    const existing = await competitionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Competição', id);
    const parsed = CreateCompetitionSchema.partial().parse(input);
    return competitionsRepository.update(id, {
      name: parsed.name ?? existing.name,
      country: parsed.country ?? existing.country,
      type: parsed.type ?? existing.type,
    });
  },

  async remove(id: string): Promise<void> {
    const existing = await competitionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Competição', id);
    await competitionsRepository.remove(id);
  },
};
