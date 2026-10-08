import { CreatePlayerSchema, NotFoundError, type Player } from '@almanaque/domain';
import { playersRepository, type ListPlayersParams } from './repository.js';
import { prisma } from '../../config/prisma.js';

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

  /**
   * Mapeamento do portal (Entrega 3) — carreira/conquistas/clubes derivados
   * das arestas do grafo (PLAYED_FOR → clubes/carreira; WON com source=player
   * → conquistas). Aditivo ao getById — nenhum contrato existente muda.
   * Honestidade: sem arestas ⇒ arrays vazios ("Em catalogação" na UI).
   */
  async getProfileExtras(id: string): Promise<{
    currentClub: { id: string; name: string } | null;
    career: Array<{ year: number | null; clubId: string; clubName: string }>;
    achievements: Array<{ competitionId: string; competitionName: string; year: number | null }>;
    clubs: Array<{ id: string; name: string; country: string | null }>;
  }> {
    await this.getById(id); // 404 honesto se o jogador não existe
    const edges = await prisma.knowledgeGraph.findMany({
      where: { sourceId: id, sourceType: 'Player', relation: { in: ['PLAYED_FOR', 'WON'] } },
      select: { relation: true, targetId: true, targetType: true, metadata: true },
    });

    const playedFor = edges.filter((e) => e.relation === 'PLAYED_FOR');
    const clubIds = [...new Set(playedFor.map((e) => e.targetId))];
    const clubs = clubIds.length
      ? await prisma.club.findMany({
          where: { id: { in: clubIds }, deletedAt: null },
          select: { id: true, name: true, country: true },
        })
      : [];
    const clubById = new Map(clubs.map((c) => [c.id, c]));

    // Carreira: só arestas com ano no metadata; sem ano não há ordem real —
    // o clube entra na lista de clubes, não na tabela de carreira.
    type CareerRow = { year: number; clubId: string; clubName: string };
    const career: CareerRow[] = [];
    const latestByClub = new Map<string, number>();
    for (const e of playedFor) {
      const club = clubById.get(e.targetId);
      if (!club) continue;
      const meta = (e.metadata as Record<string, unknown> | null) ?? {};
      const year = typeof meta.year === 'number' ? meta.year : null;
      if (year != null) career.push({ year, clubId: e.targetId, clubName: club.name });
      const prev = latestByClub.get(e.targetId);
      if (year != null && (prev == null || year > prev)) latestByClub.set(e.targetId, year);
    }
    career.sort((a, b) => b.year - a.year);

    // Clube atual: o do ano mais recente na carreira; se nenhuma aresta tem ano
    // e só existe um clube, esse é o atual (honesto). Caso contrário, null.
    let currentClub: { id: string; name: string } | null = null;
    if (career.length > 0) {
      const latest = career[0];
      currentClub = { id: latest.clubId, name: latest.clubName };
    } else if (clubs.length === 1) {
      currentClub = { id: clubs[0].id, name: clubs[0].name };
    }

    // Conquistas: WON com source=player → target Competition.
    const wonEdges = edges.filter((e) => e.relation === 'WON' && e.targetType === 'Competition');
    const compIds = [...new Set(wonEdges.map((e) => e.targetId))];
    const comps = compIds.length
      ? await prisma.competition.findMany({
          where: { id: { in: compIds }, deletedAt: null },
          select: { id: true, name: true },
        })
      : [];
    const compById = new Map(comps.map((c) => [c.id, c]));
    const achievements = wonEdges
      .map((e) => {
        const comp = compById.get(e.targetId);
        if (!comp) return null;
        const meta = (e.metadata as Record<string, unknown> | null) ?? {};
        const year = typeof meta.year === 'number' ? meta.year : null;
        return { competitionId: comp.id, competitionName: comp.name, year };
      })
      .filter((a): a is NonNullable<typeof a> => !!a)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

    return {
      currentClub,
      career,
      achievements,
      clubs: clubs.map((c) => ({ id: c.id, name: c.name, country: c.country })),
    };
  },
};
