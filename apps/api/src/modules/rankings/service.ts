import {
  CreateRankingSchema,
  UpdateRankingSchema,
  CreateRankingEntrySchema,
  UpdateRankingEntrySchema,
  NotFoundError,
  ConflictError,
  type Ranking,
  type RankingEntry,
} from '@almanaque/domain';
import { rankingsRepository, type ListRankingsParams } from './repository.js';
import { cache } from '../../services/cache.js';

const RANKING_TTL_SECONDS = 60 * 60; // 1h (rankings publicados são imutáveis)

function rankCacheKey(id: string): string {
  return `rankings:id:${id}`;
}

function listCacheKey(params: ListRankingsParams): string {
  return `rankings:list:${JSON.stringify(params)}`;
}

export const rankingsService = {
  async create(input: unknown): Promise<Ranking> {
    const parsed = CreateRankingSchema.parse(input);
    const ranking = await rankingsRepository.create({
      name: parsed.name,
      competitionId: parsed.competitionId ?? null,
      season: parsed.season ?? null,
    });
    await cache.invalidate('rankings:list:*');
    return ranking;
  },

  async list(
    params: ListRankingsParams,
  ): Promise<{ data: Ranking[]; total: number; limit: number; offset: number }> {
    return cache.remember(listCacheKey(params), RANKING_TTL_SECONDS, async () => {
      const [data, total] = await Promise.all([
        rankingsRepository.findMany(params),
        rankingsRepository.count(params),
      ]);
      return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
    });
  },

  async getById(id: string): Promise<Ranking> {
    return cache.remember(rankCacheKey(id), RANKING_TTL_SECONDS, async () => {
      const ranking = await rankingsRepository.findById(id);
      if (!ranking) throw new NotFoundError('Ranking', id);
      return ranking;
    });
  },

  async update(id: string, input: unknown): Promise<Ranking> {
    const ranking = await rankingsRepository.findById(id);
    if (!ranking) throw new NotFoundError('Ranking', id);
    if (ranking.publishedAt) throw new ConflictError('Ranking já publicado — não pode ser editado');
    const parsed = UpdateRankingSchema.parse(input);
    const updated = await rankingsRepository.update(id, {
      name: parsed.name ?? ranking.name,
      competitionId: parsed.competitionId ?? ranking.competitionId,
      season: parsed.season ?? ranking.season,
    });
    await cache.invalidate(rankCacheKey(id));
    await cache.invalidate('rankings:list:*');
    return updated;
  },

  async remove(id: string): Promise<void> {
    const ranking = await rankingsRepository.findById(id);
    if (!ranking) throw new NotFoundError('Ranking', id);
    if (ranking.publishedAt)
      throw new ConflictError('Ranking já publicado — não pode ser removido');
    await rankingsRepository.remove(id);
    await cache.invalidate(rankCacheKey(id));
    await cache.invalidate('rankings:list:*');
  },

  async publish(id: string): Promise<Ranking> {
    const ranking = await rankingsRepository.findById(id);
    if (!ranking) throw new NotFoundError('Ranking', id);
    if (ranking.publishedAt) throw new ConflictError('Ranking já está publicado');
    const published = await rankingsRepository.publish(id);
    await cache.invalidate(rankCacheKey(id));
    await cache.invalidate('rankings:list:*');
    return published;
  },

  async getEntries(rankingId: string): Promise<RankingEntry[]> {
    const ranking = await rankingsRepository.findById(rankingId);
    if (!ranking) throw new NotFoundError('Ranking', rankingId);
    return rankingsRepository.findEntries(rankingId);
  },

  async addEntry(rankingId: string, input: unknown): Promise<RankingEntry> {
    const ranking = await rankingsRepository.findById(rankingId);
    if (!ranking) throw new NotFoundError('Ranking', rankingId);
    if (ranking.publishedAt) throw new ConflictError('Ranking já publicado');
    const parsed = CreateRankingEntrySchema.parse(input);
    return rankingsRepository.addEntry({
      rankingId,
      clubId: parsed.clubId,
      position: parsed.position,
      points: parsed.points ?? null,
    });
  },

  async updateEntry(rankingId: string, entryId: string, input: unknown): Promise<RankingEntry> {
    const ranking = await rankingsRepository.findById(rankingId);
    if (!ranking) throw new NotFoundError('Ranking', rankingId);
    if (ranking.publishedAt) throw new ConflictError('Ranking já publicado');
    const parsed = UpdateRankingEntrySchema.parse(input);
    return rankingsRepository.updateEntry(entryId, {
      position: parsed.position,
      points: parsed.points,
    });
  },

  async removeEntry(rankingId: string, entryId: string): Promise<void> {
    const ranking = await rankingsRepository.findById(rankingId);
    if (!ranking) throw new NotFoundError('Ranking', rankingId);
    if (ranking.publishedAt) throw new ConflictError('Ranking já publicado');
    await rankingsRepository.removeEntry(entryId);
  },
};
