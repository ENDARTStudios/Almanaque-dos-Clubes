import { CreateMatchSchema, NotFoundError, type Match } from '@almanaque/domain';
import { matchesRepository, type ListMatchesParams } from './repository.js';

export const matchesService = {
  async create(input: unknown): Promise<Match> {
    const parsed = CreateMatchSchema.parse(input);
    return matchesRepository.create({
      homeClubId: parsed.homeClubId,
      awayClubId: parsed.awayClubId,
      date: new Date(parsed.date),
      competitionId: parsed.competitionId ?? null,
      seasonId: parsed.seasonId ?? null,
      homeScore: parsed.homeScore ?? null,
      awayScore: parsed.awayScore ?? null,
      round: parsed.round ?? null,
      venue: parsed.venue ?? null,
      status: parsed.status,
    });
  },
  async list(params: ListMatchesParams) {
    const [data, total] = await Promise.all([
      matchesRepository.findMany(params),
      matchesRepository.count(params),
    ]);
    return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
  },
  async getById(id: string): Promise<Match> {
    const match = await matchesRepository.findById(id);
    if (!match) throw new NotFoundError('Partida', id);
    return match;
  },
  async update(id: string, input: unknown): Promise<Match> {
    const existing = await matchesRepository.findById(id);
    if (!existing) throw new NotFoundError('Partida', id);
    const parsed = CreateMatchSchema.partial().parse(input);
    return matchesRepository.update(id, {
      homeClubId: parsed.homeClubId ?? existing.homeClubId,
      awayClubId: parsed.awayClubId ?? existing.awayClubId,
      date: parsed.date ? new Date(parsed.date) : existing.date,
      competitionId: parsed.competitionId ?? existing.competitionId,
      seasonId: parsed.seasonId ?? existing.seasonId,
      homeScore: parsed.homeScore ?? existing.homeScore,
      awayScore: parsed.awayScore ?? existing.awayScore,
      round: parsed.round ?? existing.round,
      venue: parsed.venue ?? existing.venue,
      status: parsed.status ?? existing.status,
    });
  },
  async remove(id: string): Promise<void> {
    const existing = await matchesRepository.findById(id);
    if (!existing) throw new NotFoundError('Partida', id);
    await matchesRepository.remove(id);
  },
};
