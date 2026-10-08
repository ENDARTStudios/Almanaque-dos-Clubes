import { CreateCompetitionSchema, NotFoundError, type Competition } from '@almanaque/domain';
import { competitionsRepository, type ListCompetitionsParams } from './repository.js';
import { cache } from '../../services/cache.js';
import { prisma } from '../../config/prisma.js';
import { buildCompetitionOverview, type CompetitionOverview } from './overview.js';

const COMPETITIONS_TTL_SECONDS = 5 * 60; // 5min

function cacheKeyCompetition(id: string): string {
  return `competitions:id:${id}`;
}

function listCacheKey(params: ListCompetitionsParams): string {
  return `competitions:list:${JSON.stringify(params)}`;
}

export const competitionsService = {
  async create(input: unknown): Promise<Competition> {
    const parsed = CreateCompetitionSchema.parse(input);
    const competition = await competitionsRepository.create({
      name: parsed.name,
      country: parsed.country ?? null,
      type: parsed.type ?? null,
      qid: parsed.qid ?? null,
      importedFrom: parsed.importedFrom ?? null,
      importedAt: null,
    });
    await cache.invalidate('competitions:list:*');
    return competition;
  },

  async list(
    params: ListCompetitionsParams,
  ): Promise<{ data: Competition[]; total: number; limit: number; offset: number }> {
    return cache.remember(listCacheKey(params), COMPETITIONS_TTL_SECONDS, async () => {
      const [data, total] = await Promise.all([
        competitionsRepository.findMany(params),
        competitionsRepository.count(params),
      ]);
      return { data, total, limit: params.limit ?? 50, offset: params.offset ?? 0 };
    });
  },

  async getById(id: string): Promise<Competition> {
    return cache.remember(cacheKeyCompetition(id), COMPETITIONS_TTL_SECONDS, async () => {
      const competition = await competitionsRepository.findById(id);
      if (!competition) throw new NotFoundError('Competição', id);
      return competition;
    });
  },

  /**
   * Mapeamento do portal (Entrega 2) — edições/maiores campeões/participantes
   * derivados das arestas WON do grafo (soft-delete respeitado via metadata).
   * Aditivo ao getById — nenhum contrato existente muda.
   */
  async getOverview(id: string): Promise<CompetitionOverview> {
    await this.getById(id); // 404 honesto se a competição não existe
    return cache.remember(`competitions:overview:${id}`, COMPETITIONS_TTL_SECONDS, async () => {
      const edges = await prisma.knowledgeGraph.findMany({
        where: { relation: 'WON', targetType: 'Competition', targetId: id },
        select: { sourceId: true, metadata: true },
      });
      const clubIds = [...new Set(edges.map((e) => e.sourceId))];
      const clubs = await prisma.club.findMany({
        where: { id: { in: clubIds }, deletedAt: null },
        select: { id: true, name: true, city: true, country: true },
      });
      return buildCompetitionOverview(
        edges.map((e) => ({ sourceId: e.sourceId, metadata: e.metadata })),
        clubs,
      );
    });
  },

  async update(id: string, input: unknown): Promise<Competition> {
    const existing = await competitionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Competição', id);
    const parsed = CreateCompetitionSchema.partial().parse(input);
    const updated = await competitionsRepository.update(id, {
      name: parsed.name ?? existing.name,
      country: parsed.country ?? existing.country,
      type: parsed.type ?? existing.type,
    });
    await cache.invalidate(cacheKeyCompetition(id));
    await cache.invalidate('competitions:list:*');
    return updated;
  },

  async remove(id: string): Promise<void> {
    const existing = await competitionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Competição', id);
    await competitionsRepository.remove(id);
    await cache.invalidate(cacheKeyCompetition(id));
    await cache.invalidate('competitions:list:*');
  },
};
