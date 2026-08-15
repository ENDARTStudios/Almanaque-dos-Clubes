import { CreatePlayerSchema, NotFoundError, type Player } from '@almanaque/domain';
import { playersRepository, type ListPlayersParams } from './repository.js';

export const playersService = {
  async create(input: unknown): Promise<Player> {
    const parsed = CreatePlayerSchema.parse(input);
    return playersRepository.create({
      fullName: parsed.fullName,
      shortName: parsed.shortName ?? null,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
      country: parsed.country ?? null,
      position: parsed.position ?? null,
      clubId: parsed.clubId ?? null,
      qid: parsed.qid ?? null,
      importedFrom: parsed.importedFrom ?? null,
      importedAt: null,
    });
  },

  async list(
    params: ListPlayersParams,
  ): Promise<{ data: Player[]; total: number; limit: number; offset: number }> {
    const [data, total] = await Promise.all([
      playersRepository.findMany(params),
      playersRepository.count(params),
    ]);
    return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
  },

  async getById(id: string): Promise<Player> {
    const player = await playersRepository.findById(id);
    if (!player) throw new NotFoundError('Jogador', id);
    return player;
  },

  async update(id: string, input: unknown): Promise<Player> {
    const existing = await playersRepository.findById(id);
    if (!existing) throw new NotFoundError('Jogador', id);
    const parsed = CreatePlayerSchema.partial().parse(input);
    return playersRepository.update(id, {
      fullName: parsed.fullName ?? existing.fullName,
      shortName: parsed.shortName ?? existing.shortName,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : existing.birthDate,
      country: parsed.country ?? existing.country,
      position: parsed.position ?? existing.position,
      clubId: parsed.clubId ?? existing.clubId,
    });
  },

  async remove(id: string): Promise<void> {
    const existing = await playersRepository.findById(id);
    if (!existing) throw new NotFoundError('Jogador', id);
    await playersRepository.remove(id);
  },
};
