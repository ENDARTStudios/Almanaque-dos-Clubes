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
import { resolveCompetitionTier } from '../../lib/rankings/tiers/resolve-tier.js';

/** T449c-v1 — visão aditiva de tier/divisão de uma competição (nunca quebra contrato). */
export interface CompetitionTierPayload {
  id: string;
  qid: string | null;
  name: string | null;
  level: number | null;
  divisionLabel: string | null;
  tierSource: string | null;
  tierVersion: string | null;
}

function toCompetitionTier(c: {
  id: string;
  qid: string | null;
  name: string | null;
  level: number | null;
}): CompetitionTierPayload {
  const t = resolveCompetitionTier(c);
  return {
    id: c.id,
    qid: c.qid,
    name: c.name,
    level: t.level,
    divisionLabel: t.divisionLabel,
    tierSource: t.tierSource,
    tierVersion: t.tierVersion,
  };
}

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

  async list(params: ListRankingsParams): Promise<{
    data: Array<Ranking & { competition: CompetitionTierPayload | null }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    return cache.remember(listCacheKey(params), RANKING_TTL_SECONDS, async () => {
      const [data, total] = await Promise.all([
        rankingsRepository.findMany(params),
        rankingsRepository.count(params),
      ]);
      const compIds = [...new Set(data.map((r) => r.competitionId).filter(Boolean))] as string[];
      const comps = await rankingsRepository.findCompetitionsByIds(compIds);
      const byId = new Map(comps.map((c) => [c.id, c]));
      const enriched = data.map((r) => {
        const comp = r.competitionId ? byId.get(r.competitionId) : undefined;
        return { ...r, competition: comp ? toCompetitionTier(comp) : null };
      });
      return { data: enriched, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
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

  async getEntries(rankingId: string): Promise<{
    data: RankingEntry[];
    competition: CompetitionTierPayload | null;
  }> {
    const ranking = await rankingsRepository.findById(rankingId);
    if (!ranking) throw new NotFoundError('Ranking', rankingId);
    const entries = await rankingsRepository.findEntries(rankingId);
    const comp = ranking.competitionId
      ? ((await rankingsRepository.findCompetitionsByIds([ranking.competitionId]))[0] ?? null)
      : null;
    return { data: entries, competition: comp ? toCompetitionTier(comp) : null };
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

  // --- T438 — leitura pública otimizada (cursor-based) ---

  /**
   * Entradas ranqueadas do último ranking publicado que casa com os filtros.
   * Cursor = última `position` recebida (position é única por ranking).
   * Só entradas COM posição (dados suficientes) — registros NULL ficam fora
   * da listagem pública (princípio 1.3: não publicar não-ranqueado).
   */
  async getLatestRankedEntries(params: {
    year?: string;
    competitionId?: string;
    scope?: string;
    gender?: string;
    country?: string;
    state?: string;
    city?: string;
    limit: number;
    cursor?: number | null;
  }): Promise<{
    ranking: {
      id: string;
      name: string;
      season: string | null;
      competitionId: string | null;
      competition: CompetitionTierPayload | null;
      scope: string | null;
      country: string | null;
      tierVersion: string | null;
      formulaVersion: string | null;
    } | null;
    data: Array<{
      position: number | null;
      points: number | null;
      clubId: string;
      clubName: string;
      country: string | null;
      state: string | null;
      city: string | null;
      baseMatches: number | null;
      baseTitles: number | null;
      gender: string | null;
    }>;
    cursor: number | null;
  }> {
    const ranking = await rankingsRepository.findLatestPublished({
      season: params.year,
      competitionId: params.competitionId,
      scope: params.scope,
    });
    if (!ranking) return { ranking: null, data: [], cursor: null };
    const entries = await rankingsRepository.findRankedEntries({
      rankingId: ranking.id,
      cursorPosition: params.cursor ?? null,
      limit: params.limit,
      country: params.country,
      state: params.state,
      city: params.city,
      gender: params.gender,
    });
    const comp = ranking.competitionId
      ? ((await rankingsRepository.findCompetitionsByIds([ranking.competitionId]))[0] ?? null)
      : null;
    return {
      ranking: {
        id: ranking.id,
        name: ranking.name,
        season: ranking.season,
        competitionId: ranking.competitionId,
        competition: comp ? toCompetitionTier(comp) : null,
        scope: ranking.scope ?? null,
        country: ranking.country ?? null,
        tierVersion: ranking.tierVersion ?? null,
        formulaVersion: ranking.formulaVersion ?? null,
      },
      data: entries.map((e) => ({
        position: e.position,
        points: e.points,
        clubId: e.club.id,
        clubName: e.club.name,
        country: e.club.country,
        state: e.club.state,
        city: e.club.city,
        baseMatches: e.baseMatches,
        baseTitles: e.baseTitles,
        gender: e.gender,
      })),
      cursor: entries.length > 0 ? entries[entries.length - 1].position : null,
    };
  },

  /** Histórico de rankings publicados de um clube (404 se o clube não existe). */
  async getClubHistory(
    clubId: string,
    year?: string,
  ): Promise<{
    club: { id: string; name: string };
    data: Array<{
      rankingId: string;
      rankingName: string;
      season: string | null;
      competitionId: string | null;
      competition: CompetitionTierPayload | null;
      position: number | null;
      points: number | null;
      baseMatches: number | null;
      baseTitles: number | null;
      publishedAt: Date | null;
    }>;
  }> {
    const exists = await rankingsRepository.clubExists(clubId);
    if (!exists) throw new NotFoundError('Clube', clubId);
    const entries = await rankingsRepository.findClubHistory(clubId, year);
    const compIds = [
      ...new Set(entries.map((e) => e.ranking.competitionId).filter(Boolean)),
    ] as string[];
    const byId = new Map(
      (await rankingsRepository.findCompetitionsByIds(compIds)).map((c) => [c.id, c]),
    );
    return {
      club: entries[0]
        ? { id: entries[0].club.id, name: entries[0].club.name }
        : { id: clubId, name: '' },
      data: entries.map((e) => {
        const comp = e.ranking.competitionId ? byId.get(e.ranking.competitionId) : undefined;
        return {
          rankingId: e.ranking.id,
          rankingName: e.ranking.name,
          season: e.ranking.season,
          competitionId: e.ranking.competitionId,
          competition: comp ? toCompetitionTier(comp) : null,
          position: e.position,
          points: e.points,
          baseMatches: e.baseMatches,
          baseTitles: e.baseTitles,
          publishedAt: e.ranking.publishedAt,
        };
      }),
    };
  },
};
